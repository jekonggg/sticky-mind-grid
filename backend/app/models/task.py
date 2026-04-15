from datetime import datetime
import uuid
from app import db

def generate_uuid():
    return str(uuid.uuid4())

from sqlalchemy.dialects.mysql import LONGTEXT

class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    board_id = db.Column(db.String(36), db.ForeignKey('boards.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    emoji = db.Column(db.String(50), nullable=True)
    description = db.Column(db.Text().with_variant(LONGTEXT, "mysql"), nullable=True)
    status = db.Column(db.String(50), default='todo')
    priority = db.Column(db.String(50), default='medium')
    progress = db.Column(db.Integer, default=0)
    due_date = db.Column(db.DateTime, nullable=True)
    assigned_to = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    attachments = db.Column(db.JSON, default=list)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    board = db.relationship('Board', back_populates='tasks')
    creator = db.relationship('User', foreign_keys=[created_by], back_populates='created_tasks')
    assignee = db.relationship('User', foreign_keys=[assigned_to], back_populates='assigned_tasks')

    def to_dict(self):
        return {
            'id': self.id,
            'boardId': self.board_id,
            'title': self.title,
            'emoji': self.emoji,
            'description': self.description,
            'status': self.status,
            'priority': self.priority,
            'progress': self.progress,
            'dueDate': self.due_date.isoformat() if self.due_date else None,
            'assignedTo': self.assigned_to,
            'createdBy': self.created_by,
            'attachments': self.attachments,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }
