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
    position = db.Column(db.Float, default=0.0, nullable=False)
    checklist = db.Column(db.JSON, default=list) # [{id, title, completed}]
    tags = db.Column(db.JSON, default=list) # [{id, name, color}]
    attachments = db.Column(db.JSON, default=list)
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)
    deleted_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    board = db.relationship('Board', back_populates='tasks')
    creator = db.relationship('User', foreign_keys=[created_by], back_populates='created_tasks')
    assignee = db.relationship('User', foreign_keys=[assigned_to], back_populates='assigned_tasks')

    def __init__(self, board_id: str, title: str, emoji: str = None, description: str = None, status: str = 'todo', priority: str = 'medium', progress: int = 0, due_date: datetime = None, assigned_to: str = None, created_by: str = None, position: float = 0.0, checklist: list = None, tags: list = None, attachments: list = None, is_deleted: bool = False, deleted_at: datetime = None, **kwargs):
        super().__init__(**kwargs)
        self.board_id = board_id
        self.title = title
        self.emoji = emoji
        self.description = description
        self.status = status
        self.priority = priority
        self.progress = progress
        self.due_date = due_date
        self.assigned_to = assigned_to
        self.created_by = created_by
        self.position = position if position is not None else 0.0
        self.checklist = checklist if checklist is not None else []
        self.tags = tags if tags is not None else []
        self.attachments = attachments if attachments is not None else []
        self.is_deleted = is_deleted
        self.deleted_at = deleted_at

    def to_dict(self):
        assignee_data = self.assignee.to_dict() if self.assignee else None
        return {
            'id': self.id,
            'boardId': self.board_id,
            'title': self.title,
            'emoji': self.emoji,
            'description': self.description,
            'status': self.status,
            'priority': self.priority,
            'progress': self.progress,
            'position': self.position,
            'checklist': self.checklist or [],
            'tags': self.tags or [],
            'dueDate': self.due_date.isoformat() + 'Z' if self.due_date else None,
            'assignedTo': self.assigned_to,
            'assignee': assignee_data,
            'createdBy': self.created_by,
            'attachments': self.attachments,
            'isDeleted': self.is_deleted,
            'deletedAt': self.deleted_at.isoformat() + 'Z' if self.deleted_at else None,
            'createdAt': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() + 'Z' if self.updated_at else None
        }
