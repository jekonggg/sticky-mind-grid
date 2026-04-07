from datetime import datetime
import uuid
from app import db

def generate_uuid():
    return str(uuid.uuid4())

from sqlalchemy.dialects.mysql import LONGTEXT

class Board(db.Model):
    __tablename__ = 'boards'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(255), nullable=False)
    emoji = db.Column(db.String(50), nullable=True)
    description = db.Column(db.Text, nullable=True)
    color = db.Column(db.String(50), nullable=True)
    hero_image_url = db.Column(db.Text().with_variant(LONGTEXT, "mysql"), nullable=True)
    columns = db.Column(db.JSON, default=list)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tasks = db.relationship('Task', backref='board', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'emoji': self.emoji,
            'description': self.description,
            'color': self.color,
            'heroImageUrl': self.hero_image_url,
            'columns': self.columns,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }
