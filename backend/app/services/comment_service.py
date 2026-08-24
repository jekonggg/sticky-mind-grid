import re
from app import db
from app.models.comment import Comment
from app.models.task import Task
from app.models.user import User
from app.models.notification import Notification
from app.models.activity import Activity
from app.models.board_member import BoardMember
from app.utils.event_broadcaster import broadcaster

class CommentService:
    @staticmethod
    def get_task_comments(task_id):
        return Comment.query.filter_by(task_id=task_id).order_by(Comment.created_at.asc()).all()

    @staticmethod
    def create_comment(task_id, user_id, content):
        task = Task.query.get(task_id)
        if not task:
            return None, "Task not found"

        author = User.query.get(user_id)
        author_name = author.full_name or author.email if author else "User"

        # Detect mentions: regex matches @word or @email
        board_members = BoardMember.query.filter_by(board_id=task.board_id).all()
        mentioned_user_ids = []

        for member in board_members:
            if not member.user or member.user_id == user_id:
                continue
            
            user_handle = member.user.full_name or ""
            user_email = member.user.email or ""
            
            # Check if mentioned by @Full Name or @Email or @firstname
            pattern = re.compile(rf'@{re.escape(user_email)}|@{re.escape(user_handle)}|@{re.escape(user_handle.split()[0])}', re.IGNORECASE) if user_handle else re.compile(rf'@{re.escape(user_email)}', re.IGNORECASE)
            
            if pattern.search(content):
                mentioned_user_ids.append(member.user_id)
                # Create Notification for mentioned user
                notif = Notification(
                    user_id=member.user_id,
                    type='mention',
                    title='New Mention',
                    message=f'{author_name} mentioned you on "{task.title}": "{content[:60]}..."',
                    link=f'/boards/{task.board_id}'
                )
                db.session.add(notif)

        # Notify assignee if someone else comments on their task
        if task.assigned_to and task.assigned_to != user_id and task.assigned_to not in mentioned_user_ids:
            notif = Notification(
                user_id=task.assigned_to,
                type='task_comment',
                title='New Comment on Your Task',
                message=f'{author_name} commented on "{task.title}": "{content[:60]}..."',
                link=f'/boards/{task.board_id}'
            )
            db.session.add(notif)

        # Create Comment
        new_comment = Comment(
            task_id=task_id,
            user_id=user_id,
            content=content,
            mentions=list(set(mentioned_user_ids))
        )
        db.session.add(new_comment)

        # Automated audit log
        activity = Activity(
            type='update',
            task_title=task.title,
            message=f'{author_name} commented on "{task.title}"',
            board_id=task.board_id,
            user_id=user_id
        )
        db.session.add(activity)

        # Update board touch
        if task.board:
            task.board.touch()

        db.session.commit()

        # Real-time SSE broadcasts
        broadcaster.broadcast(task.board_id, "comment:created", {
            "taskId": task_id,
            "comment": new_comment.to_dict()
        })
        broadcaster.broadcast(task.board_id, "activity:new", activity.to_dict())

        return new_comment, None

    @staticmethod
    def delete_comment(comment_id, user_id):
        comment = Comment.query.get(comment_id)
        if not comment:
            return False, "Comment not found"

        task = comment.task
        board_id = task.board_id if task else None

        # Check permissions: author, or board admin/owner
        is_author = comment.user_id == user_id
        is_admin_or_owner = False
        if board_id:
            membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
            is_admin_or_owner = bool(membership and membership.role in ['owner', 'admin'])

        if not is_author and not is_admin_or_owner:
            return False, "You do not have permission to delete this comment"

        task_id = comment.task_id
        db.session.delete(comment)
        db.session.commit()

        if board_id:
            broadcaster.broadcast(board_id, "comment:deleted", {
                "taskId": task_id,
                "commentId": comment_id
            })

        return True, None
