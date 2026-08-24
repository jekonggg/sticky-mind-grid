from app import db
from app.models.task import Task
from app.models.activity import Activity
from app.models.user import User
from datetime import datetime

class TaskService:
    @staticmethod
    def get_tasks(board_id):
        if not board_id:
            return []
        return Task.query.filter_by(board_id=board_id).all()

    @staticmethod
    def get_task_by_id(task_id):
        return Task.query.get(task_id)

    @staticmethod
    def create_task(data, user_id=None):
        creator_id = user_id or data.get('createdBy')
        
        new_task = Task(
            board_id=data.get('boardId'),
            title=data.get('title'),
            emoji=data.get('emoji'),
            description=data.get('description'),
            status=data.get('status', 'todo'),
            priority=data.get('priority', 'medium'),
            progress=data.get('progress', 0),
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
        if 'status' in data and task.status != old_status:
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
        return task

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
        return True
