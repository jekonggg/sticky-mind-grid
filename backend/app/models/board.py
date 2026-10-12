from datetime import datetime, timedelta
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
    color = db.Column(db.String(50), nullable=False, default='hsl(220, 80%, 56%)')
    hero_image_url = db.Column(db.Text().with_variant(LONGTEXT, "mysql"), nullable=True)
    columns = db.Column(db.JSON, default=list)
    owner_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True) # Temporarily nullable for migration
    workspace_id = db.Column(db.String(36), nullable=True, index=True)
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)
    deleted_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = db.relationship('User', back_populates='owned_boards')
    tasks = db.relationship('Task', back_populates='board', lazy=True, cascade="all, delete-orphan")
    memberships = db.relationship('BoardMember', back_populates='board', lazy=True, cascade="all, delete-orphan")

    def __init__(self, name: str, emoji: str = None, description: str = None, color: str = 'hsl(220, 80%, 56%)', hero_image_url: str = None, columns: list = None, owner_id: str = None, workspace_id: str = None, **kwargs):
        super().__init__(**kwargs)
        self.name = name
        self.emoji = emoji
        self.description = description
        self.color = color or 'hsl(220, 80%, 56%)'
        self.hero_image_url = hero_image_url
        self.columns = columns if columns is not None else []
        self.owner_id = owner_id
        self.workspace_id = workspace_id
        if self.is_deleted is None:
            self.is_deleted = False

    def touch(self):
        self.updated_at = datetime.utcnow()

    def to_dict(self, user_id=None):
        # Ensure a valid HSL color is always returned
        safe_color = self.color if (self.color and self.color.startswith('hsl')) else 'hsl(220, 80%, 56%)'
        
        # Calculate owners count
        owners = set()
        if self.owner_id:
            owners.add(str(self.owner_id))
        for m in (self.memberships or []):
            if m.role == 'owner' and m.status == 'accepted':
                owners.add(str(m.user_id))
        owner_count = len(owners)

        user_role = None
        user_is_muted = False
        if user_id:
            user_id_str = str(user_id)
            if self.owner_id and str(self.owner_id) == user_id_str:
                user_role = 'owner'
            for m in (self.memberships or []):
                if str(m.user_id) == user_id_str and m.status == 'accepted':
                    if not user_role:
                        user_role = m.role
                    user_is_muted = bool(getattr(m, 'is_muted', False))
                    break

        # Task counts (exclude trashed and archived tasks)
        active_tasks = [
            t for t in (self.tasks or [])
            if not getattr(t, 'is_deleted', False) and getattr(t, 'status', '') != 'archive'
        ]
        open_tasks = [
            t for t in active_tasks
            if getattr(t, 'status', '') != 'done' and (getattr(t, 'progress', 0) or 0) < 100
        ]
        now = datetime.utcnow()
        soon_threshold = now + timedelta(days=3)
        overdue_count = sum(
            1 for t in open_tasks
            if getattr(t, 'due_date', None) and t.due_date < now
        )
        due_soon_count = sum(
            1 for t in open_tasks
            if getattr(t, 'due_date', None) and now <= t.due_date <= soon_threshold
        )

        # Card-level member cues (never expose email in membersPreview)
        members_preview = []
        seen_member_ids = set()
        for m in (self.memberships or []):
            if m.status == 'accepted' and m.user:
                u = m.user
                uid = str(u.id)
                if uid not in seen_member_ids:
                    seen_member_ids.add(uid)
                    members_preview.append({
                        'id': uid,
                        'fullName': u.full_name or (u.email.split('@')[0] if u.email else 'User'),
                        'avatarUrl': u.avatar_url,
                        'role': m.role
                    })
        if self.owner and str(self.owner.id) not in seen_member_ids:
            u = self.owner
            uid = str(u.id)
            seen_member_ids.add(uid)
            members_preview.insert(0, {
                'id': uid,
                'fullName': u.full_name or (u.email.split('@')[0] if u.email else 'User'),
                'avatarUrl': u.avatar_url,
                'role': 'owner'
            })

        data = {
            'id': self.id,
            'name': self.name,
            'emoji': self.emoji,
            'description': self.description,
            'color': safe_color,
            'heroImageUrl': self.hero_image_url,
            'columns': self.columns,
            'ownerId': self.owner_id,
            'workspaceId': getattr(self, 'workspace_id', None),
            'taskCount': len(active_tasks),
            'openTaskCount': len(open_tasks),
            'overdueCount': overdue_count,
            'dueSoonCount': due_soon_count,
            'ownerCount': owner_count,
            'memberCount': len(members_preview),
            'isShared': len(members_preview) > 1,
            'membersPreview': members_preview[:6],
            'isMuted': user_is_muted,
            'isDeleted': bool(self.is_deleted),
            'deletedAt': self.deleted_at.isoformat() + 'Z' if self.deleted_at else None,
            'createdAt': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() + 'Z' if self.updated_at else None
        }
        if user_role:
            data['role'] = user_role
        return data

