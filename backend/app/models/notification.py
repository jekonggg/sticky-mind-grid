from datetime import datetime
import uuid
from app import db

def generate_uuid():
    return str(uuid.uuid4())

class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(db.String(50), nullable=False) # 'mention', 'assignment', 'invite', 'system'
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    link = db.Column(db.String(255), nullable=True) # e.g. /boards/<id>
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', back_populates='notifications')

    def __init__(self, user_id: str, type: str, title: str, message: str, link: str = None, is_read: bool = False, **kwargs):
        super().__init__(**kwargs)
        self.user_id = user_id
        self.type = type
        self.title = title
        self.message = message
        self.link = link
        self.is_read = is_read

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'link': self.link,
            'isRead': self.is_read,
            'createdAt': self.created_at.isoformat() + 'Z' if self.created_at else None
        }
