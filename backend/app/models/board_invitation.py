from datetime import datetime, timedelta
import uuid
from app import db

def generate_uuid():
    return str(uuid.uuid4())

class BoardInvitation(db.Model):
    __tablename__ = 'board_invitations'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    board_id = db.Column(db.String(36), db.ForeignKey('boards.id', ondelete='CASCADE'), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='editor')
    status = db.Column(db.String(20), nullable=False, default='pending') # 'pending', 'accepted', 'expired', 'revoked', 'declined'
    inviter_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    accepted_at = db.Column(db.DateTime, nullable=True)
    revoked_at = db.Column(db.DateTime, nullable=True)

    board = db.relationship('Board', backref=db.backref('invitations', cascade='all, delete-orphan', lazy=True))
    inviter = db.relationship('User', foreign_keys=[inviter_id], backref=db.backref('sent_invitations', cascade='all, delete-orphan', lazy=True))

    def __init__(self, board_id: str, email: str, inviter_id: str, role: str = 'editor', **kwargs):
        super().__init__(**kwargs)
        self.board_id = board_id
        self.email = email.strip().lower()
        self.inviter_id = inviter_id
        self.role = role
        self.status = 'pending'
        if not kwargs.get('expires_at'):
            self.expires_at = datetime.utcnow() + timedelta(days=7)

    @property
    def is_expired(self) -> bool:
        if self.status == 'expired':
            return True
        if self.status == 'pending' and self.expires_at and datetime.utcnow() > self.expires_at:
            return True
        return False

    def to_dict(self):
        effective_status = 'expired' if (self.status == 'pending' and self.is_expired) else self.status
        inviter_data = None
        if self.inviter:
            inviter_data = {
                'id': self.inviter.id,
                'fullName': self.inviter.full_name,
                'email': self.inviter.email,
                'avatarUrl': self.inviter.avatar_url,
            }

        board_data = None
        if self.board:
            inviter_user = self.inviter or self.board.owner
            owner_name = (inviter_user.full_name or inviter_user.email) if inviter_user else "Board Owner"
            board_data = {
                'id': self.board.id,
                'name': self.board.name,
                'emoji': self.board.emoji,
                'color': self.board.color,
                'ownerName': owner_name
            }

        return {
            'id': self.id,
            'boardId': self.board_id,
            'email': self.email,
            'role': self.role,
            'status': effective_status,
            'inviterId': self.inviter_id,
            'inviter': inviter_data,
            'board': board_data,
            'createdAt': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'expiresAt': self.expires_at.isoformat() + 'Z' if self.expires_at else None,
            'acceptedAt': self.accepted_at.isoformat() + 'Z' if self.accepted_at else None,
            'revokedAt': self.revoked_at.isoformat() + 'Z' if self.revoked_at else None,
        }
