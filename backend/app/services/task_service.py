from app import db
from app.models.task import Task
from app.models.activity import Activity
from app.models.user import User
from app.utils.event_broadcaster import broadcaster
from datetime import datetime

class TaskService:
    @staticmethod
    def get_tasks(board_id):
        if not board_id:
            return []
        return Task.query.filter_by(board_id=board_id).order_by(Task.position.asc(), Task.created_at.asc()).all()

    @staticmethod
    def get_task_by_id(task_id):
        return Task.query.get(task_id)

    @staticmethod
    def create_task(data, user_id=None):
        creator_id = user_id or data.get('createdBy')
        board_id = data.get('boardId')
        status = data.get('status', 'todo')

        # Auto-compute position: place at the bottom of the target status column
        if 'position' in data and data['position'] is not None:
            position = float(data['position'])
        else:
            last_task = Task.query.filter_by(board_id=board_id, status=status).order_by(Task.position.desc()).first()
            position = (last_task.position + 1000.0) if (last_task and last_task.position is not None) else 1000.0

        new_task = Task(
            board_id=board_id,
            title=data.get('title'),
            emoji=data.get('emoji'),
            description=data.get('description'),
            status=status,
            priority=data.get('priority', 'medium'),
            progress=data.get('progress', 0),
            position=position,
            attachments=data.get('attachments', []),
            assigned_to=data.get('assignedTo'),
            created_by=creator_id
        )
        if data.get('dueDate'):
            try:
                new_task.due_date = datetime.fromisoformat(data['dueDate'].replace('Z', '+00:00'))
            except (ValueError, TypeError):
                pass 

        db.session.add(new_task)
        
        # Automated backend audit log for task creation
        activity = Activity(
            type='create',
            task_title=new_task.title,
            message=f'Created task "{new_task.title}"',
            board_id=new_task.board_id,
            user_id=creator_id
        )
        db.session.add(activity)

        # Update board timestamp
        if new_task.board:
            new_task.board.touch()

        db.session.commit()

        # Real-time event broadcast
        broadcaster.broadcast(new_task.board_id, "task:created", new_task.to_dict())
        broadcaster.broadcast(new_task.board_id, "activity:new", activity.to_dict())

        return new_task

    @staticmethod
    def update_task(task_id, data, user_id=None):
        task = Task.query.get(task_id)
        if not task:
            return None

        # Track previous values for granular audit logging
        old_status = task.status
        old_assigned_to = task.assigned_to
        old_title = task.title

        if 'boardId' in data: task.board_id = data['boardId']
        if 'title' in data: task.title = data['title']
        if 'emoji' in data: task.emoji = data['emoji']
        if 'description' in data: task.description = data['description']
        if 'status' in data: task.status = data['status']
        if 'priority' in data: task.priority = data['priority']
        if 'progress' in data: task.progress = data['progress']
        if 'position' in data and data['position'] is not None: task.position = float(data['position'])
        if 'attachments' in data: task.attachments = data['attachments']
        if 'assignedTo' in data: task.assigned_to = data['assignedTo']
        if 'dueDate' in data:
            if data['dueDate']:
                try:
                    task.due_date = datetime.fromisoformat(data['dueDate'].replace('Z', '+00:00'))
                except (ValueError, TypeError):
                    pass
            else:
                task.due_date = None

        # Generate automated audit log based on what changed
        is_status_changed = 'status' in data and task.status != old_status
        if is_status_changed:
            activity = Activity(
                type='move',
                task_title=task.title,
                message=f'Moved task "{task.title}" from {old_status} to {task.status}',
                board_id=task.board_id,
                user_id=user_id
            )
            db.session.add(activity)
        elif 'assignedTo' in data and task.assigned_to != old_assigned_to:
            if task.assigned_to:
                assignee = User.query.get(task.assigned_to)
                assignee_name = assignee.full_name or assignee.email if assignee else "user"
                msg = f'Assigned task "{task.title}" to {assignee_name}'
            else:
                msg = f'Unassigned task "{task.title}"'
            activity = Activity(
                type='update',
                task_title=task.title,
                message=msg,
                board_id=task.board_id,
                user_id=user_id
            )
            db.session.add(activity)
        else:
            activity = Activity(
                type='update',
                task_title=task.title,
                message=f'Updated task "{task.title}"',
                board_id=task.board_id,
                user_id=user_id
            )
            db.session.add(activity)

        # Update board timestamp
        if task.board:
            task.board.touch()

        db.session.commit()

        # Real-time event broadcast
        event_name = "task:moved" if is_status_changed else "task:updated"
        broadcaster.broadcast(task.board_id, event_name, task.to_dict())
        broadcaster.broadcast(task.board_id, "activity:new", activity.to_dict())

        return task

    @staticmethod
    def reorder_tasks(board_id, items, user_id=None):
        """Batch update positions and statuses of multiple tasks."""
        if not board_id or not items:
            return []

        updated_tasks = []
        for item in items:
            t_id = item.get('id')
            if not t_id:
                continue
            task = Task.query.filter_by(id=t_id, board_id=board_id).first()
            if task:
                if 'status' in item:
                    task.status = item['status']
                if 'position' in item and item['position'] is not None:
                    task.position = float(item['position'])
                updated_tasks.append(task)

        if updated_tasks:
            # Update board timestamp
            if updated_tasks[0].board:
                updated_tasks[0].board.touch()
            db.session.commit()

            # Broadcast batch reorder event
            broadcaster.broadcast(board_id, "tasks:reordered", {
                "tasks": [t.to_dict() for t in updated_tasks]
            })

        return updated_tasks

    @staticmethod
    def delete_task(task_id, user_id=None):
        task = Task.query.get(task_id)
        if not task:
            return False
        
        board = task.board
        board_id = task.board_id
        task_title = task.title

        # Record audit log before deleting
        activity = Activity(
            type='delete',
            task_title=task_title,
            message=f'Deleted task "{task_title}"',
            board_id=board_id,
            user_id=user_id
        )
        db.session.add(activity)

        db.session.delete(task)
        
        # Update board timestamp
        if board:
            board.touch()
            
        db.session.commit()

        # Broadcast deletion and activity event
        broadcaster.broadcast(board_id, "task:deleted", {"taskId": task_id})
        broadcaster.broadcast(board_id, "activity:new", activity.to_dict())

        return True
