from datetime import datetime
import uuid
from app import db

def generate_uuid():
    return str(uuid.uuid4())

class UserPreference(db.Model):
    __tablename__ = 'user_preferences'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    default_board_view = db.Column(db.String(50), default='board', nullable=False)
    timezone = db.Column(db.String(100), default='UTC', nullable=False)
    date_format = db.Column(db.String(50), default='MM/DD/YYYY', nullable=False)
    first_day_of_week = db.Column(db.Integer, default=0, nullable=False)  # 0 = Sunday, 1 = Monday
    notify_mentions = db.Column(db.Boolean, default=True, nullable=False)
    notify_assignments = db.Column(db.Boolean, default=True, nullable=False)
    notify_invites = db.Column(db.Boolean, default=True, nullable=False)
    notify_comments = db.Column(db.Boolean, default=True, nullable=False)
    notify_card_moves = db.Column(db.Boolean, default=True, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', back_populates='preferences')

    def __init__(self, user_id: str, **kwargs):
        super().__init__(**kwargs)
        self.user_id = user_id

    def to_dict(self):
        return {
            'defaultBoardView': self.default_board_view,
            'timezone': self.timezone,
            'dateFormat': self.date_format,
            'firstDayOfWeek': self.first_day_of_week,
            'notifyMentions': getattr(self, 'notify_mentions', True) if getattr(self, 'notify_mentions', True) is not None else True,
            'notifyAssignments': getattr(self, 'notify_assignments', True) if getattr(self, 'notify_assignments', True) is not None else True,
            'notifyInvites': getattr(self, 'notify_invites', True) if getattr(self, 'notify_invites', True) is not None else True,
            'notifyComments': getattr(self, 'notify_comments', True) if getattr(self, 'notify_comments', True) is not None else True,
            'notifyCardMoves': getattr(self, 'notify_card_moves', True) if getattr(self, 'notify_card_moves', True) is not None else True,
            'updatedAt': self.updated_at.isoformat() + 'Z' if self.updated_at else None
        }
