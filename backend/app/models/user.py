from datetime import datetime
import uuid
from app import db, bcrypt

def generate_uuid():
    return str(uuid.uuid4())

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    owned_boards = db.relationship('Board', back_populates='owner', lazy=True)
    created_tasks = db.relationship('Task', foreign_keys='Task.created_by', back_populates='creator', lazy=True)
    assigned_tasks = db.relationship('Task', foreign_keys='Task.assigned_to', back_populates='assignee', lazy=True)
    activities = db.relationship('Activity', back_populates='user', lazy=True)
    board_memberships = db.relationship('BoardMember', back_populates='user', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'fullName': self.full_name,
            'createdAt': self.created_at.isoformat() + 'Z' if self.created_at else None
        }
