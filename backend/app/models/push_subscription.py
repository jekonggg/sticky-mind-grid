from datetime import datetime
import uuid
from app import db


def generate_uuid():
    return str(uuid.uuid4())


class PushSubscription(db.Model):
    __tablename__ = 'push_subscriptions'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    endpoint = db.Column(db.String(500), nullable=False, index=True)
    p256dh = db.Column(db.String(255), nullable=False)
    auth = db.Column(db.String(255), nullable=False)
    user_agent = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', back_populates='push_subscriptions')

    __table_args__ = (
        db.UniqueConstraint('user_id', 'endpoint', name='uq_user_push_endpoint'),
    )

    def __init__(self, user_id: str, endpoint: str, p256dh: str, auth: str, user_agent: str = None, **kwargs):
        super().__init__(**kwargs)
        self.user_id = user_id
        self.endpoint = endpoint
        self.p256dh = p256dh
        self.auth = auth
        self.user_agent = user_agent

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'endpoint': self.endpoint,
            'userAgent': self.user_agent,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
