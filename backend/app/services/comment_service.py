import re
from app import db
from app.models.comment import Comment
from app.models.task import Task
from app.models.user import User
from app.models.notification import Notification
from app.models.activity import Activity
from app.models.board_member import BoardMember
from app.utils.event_broadcaster import broadcaster
from app.utils.decorators import get_effective_role, ROLE_HIERARCHY

class CommentService:
    @staticmethod
    def get_task_comments(task_id):
        return Comment.query.filter_by(task_id=task_id).order_by(Comment.created_at.asc()).all()

    @staticmethod
    def _find_mentioned_board_members(board_id, exclude_user_id, content):
        """Return list of user_ids of accepted board members @mentioned in content."""
        if not board_id or not content:
            return []
        board_members = BoardMember.query.filter_by(board_id=board_id, status='accepted').all()
        mentioned_user_ids = []
        seen_ids = set()

        for member in board_members:
            if not member.user or str(member.user_id) == str(exclude_user_id):
                continue
            uid = str(member.user_id)
            if uid in seen_ids:
                continue

            user_handle = (member.user.full_name or "").strip()
            user_email = (member.user.email or "").strip()
            candidates = [re.escape(user_email)] if user_email else []
            if user_handle:
                candidates.append(re.escape(user_handle))
                first_token = user_handle.split()[0]
                if first_token:
                    candidates.append(re.escape(first_token))
            if not candidates:
                continue

            pattern = re.compile(r'@(?:' + '|'.join(candidates) + r')(?=\s|$|[.,!?;:])', re.IGNORECASE)
            if pattern.search(content):
                seen_ids.add(uid)
                mentioned_user_ids.append(uid)

        return mentioned_user_ids

    @staticmethod
    def create_comment(task_id, user_id, content):
        task = db.session.get(Task, task_id)
        if not task:
            return None, "Task not found"

        author = db.session.get(User, user_id)
        author_name = author.full_name or author.email if author else "User"

        # Detect mentions strictly among accepted members of this board
        mentioned_user_ids = CommentService._find_mentioned_board_members(
            task.board_id, user_id, content
        )

        from app.services.notification_service import NotificationService
        for mentioned_uid in mentioned_user_ids:
            NotificationService.create_notification(
                user_id=mentioned_uid,
                type='mention',
                title='New Mention',
                message=f'{author_name} mentioned you on "{task.title}": "{content[:60]}..."',
                link=f'/boards/{task.board_id}',
                board_id=task.board_id
            )

        # Collect card followers (explicit followers + assignee + creator)
        follower_ids = set(str(fid) for fid in (task.followers or []) if fid)
        if task.assigned_to:
            follower_ids.add(str(task.assigned_to))
        if task.created_by:
            follower_ids.add(str(task.created_by))

        # Auto-follow the card for the comment author as well
        current_followers = list(task.followers or [])
        if str(user_id) not in [str(f) for f in current_followers]:
            current_followers.append(str(user_id))
            task.followers = current_followers

        # Notify followers (excluding the comment author and already-mentioned users)
        for follower_uid in follower_ids:
            if follower_uid == str(user_id) or follower_uid in mentioned_user_ids:
                continue
            is_assignee = task.assigned_to and str(task.assigned_to) == follower_uid
            NotificationService.create_notification(
                user_id=follower_uid,
                type='task_comment',
                title='New Comment on Your Task' if is_assignee else 'New Comment on Followed Card',
                message=f'{author_name} commented on "{task.title}": "{content[:60]}..."',
                link=f'/boards/{task.board_id}',
                board_id=task.board_id
            )

        # Create Comment
        new_comment = Comment(
            task_id=task_id,
            user_id=user_id,
            content=content,
            mentions=list(set(mentioned_user_ids))
        )
        db.session.add(new_comment)
        db.session.flush()

        # Automated audit log
        activity = Activity(
            type='update',
            task_title=task.title,
            target_type='comment',
            target_id=new_comment.id,
            before_value=None,
            after_value=content,
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
        comment = db.session.get(Comment, comment_id)
        if not comment:
            return False, "Comment not found"

        task = comment.task
        board_id = task.board_id if task else None

        # Check permissions: author, or board admin/owner
        is_author = str(comment.user_id) == str(user_id)
        is_admin_or_owner = False
        if board_id:
            is_admin_or_owner = get_effective_role(board_id, user_id) >= ROLE_HIERARCHY['admin']

        if not is_author and not is_admin_or_owner:
            return False, "You do not have permission to delete this comment"

        task_id = comment.task_id
        task_title = task.title if task else "Task"
        preserved_original = comment.original_content or comment.content
        actor = db.session.get(User, user_id)
        actor_name = (actor.full_name or actor.email) if actor else "User"

        activity = None
        if board_id:
            activity = Activity(
                type='delete',
                task_title=task_title,
                target_type='comment',
                target_id=comment.id,
                before_value=preserved_original,
                after_value=None,
                message=f'{actor_name} deleted a comment on "{task_title}"',
                board_id=board_id,
                user_id=user_id
            )
            db.session.add(activity)

        db.session.delete(comment)
        db.session.commit()

        if board_id:
            broadcaster.broadcast(board_id, "comment:deleted", {
                "taskId": task_id,
                "commentId": comment_id
            })
            if activity:
                broadcaster.broadcast(board_id, "activity:new", activity.to_dict())

        return True, None

    @staticmethod
    def update_comment(comment_id, user_id, new_content):
        comment = db.session.get(Comment, comment_id)
        if not comment:
            return None, "Comment not found"

        # Comments are editable only by their author
        if str(comment.user_id) != str(user_id):
            return None, "You can only edit your own comments"

        if not new_content or not new_content.strip():
            return None, "Comment content cannot be empty"

        from datetime import datetime
        task = comment.task
        board_id = task.board_id if task else None
        if board_id and get_effective_role(board_id, user_id) < ROLE_HIERARCHY['commenter']:
            return None, "You do not have permission to edit comments on this board"

        previous_content = comment.content
        cleaned_content = new_content.strip()

        # Store original content if not already stored
        if not comment.original_content:
            comment.original_content = previous_content

        # Re-evaluate @mentions among accepted board members
        old_mentions = set(str(m) for m in (comment.mentions or []))
        new_mentions = CommentService._find_mentioned_board_members(board_id, user_id, cleaned_content)
        comment.mentions = list(set(new_mentions))

        comment.content = cleaned_content
        comment.is_edited = True
        comment.updated_at = datetime.utcnow()

        author = db.session.get(User, user_id)
        author_name = (author.full_name or author.email) if author else "User"

        if board_id and task:
            from app.services.notification_service import NotificationService
            for mentioned_uid in new_mentions:
                if mentioned_uid not in old_mentions:
                    NotificationService.create_notification(
                        user_id=mentioned_uid,
                        type='mention',
                        title='New Mention',
                        message=f'{author_name} mentioned you on "{task.title}": "{cleaned_content[:60]}..."',
                        link=f'/boards/{board_id}',
                        board_id=board_id
                    )

        # Audit log keeping record of the comment edit with before/after content
        activity = None
        if board_id and task:
            activity = Activity(
                type='update',
                task_title=task.title,
                target_type='comment',
                target_id=comment.id,
                before_value=previous_content,
                after_value=cleaned_content,
                message=f'{author_name} edited a comment on "{task.title}"',
                board_id=board_id,
                user_id=user_id
            )
            db.session.add(activity)

        db.session.commit()

        if board_id:
            broadcaster.broadcast(board_id, "comment:updated", {
                "taskId": comment.task_id,
                "comment": comment.to_dict()
            })
            if activity:
                broadcaster.broadcast(board_id, "activity:new", activity.to_dict())

        return comment, None
