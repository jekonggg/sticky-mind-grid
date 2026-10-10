from datetime import datetime
import uuid
from app import db

def generate_uuid():
    return str(uuid.uuid4())

class Comment(db.Model):
    __tablename__ = 'comments'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    task_id = db.Column(db.String(36), db.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    mentions = db.Column(db.JSON, default=list) # List of mentioned user_ids
    is_edited = db.Column(db.Boolean, default=False, nullable=False)
    original_content = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    task = db.relationship('Task', backref=db.backref('comments', lazy=True, cascade='all, delete-orphan'))
    user = db.relationship('User', back_populates='comments')

    def __init__(self, task_id: str, user_id: str, content: str, mentions: list = None, is_edited: bool = False, original_content: str = None, **kwargs):
        super().__init__(**kwargs)
        self.task_id = task_id
        self.user_id = user_id
        self.content = content
        self.mentions = mentions if mentions is not None else []
        self.is_edited = is_edited
        self.original_content = original_content

    def to_dict(self):
        user_data = self.user.to_dict() if self.user else None
        return {
            'id': self.id,
            'taskId': self.task_id,
            'userId': self.user_id,
            'user': user_data,
            'content': self.content,
            'mentions': self.mentions,
            'isEdited': self.is_edited,
            'originalContent': self.original_content,
            'createdAt': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() + 'Z' if self.updated_at else None
        }
