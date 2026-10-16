from datetime import datetime, timedelta
from flask import current_app
from sqlalchemy import or_
from app import db
from app.models.activity import Activity

class ActivityService:
    @staticmethod
    def _get_retention_cutoff():
        try:
            retention_days = int(current_app.config.get('ACTIVITY_RETENTION_DAYS', 0) or 0)
        except Exception:
            retention_days = 0
        if retention_days > 0:
            return datetime.utcnow() - timedelta(days=retention_days)
        return None

    @staticmethod
    def get_activities(board_id=None, limit=50, task_title=None, task_id=None):
        from sqlalchemy.orm import joinedload
        query = Activity.query.options(joinedload(Activity.user))
        if board_id:
            query = query.filter(Activity.board_id == board_id)

        cutoff = ActivityService._get_retention_cutoff()
        if cutoff is not None:
            query = query.filter(Activity.timestamp >= cutoff)

        if task_id and task_title:
            query = query.filter(
                or_(
                    Activity.target_id == str(task_id),
                    Activity.task_title == task_title
                )
            )
        elif task_id:
            from app.models.task import Task
            task_obj = db.session.get(Task, task_id)
            if task_obj and task_obj.title:
                query = query.filter(
                    or_(
                        Activity.target_id == str(task_id),
                        Activity.task_title == task_obj.title
                    )
                )
            else:
                query = query.filter(Activity.target_id == str(task_id))
        elif task_title:
            query = query.filter(Activity.task_title == task_title)
        
        return query.order_by(Activity.timestamp.desc()).limit(limit).all()

    @staticmethod
    def get_user_activities(user_id, limit=50):
        from app.models.board_member import BoardMember
        from app.models.board import Board
        from sqlalchemy.orm import joinedload
        admin_member_board_ids = db.session.query(BoardMember.board_id).filter(
            BoardMember.user_id == user_id,
            BoardMember.status == 'accepted',
            BoardMember.role.in_(['owner', 'admin'])
        )
        owned_board_ids = db.session.query(Board.id).filter(
            Board.owner_id == user_id,
            Board.is_deleted.is_(False)
        )
        query = Activity.query.options(joinedload(Activity.user)).filter(
            or_(
                Activity.board_id.in_(admin_member_board_ids),
                Activity.board_id.in_(owned_board_ids)
            )
        )
        cutoff = ActivityService._get_retention_cutoff()
        if cutoff is not None:
            query = query.filter(Activity.timestamp >= cutoff)

        return query.order_by(Activity.timestamp.desc()).limit(limit).all()

    @staticmethod
    def add_activity(data):
        new_activity = Activity(
            board_id=data.get('boardId'),
            type=data.get('type'),
            target_type=data.get('targetType') or 'task',
            target_id=data.get('targetId'),
            task_title=data.get('taskTitle'),
            before_value=data.get('beforeValue'),
            after_value=data.get('afterValue'),
            message=data.get('message'),
            user_id=data.get('userId')
        )
        db.session.add(new_activity)
        db.session.commit()
        return new_activity

