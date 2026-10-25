"""First-run onboarding lifecycle.

The server is the source of truth for onboarding status, checklist latching, and
starter-board creation.  Clients may only choose a template (at start) and mark
the flow as skipped.  Checklist steps are derived from real events on the
starter board and are latched with timestamps, so deleting or archiving a board
later can never regress progress.
"""

from datetime import datetime
import uuid

from sqlalchemy.exc import IntegrityError

from app import db
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.task import Task
from app.models.user_onboarding import (
    COACH_MARK_IDS,
    ONBOARDING_STEPS,
    STARTER_TEMPLATES,
    OnboardingEvent,
    UserOnboarding,
    iso,
)

STARTER_BOARD_NAMESPACE = uuid.UUID('7f2f4c1e-9a3b-4a5c-8d6e-1b2c3d4e5f60')

STARTER_TEMPLATES_CONFIG = {
    'personal': {
        'name': 'My Tasks',
        'emoji': '📌',
        'description': 'A simple space for your personal to-dos.',
        'color': 'hsl(220, 80%, 56%)',
        'columns': [
            {'id': 'todo', 'title': 'To Do', 'emoji': '📝', 'isDone': False},
            {'id': 'done', 'title': 'Done', 'emoji': '✅', 'isDone': True},
        ],
    },
    'team': {
        'name': 'Team Project',
        'emoji': '👥',
        'description': 'Plan and track work with your team.',
        'color': 'hsl(142, 60%, 45%)',
        'columns': [
            {'id': 'todo', 'title': 'To Do', 'emoji': '📝', 'isDone': False},
            {'id': 'in_progress', 'title': 'In Progress', 'emoji': '⏳', 'isDone': False},
            {'id': 'done', 'title': 'Done', 'emoji': '✅', 'isDone': True},
        ],
    },
    'product': {
        'name': 'Product Sprint',
        'emoji': '🚀',
        'description': 'Run a sprint from backlog to release.',
        'color': 'hsl(280, 60%, 55%)',
        'columns': [
            {'id': 'backlog', 'title': 'Backlog', 'emoji': '📋', 'isDone': False},
            {'id': 'in_progress', 'title': 'In Progress', 'emoji': '⚡', 'isDone': False},
            {'id': 'review', 'title': 'Review', 'emoji': '👀', 'isDone': False},
            {'id': 'done', 'title': 'Done', 'emoji': '🚀', 'isDone': True},
        ],
    },
    'ideas': {
        'name': 'Ideas',
        'emoji': '💡',
        'description': 'Capture ideas and move the good ones forward.',
        'color': 'hsl(25, 90%, 55%)',
        'columns': [
            {'id': 'ideas', 'title': 'Ideas', 'emoji': '💡', 'isDone': False},
            {'id': 'doing', 'title': 'Doing', 'emoji': '🛠️', 'isDone': False},
            {'id': 'done', 'title': 'Done', 'emoji': '✅', 'isDone': True},
        ],
    },
}


class OnboardingRequiredError(Exception):
    """Raised when a user must finish or skip onboarding before creating boards."""


class OnboardingStateError(Exception):
    """Raised for an invalid onboarding state transition."""


class OnboardingDisabledError(Exception):
    """Raised when onboarding is turned off by the feature flag."""


def _now():
    return datetime.utcnow()


def _starter_board_id(user_id):
    return str(uuid.uuid5(STARTER_BOARD_NAMESPACE, f'sticky-mind-grid/starter-board/{user_id}'))


def _empty_state(enabled):
    return {
        'enabled': bool(enabled),
        'status': 'not_applicable',
        'template': None,
        'starterBoardId': None,
        'steps': [
            {
                'key': key,
                'title': title,
                'description': description,
                'completed': False,
                'completedAt': None,
            }
            for key, title, description in ONBOARDING_STEPS
        ],
        'progress': 0,
        'coachMarks': [{'id': mark_id, 'seen': False} for mark_id in COACH_MARK_IDS],
        'whatsNewSeenVersion': 0,
        'tourBannerDismissed': False,
        'startedAt': None,
        'completedAt': None,
        'skippedAt': None,
        'replayStartedAt': None,
        'createdAt': None,
        'updatedAt': None,
    }


def _record_event(user_id, event, step=None, template=None):
    db.session.add(OnboardingEvent(
        user_id=str(user_id),
        event=event,
        step=step,
        template=template,
    ))


def _complete_if_ready(row):
    if row.status != 'in_progress':
        return False
    if not (row.step_board_created_at and row.step_task_created_at and row.step_task_completed_at):
        return False
    row.status = 'completed'
    row.completed_at = _now()
    _record_event(row.user_id, 'completed', template=row.template)
    return True


