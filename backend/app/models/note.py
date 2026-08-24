from datetime import datetime
import uuid
from app import db

def generate_uuid():
    return str(uuid.uuid4())

class Note(db.Model):
    __tablename__ = 'notes'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    board_id = db.Column(db.String(36), db.ForeignKey('boards.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=True, default='')
    color = db.Column(db.String(50), default='#fef3c7', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    board = db.relationship('Board', backref=db.backref('notes', lazy=True, cascade='all, delete-orphan'))
    user = db.relationship('User', backref=db.backref('notes', lazy=True, cascade='all, delete-orphan'))

    def __init__(self, board_id: str, user_id: str, title: str, content: str = '', color: str = '#fef3c7', **kwargs):
        super().__init__(**kwargs)
        self.board_id = board_id
        self.user_id = user_id
        self.title = title
        self.content = content
        self.color = color

    def to_dict(self):
        user_data = self.user.to_dict() if self.user else None
        return {
            'id': self.id,
            'boardId': self.board_id,
            'userId': self.user_id,
            'user': user_data,
            'title': self.title,
            'content': self.content,
            'color': self.color,
            'createdAt': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() + 'Z' if self.updated_at else None
        }
