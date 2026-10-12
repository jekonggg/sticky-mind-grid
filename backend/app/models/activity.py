from datetime import datetime
import uuid
from app import db

def generate_uuid():
    return str(uuid.uuid4())

class Activity(db.Model):
    __tablename__ = 'activities'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    board_id = db.Column(db.String(36), db.ForeignKey('boards.id', ondelete='CASCADE'), nullable=True)
    type = db.Column(db.String(50), nullable=False) # create, move, update, delete
    task_title = db.Column(db.String(255), nullable=False)
    target_type = db.Column(db.String(50), nullable=True, default='task')
    target_id = db.Column(db.String(36), nullable=True)
    before_value = db.Column(db.Text, nullable=True)
    after_value = db.Column(db.Text, nullable=True)
    message = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', back_populates='activities')

    def __init__(
        self,
        type: str,
        task_title: str,
        message: str,
        board_id: str = None,
        user_id: str = None,
        target_type: str = 'task',
        target_id: str = None,
        before_value: str = None,
        after_value: str = None,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.board_id = board_id
        self.type = type
        self.task_title = task_title
        self.target_type = target_type
        self.target_id = target_id
        self.before_value = before_value
        self.after_value = after_value
        self.message = message
        self.user_id = user_id

    def to_dict(self):
        is_active_member = False
        if self.user:
            if not self.board_id:
                is_active_member = True
            else:
                from app.models.board import Board
                from app.models.board_member import BoardMember
                board = db.session.get(Board, self.board_id)
                if board and str(board.owner_id) == str(self.user_id):
                    is_active_member = True
                else:
                    bm = BoardMember.query.filter_by(
                        board_id=self.board_id,
                        user_id=self.user_id,
                        status='accepted'
                    ).first()
                    is_active_member = bm is not None

        user_data = self.user.to_dict() if (self.user and is_active_member) else {
            'id': self.user_id,
            'fullName': 'Former member',
            'email': '',
            'avatarUrl': None
        }
        return {
            'id': self.id,
            'boardId': self.board_id,
            'type': self.type,
            'taskTitle': self.task_title,
            'targetType': self.target_type or 'task',
            'targetId': self.target_id,
            'beforeValue': self.before_value,
            'afterValue': self.after_value,
            'message': self.message,
            'userId': self.user_id,
            'user': user_data,
            'timestamp': self.timestamp.isoformat() + 'Z' if self.timestamp else None
        }
