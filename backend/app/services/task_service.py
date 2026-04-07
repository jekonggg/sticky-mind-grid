from app import db
from app.models.task import Task
from datetime import datetime

class TaskService:
    @staticmethod
    def get_tasks(board_id=None):
        query = Task.query
        if board_id:
            query = query.filter_by(board_id=board_id)
        return query.all()

    @staticmethod
    def get_task_by_id(task_id):
        return Task.query.get(task_id)

    @staticmethod
    def create_task(data):
        new_task = Task(
            board_id=data.get('boardId'),
            title=data.get('title'),
            emoji=data.get('emoji'),
            description=data.get('description'),
            status=data.get('status', 'todo'),
            priority=data.get('priority', 'medium'),
            progress=data.get('progress', 0),
            attachments=data.get('attachments', []),
            assigned_to=data.get('assignedTo')
        )
        if data.get('dueDate'):
            try:
                new_task.due_date = datetime.fromisoformat(data['dueDate'].replace('Z', '+00:00'))
            except ValueError:
                pass 

        db.session.add(new_task)
        
        # Update board timestamp
        if new_task.board:
            new_task.board.touch()

        db.session.commit()
        return new_task

    @staticmethod
    def update_task(task_id, data):
        task = Task.query.get(task_id)
        if not task:
            return None

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
                except ValueError:
                    pass
            else:
                task.due_date = None

        # Update board timestamp
        if task.board:
            task.board.touch()

        db.session.commit()
        return task

    @staticmethod
    def delete_task(task_id):
        task = Task.query.get(task_id)
        if not task:
            return False
        
        board = task.board
        db.session.delete(task)
        
        # Update board timestamp
        if board:
            board.touch()
            
        db.session.commit()
        return True
