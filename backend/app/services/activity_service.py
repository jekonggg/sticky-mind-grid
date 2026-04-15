from app import db
from app.models.activity import Activity

class ActivityService:
    @staticmethod
    def get_activities(board_id=None, limit=50):
        query = Activity.query
        if board_id:
            query = query.filter_by(board_id=board_id)
        
        return query.order_by(Activity.timestamp.desc()).limit(limit).all()

    @staticmethod
    def add_activity(data):
        new_activity = Activity(
            board_id=data.get('boardId'),
            type=data.get('type'),
            task_title=data.get('taskTitle'),
            message=data.get('message'),
            user_id=data.get('userId')
        )
        db.session.add(new_activity)
        db.session.commit()
        return new_activity

    @staticmethod
    def clear_activities(board_id=None):
        query = Activity.query
        if board_id:
            query = query.filter_by(board_id=board_id)
        
        query.delete()
        db.session.commit()
        return True
