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
            'notifyMentions': self.notify_mentions,
            'notifyAssignments': self.notify_assignments,
            'notifyInvites': self.notify_invites,
            'notifyComments': self.notify_comments,
            'updatedAt': self.updated_at.isoformat() + 'Z' if self.updated_at else None
        }
