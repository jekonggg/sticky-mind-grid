from app import db
from app.models.task import Task
from app.models.board import Board
from app.models.activity import Activity
from app.models.user import User
from app.models.notification import Notification
from app.utils.event_broadcaster import broadcaster
from datetime import datetime

def _get_column_name(board, column_id):
    if not board or not board.columns:
        return column_id
    for col in board.columns:
        if isinstance(col, dict) and col.get('id') == column_id:
            return col.get('title', column_id)
    return column_id

class TaskConflictError(Exception):
    def __init__(self, task, message="Conflict: Description was modified by another user"):
        super().__init__(message)
        self.task = task
        self.message = message

class TaskService:
    @staticmethod
    def get_tasks(board_id):
        if not board_id:
            return []
        return Task.query.filter_by(board_id=board_id, is_deleted=False).order_by(Task.position.asc(), Task.created_at.asc()).all()

    @staticmethod
    def get_user_tasks(user_id, assigned_to_me=False):
        from app.models.board_member import BoardMember
        board_ids_query = db.session.query(BoardMember.board_id).filter(
            BoardMember.user_id == user_id,
            BoardMember.status == 'accepted'
        )
        query = Task.query.filter(
            Task.board_id.in_(board_ids_query),
            Task.is_deleted == False
        )
        if assigned_to_me:
            query = query.filter(Task.assigned_to == user_id)
        return query.order_by(Task.due_date.asc(), Task.created_at.desc()).all()

    @staticmethod
    def get_deleted_tasks(board_id):
        if not board_id:
            return []
        from datetime import timedelta
        from app.services.file_service import FileService
        # 30-day auto-purge for soft-deleted tasks
        cutoff = datetime.utcnow() - timedelta(days=30)
        expired_tasks = Task.query.filter(
            Task.board_id == board_id,
            Task.is_deleted == True,
            Task.deleted_at < cutoff
        ).all()
        if expired_tasks:
            for t in expired_tasks:
                FileService.cleanup_task_attachments(t)
                db.session.delete(t)
            db.session.commit()
        return Task.query.filter_by(board_id=board_id, is_deleted=True).order_by(Task.deleted_at.desc()).all()

    @staticmethod
    def get_task_by_id(task_id):
        return db.session.get(Task, task_id)

    @staticmethod
    def _notify_card_followers_on_move(task, old_col_name, new_col_name, actor_id):
        if not task or not task.board_id:
            return
        from app.services.notification_service import NotificationService
        actor = db.session.get(User, actor_id) if actor_id else None
        actor_name = (actor.full_name or actor.email) if actor else "A team member"

        follower_ids = set()
        if isinstance(task.followers, list):
            for fid in task.followers:
                if fid:
                    follower_ids.add(str(fid))
        if task.assigned_to:
            follower_ids.add(str(task.assigned_to))
        if task.created_by:
            follower_ids.add(str(task.created_by))

        for target_uid in follower_ids:
            if actor_id and str(target_uid) == str(actor_id):
                continue
            NotificationService.create_notification(
                user_id=target_uid,
                type='task_move',
                title='Card Moved',
                message=f'{actor_name} moved "{task.title}" from {old_col_name} to {new_col_name}',
                link=f'/boards/{task.board_id}',
                board_id=task.board_id
            )

    @staticmethod
    def create_task(data, user_id=None):
        creator_id = user_id or data.get('createdBy')
        board_id = data.get('boardId')
        status = data.get('status', 'todo')
        attachments = data.get('attachments', [])

        if attachments:
            from app.services.file_service import FileService
            quota_ok, quota_err = FileService.check_board_and_owner_quota(
                board_id, candidate_attachments=attachments
            )
            if not quota_ok:
                raise ValueError(quota_err)

        # Auto-compute position: place at the bottom of the target status column
        if 'position' in data and data['position'] is not None:
            position = float(data['position'])
        else:
            last_task = Task.query.filter_by(board_id=board_id, status=status, is_deleted=False).order_by(Task.position.desc()).first()
            position = (last_task.position + 1000.0) if (last_task and last_task.position is not None) else 1000.0

        assigned_to = data.get('assignedTo')
        if assigned_to == 'unassigned':
            assigned_to = None

        initial_followers = []
        if isinstance(data.get('followers'), list):
            from app.utils.decorators import get_effective_role
            for fid in data['followers']:
                if fid and get_effective_role(board_id, str(fid)) > 0 and str(fid) not in initial_followers:
                    initial_followers.append(str(fid))
        else:
            if creator_id:
                initial_followers.append(str(creator_id))
            if assigned_to and str(assigned_to) not in initial_followers:
                initial_followers.append(str(assigned_to))

        new_task = Task(
            board_id=board_id,
            title=data.get('title'),
            emoji=data.get('emoji'),
            description=data.get('description'),
            status=status,
            priority=data.get('priority', 'medium'),
            progress=data.get('progress', 0),
            position=position,
            checklist=data.get('checklist', []),
            tags=data.get('tags', []),
            attachments=attachments,
            followers=initial_followers,
            assigned_to=assigned_to,
            created_by=creator_id
        )
        if data.get('dueDate'):
            try:
                new_task.due_date = datetime.fromisoformat(data['dueDate'].replace('Z', '+00:00'))
            except (ValueError, TypeError):
                pass 

        db.session.add(new_task)
        db.session.flush()
        
        # Automated backend audit log for task creation
        activity = Activity(
            type='create',
            target_type='task',
            target_id=new_task.id,
            task_title=new_task.title,
            after_value=new_task.title,
            message=f'Created task "{new_task.title}"',
            board_id=new_task.board_id,
            user_id=creator_id
        )
        db.session.add(activity)

        # Dispatch notification if assigned to another user
        if new_task.assigned_to and str(new_task.assigned_to) != str(creator_id):
            creator = db.session.get(User, creator_id) if creator_id else None
            creator_name = (creator.full_name or creator.email) if creator else "A team member"
            from app.services.notification_service import NotificationService
            NotificationService.create_notification(
                user_id=new_task.assigned_to,
                type='assignment',
                title='Task Assigned',
                message=f'{creator_name} assigned "{new_task.title}" to you',
                link=f'/boards/{new_task.board_id}',
                board_id=new_task.board_id
            )

        # Update board timestamp
        if new_task.board:
            new_task.board.touch()

        db.session.flush()
        task_dict = new_task.to_dict()
        activity_dict = activity.to_dict() if activity else None
        db.session.commit()

        # Real-time event broadcast
        broadcaster.broadcast(new_task.board_id, "task:created", {
            **task_dict,
            "actorId": str(creator_id) if creator_id else None
        })
        if activity_dict:
            broadcaster.broadcast(new_task.board_id, "activity:new", activity_dict)

        return new_task

    @staticmethod
    def toggle_follow_task(task_id, user_id, follow=None):
        task = db.session.get(Task, task_id)
        if not task:
            return None
        current_followers = [str(f) for f in (task.followers or []) if f]
        uid_str = str(user_id)
        should_follow = (uid_str not in current_followers) if follow is None else bool(follow)
        if should_follow and uid_str not in current_followers:
            current_followers.append(uid_str)
        elif not should_follow and uid_str in current_followers:
            current_followers = [f for f in current_followers if f != uid_str]
        task.followers = current_followers
        db.session.commit()
        broadcaster.broadcast(task.board_id, "task:updated", task.to_dict())
        return task

    @staticmethod
    def update_task(task_id, data, user_id=None):
        task = db.session.get(Task, task_id)
        if not task:
            return None

        # Track previous values for granular audit logging
        old_board_id = task.board_id
        old_status = task.status
        old_assigned_to = task.assigned_to
        old_title = task.title
        old_description = task.description

        # Check for concurrent description conflict
        if 'description' in data and 'baseDescription' in data and not data.get('forceOverwrite'):
            if (old_description or "") != (data.get('baseDescription') or "") and (data.get('description') or "") != (old_description or ""):
                raise TaskConflictError(task)

        if 'attachments' in data:
            from app.services.file_service import FileService
            from app.utils.decorators import get_effective_role, ROLE_HIERARCHY

            new_attachments = data.get('attachments') or []
            if not isinstance(new_attachments, list):
                new_attachments = []

            old_attachments = task.attachments or []
            if isinstance(old_attachments, list) and old_attachments:
                new_ids = {a.get('id') for a in new_attachments if isinstance(a, dict) and a.get('id')}
                new_urls = {a.get('url') for a in new_attachments if isinstance(a, dict) and a.get('url')}

                removed_atts = []
                for old_att in old_attachments:
                    if not isinstance(old_att, dict):
                        continue
                    att_id = old_att.get('id')
                    att_url = old_att.get('url')
                    if att_id and att_id not in new_ids:
                        removed_atts.append(old_att)
                    elif not att_id and att_url and att_url not in new_urls:
                        removed_atts.append(old_att)

                if removed_atts:
                    effective_role = get_effective_role(task.board_id, user_id) if user_id else 0
                    is_admin_or_owner = effective_role >= ROLE_HIERARCHY['admin']
                    for r_att in removed_atts:
                        uploader_id = r_att.get('uploaderId')
                        is_author = str(uploader_id) == str(user_id) if (uploader_id and user_id) else False
                        if not is_author and not is_admin_or_owner:
                            raise PermissionError("Only the attachment author or a board admin/owner may delete an attachment")
                        FileService.delete_attachment_file(r_att, exclude_task_id=task.id)

            target_board = data.get('boardId') or task.board_id
            quota_ok, quota_err = FileService.check_board_and_owner_quota(
                target_board,
                candidate_attachments=data['attachments'],
                exclude_task_id=task.id
            )
            if not quota_ok:
                raise ValueError(quota_err)

        if 'boardId' in data: task.board_id = data['boardId']
        if 'title' in data: task.title = data['title']
        if 'emoji' in data: task.emoji = data['emoji']
        if 'description' in data: task.description = data['description']
        status_val = data.get('status') if 'status' in data else data.get('columnId')
        if status_val is not None: task.status = status_val
        if 'priority' in data: task.priority = data['priority']
        if 'progress' in data: task.progress = data['progress']
        if 'position' in data and data['position'] is not None: task.position = float(data['position'])
        if 'checklist' in data: task.checklist = data['checklist']
        if 'tags' in data: task.tags = data['tags']
        if 'attachments' in data: task.attachments = data['attachments']
        if 'assignedTo' in data: task.assigned_to = data['assignedTo'] if data['assignedTo'] != "unassigned" else None
        if 'followers' in data and isinstance(data['followers'], list):
            from app.utils.decorators import get_effective_role
            valid_followers = []
            for fid in data['followers']:
                if fid and get_effective_role(task.board_id, str(fid)) > 0 and str(fid) not in valid_followers:
                    valid_followers.append(str(fid))
            task.followers = valid_followers
        elif task.assigned_to and old_assigned_to != task.assigned_to:
            cur_followers = [str(f) for f in (task.followers or []) if f]
            if str(task.assigned_to) not in cur_followers:
                cur_followers.append(str(task.assigned_to))
                task.followers = cur_followers

        if 'dueDate' in data:
            if data['dueDate']:
                try:
                    task.due_date = datetime.fromisoformat(data['dueDate'].replace('Z', '+00:00'))
                except (ValueError, TypeError):
                    pass
            else:
                task.due_date = None

        effective_old_status = data.get('fromStatus') or old_status
        is_board_changed = str(old_board_id) != str(task.board_id)
        is_status_changed = (old_status != task.status) or bool(data.get('fromStatus') and data['fromStatus'] != task.status)
        is_assigned_changed = old_assigned_to != task.assigned_to
        is_title_changed = old_title != task.title
        is_description_changed = (old_description or "") != (task.description or "")

        # Generate automated audit log based on what changed
        activity = None
        source_board_activity = None

        if is_board_changed:
            # Cross-board move tenancy rule: target members only see "moved from another board"
            activity = Activity(
                type='move',
                target_type='task',
                target_id=task.id,
                task_title=task.title,
                before_value='Another board',
                after_value=str(task.board_id),
                message=f'Card "{task.title}" moved from another board',
                board_id=task.board_id,
                user_id=user_id
            )
            db.session.add(activity)

            source_board_activity = Activity(
                type='move',
                target_type='task',
                target_id=task.id,
                task_title=task.title,
                before_value=str(old_board_id),
                after_value='Another board',
                message=f'Card "{task.title}" moved to another board',
                board_id=old_board_id,
                user_id=user_id
            )
            db.session.add(source_board_activity)
        elif is_status_changed:
            old_col_name = _get_column_name(task.board, effective_old_status)
            new_col_name = _get_column_name(task.board, task.status)
            activity = Activity(
                type='move',
                target_type='task',
                target_id=task.id,
                task_title=task.title,
                before_value=old_col_name,
                after_value=new_col_name,
                message=f'Moved "{task.title}" from {old_col_name} to {new_col_name}',
                board_id=task.board_id,
                user_id=user_id
            )
            db.session.add(activity)
            TaskService._notify_card_followers_on_move(task, old_col_name, new_col_name, user_id)
        elif is_assigned_changed:
            old_assignee = db.session.get(User, old_assigned_to) if old_assigned_to else None
            old_assignee_name = (old_assignee.full_name or old_assignee.email) if old_assignee else "Unassigned"
            if task.assigned_to:
                assignee = db.session.get(User, task.assigned_to)
                assignee_name = (assignee.full_name or assignee.email) if assignee else "user"
                msg = f'Assigned task "{task.title}" to {assignee_name}'
                new_assignee_name = assignee_name
                
                # Notify assignee if not the actor
                if user_id and str(user_id) != str(task.assigned_to):
                    actor = db.session.get(User, user_id)
                    actor_name = (actor.full_name or actor.email) if actor else "A team member"
                    from app.services.notification_service import NotificationService
                    NotificationService.create_notification(
                        user_id=task.assigned_to,
                        type='assignment',
                        title='Task Assigned',
                        message=f'{actor_name} assigned "{task.title}" to you',
                        link=f'/boards/{task.board_id}',
                        board_id=task.board_id
                    )
            else:
                msg = f'Unassigned task "{task.title}"'
                new_assignee_name = "Unassigned"
            activity = Activity(
                type='update',
                target_type='task',
                target_id=task.id,
                task_title=task.title,
                before_value=old_assignee_name,
                after_value=new_assignee_name,
                message=msg,
                board_id=task.board_id,
                user_id=user_id
            )
            db.session.add(activity)
        elif is_title_changed:
            activity = Activity(
                type='update',
                target_type='task',
                target_id=task.id,
                task_title=task.title,
                before_value=old_title,
                after_value=task.title,
                message=f'Updated task "{task.title}"',
                board_id=task.board_id,
                user_id=user_id
            )
            db.session.add(activity)
        elif is_description_changed:
            activity = Activity(
                type='update',
                target_type='task',
                target_id=task.id,
                task_title=task.title,
                before_value=old_description or '',
                after_value=task.description or '',
                message=f'Updated description for "{task.title}"',
                board_id=task.board_id,
                user_id=user_id
            )
            db.session.add(activity)

        # Update board timestamp
        if task.board:
            task.board.touch()

        db.session.flush()
        task_dict = task.to_dict()
        activity_dict = activity.to_dict() if activity else None
        source_act_dict = source_board_activity.to_dict() if source_board_activity else None
        db.session.commit()

        # Real-time event broadcast
        if is_board_changed:
            broadcaster.broadcast(old_board_id, "task:deleted", {"taskId": task.id})
            if source_act_dict:
                broadcaster.broadcast(old_board_id, "activity:new", source_act_dict)
            broadcaster.broadcast(task.board_id, "task:created", {
                **task_dict,
                "actorId": str(user_id) if user_id else None
            })
            if activity_dict:
                broadcaster.broadcast(task.board_id, "activity:new", activity_dict)
        else:
            event_name = "task:moved" if is_status_changed else "task:updated"
            broadcaster.broadcast(task.board_id, event_name, {
                **task_dict,
                "actorId": str(user_id) if user_id else None,
                "previousStatus": effective_old_status
            })
            if activity_dict:
                broadcaster.broadcast(task.board_id, "activity:new", activity_dict)

        return task

    @staticmethod
    def reorder_tasks(board_id, items, user_id=None):
        """Batch update positions and statuses of multiple tasks."""
        if not board_id or not items:
            return []

        board = db.session.get(Board, board_id)
        updated_tasks = []
        new_activities = []
        for item in items:
            t_id = item.get('id')
            if not t_id:
                continue
            task = Task.query.filter_by(id=t_id, board_id=board_id).first()
            if task:
                old_status = task.status
                from_status = item.get('fromStatus')
                if 'status' in item and item['status']:
                    effective_old_status = from_status if from_status else old_status
                    if old_status != item['status'] or (from_status and from_status != item['status']):
                        task.status = item['status']
                        old_col_name = _get_column_name(board, effective_old_status)
                        new_col_name = _get_column_name(board, task.status)
                        act = Activity(
                            type='move',
                            target_type='task',
                            target_id=task.id,
                            task_title=task.title,
                            before_value=old_col_name,
                            after_value=new_col_name,
                            message=f'Moved "{task.title}" from {old_col_name} to {new_col_name}',
                            board_id=board_id,
                            user_id=user_id
                        )
                        db.session.add(act)
                        new_activities.append(act)
                        TaskService._notify_card_followers_on_move(task, old_col_name, new_col_name, user_id)
                    else:
                        task.status = item['status']
                if 'position' in item and item['position'] is not None:
                    try:
                        task.position = float(item['position'])
                    except (ValueError, TypeError):
                        pass
                updated_tasks.append(task)

        if updated_tasks:
            try:
                if board:
                    board.touch()
                db.session.flush()
                serialized_activities = [a.to_dict() for a in new_activities]
                serialized_tasks = [t.to_dict() for t in updated_tasks]
                db.session.commit()

                # Broadcast batch reorder event
                broadcaster.broadcast(board_id, "tasks:reordered", {
                    "tasks": serialized_tasks,
                    "actorId": str(user_id) if user_id else None
                })
                for act_dict in serialized_activities:
                    broadcaster.broadcast(board_id, "activity:new", act_dict)
            except Exception as e:
                db.session.rollback()
                raise e

        return updated_tasks

    @staticmethod
    def delete_task(task_id, user_id=None):
        """Soft delete task to trash bin."""
        task = db.session.get(Task, task_id)
        if not task:
            return False
        
        board = task.board
        board_id = task.board_id
        task_title = task.title
        old_col_name = _get_column_name(board, task.status)

        task.is_deleted = True
        task.deleted_at = datetime.utcnow()

        # Record audit log
        activity = Activity(
            type='delete',
            target_type='task',
            target_id=task.id,
            task_title=task_title,
            before_value=old_col_name,
            after_value='Trash',
            message=f'Moved task "{task_title}" to Trash',
            board_id=board_id,
            user_id=user_id
        )
        db.session.add(activity)

        if board:
            board.touch()
            
        db.session.commit()

        # Broadcast deletion
        broadcaster.broadcast(board_id, "task:deleted", {"taskId": task_id})
        broadcaster.broadcast(board_id, "activity:new", activity.to_dict())

        return True

    @staticmethod
    def restore_task(task_id, user_id=None):
        """Restore soft-deleted task back to board."""
        task = db.session.get(Task, task_id)
        if not task or not task.is_deleted:
            return None, "Task not found in trash"

        task.is_deleted = False
        task.deleted_at = None
        col_name = _get_column_name(task.board, task.status)

        activity = Activity(
            type='create',
            target_type='task',
            target_id=task.id,
            task_title=task.title,
            before_value='Trash',
            after_value=col_name,
            message=f'Restored task "{task.title}" from Trash',
            board_id=task.board_id,
            user_id=user_id
        )
        db.session.add(activity)

        if task.board:
            task.board.touch()

        db.session.commit()

        broadcaster.broadcast(task.board_id, "task:created", task.to_dict())
        broadcaster.broadcast(task.board_id, "activity:new", activity.to_dict())

        return task, None

    @staticmethod
    def permanent_delete_task(task_id, user_id=None):
        """Hard delete task permanently from database and clean up its physical attachments."""
        task = db.session.get(Task, task_id)
        if not task:
            return False, "Task not found"

        board_id = task.board_id
        task_title = task.title

        from app.services.file_service import FileService
        FileService.cleanup_task_attachments(task)

        activity = Activity(
            type='delete',
            target_type='task',
            target_id=task.id,
            task_title=task_title,
            before_value=task_title,
            after_value='Deleted permanently',
            message=f'Permanently deleted task "{task_title}"',
            board_id=board_id,
            user_id=user_id
        )
        db.session.add(activity)

        db.session.delete(task)
        db.session.commit()

        broadcaster.broadcast(board_id, "task:deleted", {"taskId": task_id, "permanent": True})
        broadcaster.broadcast(board_id, "activity:new", activity.to_dict())

        return True, None

    @staticmethod
    def empty_trash(board_id, user_id=None):
        """Permanently delete all soft-deleted tasks for a board and clean up their attachments."""
        deleted_tasks = Task.query.filter_by(board_id=board_id, is_deleted=True).all()
        count = len(deleted_tasks)
        if count == 0:
            return 0

        from app.services.file_service import FileService
        for t in deleted_tasks:
            FileService.cleanup_task_attachments(t)
            db.session.delete(t)

        activity = Activity(
            type='delete',
            target_type='board',
            target_id=str(board_id),
            task_title='Trash Bin',
            before_value=f'{count} tasks',
            after_value='0 tasks',
            message=f'Emptied Trash Bin ({count} tasks permanently deleted)',
            board_id=board_id,
            user_id=user_id
        )
        db.session.add(activity)

        db.session.commit()

        broadcaster.broadcast(board_id, "trash:emptied", {"count": count})
        broadcaster.broadcast(board_id, "activity:new", activity.to_dict())

        return count
