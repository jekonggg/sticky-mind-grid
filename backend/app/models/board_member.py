from datetime import datetime
import uuid
from app import db

def generate_uuid():
    return str(uuid.uuid4())

class BoardMember(db.Model):
    __tablename__ = 'board_members'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    board_id = db.Column(db.String(36), db.ForeignKey('boards.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='member') # 'owner', 'admin', 'member', 'viewer'
    status = db.Column(db.String(20), nullable=False, default='accepted') # 'pending', 'accepted', 'declined'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    board = db.relationship('Board', back_populates='memberships')
    user = db.relationship('User', back_populates='board_memberships')

    __table_args__ = (
        db.UniqueConstraint('board_id', 'user_id', name='uq_board_user'),
    )

    def __init__(self, board_id: str, user_id: str, role: str = 'member', status: str = 'accepted', **kwargs):
        super().__init__(**kwargs)
        self.board_id = board_id
        self.user_id = user_id
        self.role = role
        self.status = status

    def to_dict(self):
        # Allow expanding user details if joined
        user_data = None
        if getattr(self, 'user', None):
             user_data = self.user.to_dict()
             
        return {
            'id': self.id,
            'boardId': self.board_id,
            'userId': self.user_id,
            'role': self.role,
            'status': self.status,
            'user': user_data,
            'createdAt': self.created_at.isoformat() + 'Z' if self.created_at else None
        }