class OnboardingService:
    @staticmethod
    def is_enabled():
        from flask import current_app
        try:
            value = current_app.config.get('ONBOARDING_ENABLED', True)
        except RuntimeError:
            return True
        if isinstance(value, str):
            return value.strip().lower() in ('1', 'true', 'yes', 'on')
        return bool(value)

    @staticmethod
    def get_row(user_id):
        if not user_id:
            return None
        return UserOnboarding.query.filter_by(user_id=str(user_id)).first()

    @staticmethod
    def ensure_row(user_id, status=None):
        row = OnboardingService.get_row(user_id)
        if row:
            return row
        if status is None:
            status = 'not_started' if OnboardingService.is_enabled() else 'not_applicable'
        row = UserOnboarding(user_id=str(user_id), status=status)
        db.session.add(row)
        db.session.flush()
        return row

    @staticmethod
    def create_for_new_user(user_id):
        """Create the onboarding decision exactly once, at account creation."""
        row = OnboardingService.get_row(user_id)
        if row:
            return row
        status = 'not_started' if OnboardingService.is_enabled() else 'not_applicable'
        row = UserOnboarding(user_id=str(user_id), status=status)
        db.session.add(row)
        return row

    @staticmethod
    def has_active_boards(user_id):
        return (
            db.session.query(BoardMember.board_id)
            .join(Board, Board.id == BoardMember.board_id)
            .filter(
                BoardMember.user_id == str(user_id),
                BoardMember.status == 'accepted',
                Board.owner_id == str(user_id),
                Board.is_deleted.is_(False),
            )
            .first()
            is not None
        )

    @staticmethod
    def blocks_manual_board_creation(user_id):
        if not OnboardingService.is_enabled():
            return False
        row = OnboardingService.get_row(user_id)
        if not row:
            # Missing rows are treated as not_applicable (existing accounts).
            return False
        if row.status == 'not_started' and OnboardingService.has_active_boards(user_id):
            return False
        return row.status == 'not_started'

    @staticmethod
    def _refresh_latches(row):
        """Latch steps from real board/task state without ever un-latching."""
        if row.status not in ('in_progress', 'completed'):
            return False
        if not row.starter_board_id:
            return False

        board = db.session.get(Board, row.starter_board_id)
        if not board or board.is_deleted:
            # Access may be lost or the board deleted; latched timestamps stay.
            return False

        changed = False
        now = _now()
        if not row.step_task_created_at:
            task = Task.query.filter_by(
                board_id=board.id,
                created_by=str(row.user_id),
                is_deleted=False,
            ).first()
            if task:
                row.step_task_created_at = now
                _record_event(row.user_id, 'step_completed', step='task_created', template=row.template)
                changed = True

        if not row.step_task_completed_at:
            done_column = next(
                (col for col in (board.columns or [])
                 if isinstance(col, dict) and col.get('isDone')),
                None,
            )
            if done_column:
                task = Task.query.filter_by(
                    board_id=board.id,
                    status=done_column.get('id'),
                    is_deleted=False,
                ).first()
                if task:
                    row.step_task_completed_at = now
                    _record_event(row.user_id, 'step_completed', step='task_completed', template=row.template)
                    changed = True

        if _complete_if_ready(row):
            changed = True
        return changed

    @staticmethod
    def get_state(user_id, commit_refresh=True):
        row = OnboardingService.get_row(user_id)
        if not row:
            return _empty_state(OnboardingService.is_enabled())

        changed = OnboardingService._refresh_latches(row)

        # Safety: a user who somehow already has an active board should never be
        # shown first-run onboarding.  The decision becomes final.
        if row.status == 'not_started' and OnboardingService.has_active_boards(user_id):
            row.status = 'not_applicable'
            changed = True

        if changed and commit_refresh:
            db.session.commit()
        return row.to_dict(enabled=OnboardingService.is_enabled())

    @staticmethod
    def start(user_id, template):
        if not OnboardingService.is_enabled():
            raise OnboardingDisabledError('Onboarding is disabled')
        if template not in STARTER_TEMPLATES:
            raise ValueError('Invalid starter template')

        row = (
            UserOnboarding.query
            .filter_by(user_id=str(user_id))
            .with_for_update()
            .first()
        )
        if not row:
            # Existing accounts (and accounts created while the flag was off) are
            # not re-onboarded.
            raise OnboardingStateError('Onboarding is not available for this account')

        if row.status in ('completed', 'skipped', 'not_applicable'):
            raise OnboardingStateError('Onboarding has already been decided')

        if row.status == 'in_progress':
            board = db.session.get(Board, row.starter_board_id) if row.starter_board_id else None
            return row, board

        if OnboardingService.has_active_boards(user_id):
            row.status = 'not_applicable'
            db.session.commit()
            raise OnboardingStateError('Onboarding is not available for this account')

        template_config = STARTER_TEMPLATES_CONFIG[template]
        board_id = _starter_board_id(user_id)
        existing_board = db.session.get(Board, board_id)
        if existing_board:
            row.status = 'in_progress'
            row.template = template
            row.starter_board_id = board_id
            row.started_at = row.started_at or _now()
            row.step_board_created_at = row.step_board_created_at or _now()
            db.session.commit()
            return row, existing_board

        try:
            from app.services.board_service import BoardService

            board = BoardService.create_board(
                {
                    'name': template_config['name'],
                    'emoji': template_config['emoji'],
                    'description': template_config['description'],
                    'color': template_config['color'],
                    'columns': template_config['columns'],
                },
                owner_id=str(user_id),
                commit=False,
                board_id=board_id,
                is_onboarding_starter=True,
            )
            now = _now()
            row.status = 'in_progress'
            row.template = template
            row.starter_board_id = board.id
            row.started_at = row.started_at or now
            row.step_board_created_at = row.step_board_created_at or now
            _record_event(row.user_id, 'started', step='board_created', template=template)
            db.session.commit()
            return row, board
        except IntegrityError:
            # A concurrent tab/device won the insert race.  Return the winner.
            db.session.rollback()
            row = UserOnboarding.query.filter_by(user_id=str(user_id)).first()
            board = db.session.get(Board, board_id)
            return row, board

    @staticmethod
    def skip(user_id, reason='question'):
        if not OnboardingService.is_enabled():
            raise OnboardingDisabledError('Onboarding is disabled')
        row = OnboardingService.get_row(user_id)
        if not row:
            raise OnboardingStateError('Onboarding is not available for this account')
        if row.status in ('completed', 'not_applicable'):
            raise OnboardingStateError('Onboarding has already been decided')
        if row.status == 'skipped':
            return row
        row.status = 'skipped'
        row.skipped_at = _now()
        _record_event(row.user_id, 'skipped', step=reason if reason in ('question', 'checklist') else None, template=row.template)
        db.session.commit()
        return row

    @staticmethod
    def mark_coach_mark(user_id, mark_id):
        if mark_id not in COACH_MARK_IDS:
            raise ValueError('Unknown coach mark')
        row = OnboardingService.ensure_row(user_id, status='not_applicable')
        seen = row.seen_coach_marks
        if mark_id not in seen:
            row.coach_marks_seen = seen + [mark_id]
            _record_event(row.user_id, 'coach_mark_seen', step=mark_id, template=row.template)
            db.session.commit()
        return row

    @staticmethod
    def mark_education(user_id, version, dismiss_banner=False):
        row = OnboardingService.ensure_row(user_id, status='not_applicable')
        changed = False
        if isinstance(version, int) and version > (row.whats_new_seen_version or 0):
            row.whats_new_seen_version = version
            changed = True
        if dismiss_banner and not row.tour_banner_dismissed_at:
            row.tour_banner_dismissed_at = _now()
            changed = True
        if changed:
            _record_event(row.user_id, 'education_seen', template=row.template)
            db.session.commit()
        return row

    @staticmethod
    def start_replay(user_id):
        row = OnboardingService.ensure_row(user_id, status='not_applicable')
        row.replay_started_at = _now()
        _record_event(row.user_id, 'replay_started', template=row.template)
        db.session.commit()
        return row

    @staticmethod
    def record_task_created(task, actor_id):
        """Latch step 2/3 when the user creates a task on their starter board."""
        if not actor_id or not task:
            return
        row = OnboardingService.get_row(actor_id)
        if not row or row.status != 'in_progress' or not row.starter_board_id:
            return
        if str(task.board_id) != str(row.starter_board_id):
            return

        now = _now()
        changed = False
        if not row.step_task_created_at:
            row.step_task_created_at = now
            _record_event(row.user_id, 'step_completed', step='task_created', template=row.template)
            changed = True
        if task.is_done and not row.step_task_completed_at:
            row.step_task_completed_at = now
            _record_event(row.user_id, 'step_completed', step='task_completed', template=row.template)
            changed = True
        if _complete_if_ready(row):
            changed = True
        if changed:
            db.session.flush()

    @staticmethod
    def record_task_completed(task, actor_id):
        """Latch step 3 when the user moves a starter-board card into Done."""
        if not actor_id or not task:
            return
        row = OnboardingService.get_row(actor_id)
        if not row or row.status != 'in_progress' or not row.starter_board_id:
            return
        if str(task.board_id) != str(row.starter_board_id):
            return

        board = db.session.get(Board, task.board_id)
        if not board:
            return
        from app.utils.column_utils import is_done_column
        done = is_done_column(board.columns, task.status) or str(task.status).lower().strip() in ('done', 'completed')
        if not done:
            return

        if not row.step_task_completed_at:
            row.step_task_completed_at = _now()
            _record_event(row.user_id, 'step_completed', step='task_completed', template=row.template)
        _complete_if_ready(row)
        db.session.flush()
