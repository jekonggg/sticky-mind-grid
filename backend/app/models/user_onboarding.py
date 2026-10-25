from datetime import datetime
import uuid

from app import db
from app.models.types import CompatibleJSON

ONBOARDING_STATUSES = (
    'not_started',
    'in_progress',
    'completed',
    'skipped',
    'not_applicable',
)

STARTER_TEMPLATES = ('personal', 'team', 'product', 'ideas')

COACH_MARK_IDS = ('board-columns', 'add-task', 'status-done')

ONBOARDING_STEPS = (
    ('board_created', 'Create your first board', 'Your starter board is ready to use.'),
    ('task_created', 'Add your first task', 'Capture something you want to get done.'),
    ('task_completed', 'Complete your first task', 'Move a card into your Done column.'),
)


def generate_uuid():
    return str(uuid.uuid4())


class UserOnboarding(db.Model):
    __tablename__ = 'user_onboarding'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(
        db.String(36),
        db.ForeignKey('users.id', ondelete='CASCADE'),
        unique=True,
        nullable=False,
        index=True,
    )
    status = db.Column(db.String(20), default='not_started', nullable=False, index=True)
    template = db.Column(db.String(30), nullable=True)
    starter_board_id = db.Column(db.String(36), nullable=True)

    step_board_created_at = db.Column(db.DateTime, nullable=True)
    step_task_created_at = db.Column(db.DateTime, nullable=True)
    step_task_completed_at = db.Column(db.DateTime, nullable=True)

    coach_marks_seen = db.Column(CompatibleJSON, default=list)
    whats_new_seen_version = db.Column(db.Integer, default=0, nullable=False)
    tour_banner_dismissed_at = db.Column(db.DateTime, nullable=True)
    replay_started_at = db.Column(db.DateTime, nullable=True)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    skipped_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', back_populates='onboarding')

    def __init__(self, user_id: str, status: str = 'not_started', **kwargs):
        super().__init__(**kwargs)
        self.user_id = user_id
        self.status = status if status in ONBOARDING_STATUSES else 'not_applicable'
        if self.coach_marks_seen is None:
            self.coach_marks_seen = []

    @property
    def seen_coach_marks(self):
        marks = self.coach_marks_seen
        return [str(mark) for mark in marks] if isinstance(marks, list) else []

    def steps(self):
        return [
            {
                'key': key,
                'title': title,
                'description': description,
                'completed': bool(getattr(self, f'step_{key}_at', None)),
                'completedAt': iso(getattr(self, f'step_{key}_at', None)),
            }
            for key, title, description in ONBOARDING_STEPS
        ]

    def progress(self):
        completed = sum(1 for step in self.steps() if step['completed'])
        return int(round((completed / len(ONBOARDING_STEPS)) * 100))

    def to_dict(self, enabled=True):
        return {
            'enabled': bool(enabled),
            'status': self.status,
            'template': self.template,
            'starterBoardId': self.starter_board_id,
            'steps': self.steps(),
            'progress': self.progress(),
            'coachMarks': [
                {'id': mark_id, 'seen': mark_id in self.seen_coach_marks}
                for mark_id in COACH_MARK_IDS
            ],
            'whatsNewSeenVersion': self.whats_new_seen_version or 0,
            'tourBannerDismissed': bool(self.tour_banner_dismissed_at),
            'startedAt': iso(self.started_at),
            'completedAt': iso(self.completed_at),
            'skippedAt': iso(self.skipped_at),
            'replayStartedAt': iso(self.replay_started_at),
            'createdAt': iso(self.created_at),
            'updatedAt': iso(self.updated_at),
        }


class OnboardingEvent(db.Model):
    """Anonymous-by-design onboarding analytics.

    Only event, step, and template *keys* are stored.  Board names, task
    titles, descriptions, and any other user-authored text are never logged.
    """

    __tablename__ = 'onboarding_events'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(
        db.String(36),
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    event = db.Column(db.String(50), nullable=False, index=True)
    step = db.Column(db.String(50), nullable=True)
    template = db.Column(db.String(30), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'event': self.event,
            'step': self.step,
            'template': self.template,
            'createdAt': iso(self.created_at),
        }


class BoardRoleTip(db.Model):
    __tablename__ = 'board_role_tips'
    __table_args__ = (
        db.UniqueConstraint('user_id', 'board_id', name='uq_board_role_tips_user_board'),
    )

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(
        db.String(36),
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    board_id = db.Column(
        db.String(36),
        db.ForeignKey('boards.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    last_known_role = db.Column(db.String(20), nullable=True)
    role_change_from_role = db.Column(db.String(20), nullable=True)
    tip_seen_at = db.Column(db.DateTime, nullable=True)
    role_change_pending = db.Column(db.Boolean, default=False, nullable=False)
    role_change_seen_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __init__(self, user_id: str, board_id: str, **kwargs):
        super().__init__(**kwargs)
        self.user_id = user_id
        self.board_id = board_id


def iso(value):
    return value.isoformat() + 'Z' if value else None
