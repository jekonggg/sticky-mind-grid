from app import db
from app.models.activity import Activity

class ActivityService:
    @staticmethod
    def get_activities(board_id=None, limit=50, task_title=None):
        query = Activity.query
        if board_id:
            query = query.filter_by(board_id=board_id)
        if task_title:
            query = query.filter_by(task_title=task_title)
        
        return query.order_by(Activity.timestamp.desc()).limit(limit).all()

    @staticmethod
    def get_user_activities(user_id, limit=50):
        from app.models.board_member import BoardMember
        board_ids_query = db.session.query(BoardMember.board_id).filter(
            BoardMember.user_id == user_id,
            BoardMember.status == 'accepted'
        )
        return Activity.query.filter(
            Activity.board_id.in_(board_ids_query)
        ).order_by(Activity.timestamp.desc()).limit(limit).all()

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
