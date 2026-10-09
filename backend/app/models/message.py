from datetime import datetime
import uuid
from app import db

def generate_uuid():
    return str(uuid.uuid4())

class Conversation(db.Model):
    __tablename__ = 'conversations'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    title = db.Column(db.String(255), nullable=True) # Used for group chats; None for direct chats
    type = db.Column(db.String(32), default='direct', nullable=False) # 'direct' or 'group'
    created_by = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_message_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_message_preview = db.Column(db.Text, nullable=True)

    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by], lazy=True)
    participants = db.relationship(
        'ConversationParticipant',
        back_populates='conversation',
        lazy=True,
        cascade='all, delete-orphan'
    )
    messages = db.relationship(
        'Message',
        back_populates='conversation',
        lazy=True,
        cascade='all, delete-orphan',
        order_by='Message.created_at.asc()'
    )

    def __init__(self, title: str = None, type: str = 'direct', created_by: str = None, **kwargs):
        super().__init__(**kwargs)
        self.title = title
        self.type = type
        self.created_by = created_by
        self.last_message_at = datetime.utcnow()

    def to_dict(self, current_user_id: str = None, unread_count: int = None):
        # Format participants
        participants_data = [p.to_dict() for p in self.participants] if self.participants else []
        
        # Determine display name & avatar for direct chat vs group chat
        display_title = self.title
        display_avatar = None
        other_user = None

        if self.type == 'direct' and current_user_id:
            for p in self.participants:
                if p.user_id != current_user_id and p.user:
                    other_user = p.user.to_dict()
                    display_title = p.user.full_name or p.user.email
                    display_avatar = p.user.avatar_url
                    break

        # Calculate unread count for the current user if not precomputed
        actual_unread_count = unread_count
        if actual_unread_count is None and current_user_id:
            current_participant = None
            for p in self.participants:
                if p.user_id == current_user_id:
                    current_participant = p
                    break
            
            if current_participant:
                from sqlalchemy import func
                query = db.session.query(func.count(Message.id)).filter(
                    Message.conversation_id == self.id,
                    Message.sender_id != current_user_id,
                    Message.is_deleted == False
                )
                if current_participant.last_read_at:
                    query = query.filter(Message.created_at > current_participant.last_read_at)
                actual_unread_count = query.scalar() or 0
            else:
                actual_unread_count = 0
        elif actual_unread_count is None:
            actual_unread_count = 0

        return {
            'id': self.id,
            'title': self.title,
            'displayTitle': display_title or 'Conversation',
            'displayAvatar': display_avatar,
            'type': self.type,
            'createdBy': self.created_by,
            'otherUser': other_user,
            'participants': participants_data,
            'participantCount': len(participants_data),
            'unreadCount': actual_unread_count,
            'lastMessageAt': self.last_message_at.isoformat() + 'Z' if self.last_message_at else None,
            'lastMessagePreview': self.last_message_preview,
            'createdAt': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() + 'Z' if self.updated_at else None
        }


class ConversationParticipant(db.Model):
    __tablename__ = 'conversation_participants'
    __table_args__ = (
        db.UniqueConstraint('conversation_id', 'user_id', name='uq_conversation_user'),
    )

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    conversation_id = db.Column(db.String(36), db.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role = db.Column(db.String(32), default='member', nullable=False) # 'admin', 'member'
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_read_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    conversation = db.relationship('Conversation', back_populates='participants')
    user = db.relationship('User', back_populates='conversation_participations')

    def __init__(self, conversation_id: str, user_id: str, role: str = 'member', **kwargs):
        super().__init__(**kwargs)
        self.conversation_id = conversation_id
        self.user_id = user_id
        self.role = role
        self.last_read_at = datetime.utcnow()

    def to_dict(self):
        user_data = self.user.to_dict() if self.user else None
        return {
            'id': self.id,
            'conversationId': self.conversation_id,
            'userId': self.user_id,
            'user': user_data,
            'role': self.role,
            'joinedAt': self.joined_at.isoformat() + 'Z' if self.joined_at else None,
            'lastReadAt': self.last_read_at.isoformat() + 'Z' if self.last_read_at else None
        }


class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    conversation_id = db.Column(db.String(36), db.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False)
    sender_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    content = db.Column(db.Text, nullable=True)
    attachments = db.Column(db.JSON, default=list) # [{ name, url, size, mimeType }]
    reply_to_id = db.Column(db.String(36), db.ForeignKey('messages.id', ondelete='SET NULL'), nullable=True)
    reactions = db.Column(db.JSON, default=dict) # { "👍": ["userId1", "userId2"] }
    is_forwarded = db.Column(db.Boolean, default=False, nullable=False)
    is_pinned = db.Column(db.Boolean, default=False, nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    conversation = db.relationship('Conversation', back_populates='messages')
    sender = db.relationship('User', foreign_keys=[sender_id], back_populates='sent_messages')
    reply_to = db.relationship('Message', remote_side=[id], lazy=True)

    __table_args__ = (
        db.Index('ix_messages_conv_created', 'conversation_id', 'created_at'),
    )

    def __init__(self, conversation_id: str, sender_id: str, content: str = '', attachments: list = None, reply_to_id: str = None, is_forwarded: bool = False, is_pinned: bool = False, **kwargs):
        super().__init__(**kwargs)
        self.conversation_id = conversation_id
        self.sender_id = sender_id
        self.content = content or ''
        self.attachments = attachments if attachments is not None else []
        self.reply_to_id = reply_to_id
        self.is_forwarded = is_forwarded
        self.is_pinned = is_pinned
        self.reactions = {}
        self.is_deleted = False

    def to_dict(self):
        sender_data = self.sender.to_dict() if self.sender else None
        reply_to_data = None
        if self.reply_to and not self.reply_to.is_deleted:
            reply_to_data = {
                'id': self.reply_to.id,
                'senderId': self.reply_to.sender_id,
                'senderName': self.reply_to.sender.full_name or self.reply_to.sender.email if self.reply_to.sender else 'User',
                'content': self.reply_to.content,
                'hasAttachments': bool(self.reply_to.attachments)
            }

        return {
            'id': self.id,
            'conversationId': self.conversation_id,
            'senderId': self.sender_id,
            'sender': sender_data,
            'content': 'This message was unsent' if self.is_deleted else self.content,
            'attachments': [] if self.is_deleted else (self.attachments or []),
            'replyToId': self.reply_to_id,
            'replyTo': reply_to_data,
            'reactions': {} if self.is_deleted else (self.reactions or {}),
            'isForwarded': bool(self.is_forwarded) if not self.is_deleted else False,
            'isPinned': bool(self.is_pinned) if not self.is_deleted else False,
            'isDeleted': self.is_deleted,
            'createdAt': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() + 'Z' if self.updated_at else None
        }
