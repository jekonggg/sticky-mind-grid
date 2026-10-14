import uuid
from datetime import datetime
from app import db

def generate_uuid():
    return str(uuid.uuid4())

class ScratchpadNote(db.Model):
    __tablename__ = 'scratchpad_notes'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False, default='Untitled Scratchpad')
    content = db.Column(db.Text, nullable=True, default='')
    color = db.Column(db.String(50), default='#fef3c7', nullable=False)
    pinned = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('scratchpads', lazy=True, cascade='all, delete-orphan'))

    def __init__(self, user_id: str, title: str = 'Untitled Scratchpad', content: str = '', color: str = '#fef3c7', pinned: bool = False, **kwargs):
        super().__init__(**kwargs)
        self.user_id = user_id
        self.title = title
        self.content = content
        self.color = color
        self.pinned = pinned

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'title': self.title,
            'content': self.content or '',
            'color': self.color,
            'pinned': self.pinned,
            'createdAt': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() + 'Z' if self.updated_at else None
        }
