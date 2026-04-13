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
    message = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'boardId': self.board_id,
            'type': self.type,
            'taskTitle': self.task_title,
            'message': self.message,
            'userId': self.user_id,
            'timestamp': self.timestamp.isoformat()
        }
