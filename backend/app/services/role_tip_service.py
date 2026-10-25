"""Role-aware tips for boards a user was invited to.

Role tips are intentionally separate from onboarding checklist marks.  They are
server-checked, shown once per user per board, and never suggest an action the
current role cannot perform.
"""

from datetime import datetime

from app import db
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.user_onboarding import BoardRoleTip

ROLE_LABELS = {
    'owner': 'Owner',
    'admin': 'Admin',
    'editor': 'Editor',
    'commenter': 'Commenter',
    'viewer': 'Viewer',
}

ROLE_TIPS = {
    'viewer': {
        'title': 'You have Viewer access',
        'body': 'You can read this board and open card details. Editing, commenting, and moving cards are limited to higher roles.',
        'can': ['Read cards and comments', 'Open card details'],
        'cannot': ['Create or edit cards', 'Comment or mention teammates', 'Move cards or manage columns'],
    },
    'commenter': {
        'title': 'You have Commenter access',
        'body': 'You can read the board, open cards, and join the conversation with comments and @mentions. Card edits and moves are limited to Editors and above.',
        'can': ['Read cards and comments', 'Comment and @mention teammates', 'Open card details'],
        'cannot': ['Create or edit cards', 'Move cards between columns', 'Manage columns or invite people'],
    },
    'editor': {
        'title': 'You have Editor access',
        'body': 'You can create and edit cards and drag them between columns. Inviting people and managing columns is reserved for Admins and Owners.',
        'can': ['Create and edit cards', 'Move cards between columns', 'Comment and @mention teammates'],
        'cannot': ['Invite or remove members', 'Manage board columns', 'Change member roles'],
    },
    'admin': {
        'title': 'You have Admin access',
        'body': 'You can invite people, manage board columns, and edit cards. Actions reserved for the board owner remain restricted.',
        'can': ['Invite and remove members', 'Manage board columns', 'Create, edit, and move cards'],
        'cannot': ['Change the board owner', 'Grant Admin or Owner roles'],
    },
    'owner': {
        'title': 'You are the board Owner',
        'body': 'You can invite people, manage columns, change member roles, and edit every card on this board.',
        'can': ['Invite and remove members', 'Manage board columns and member roles', 'Create, edit, and move every card'],
        'cannot': [],
    },
}


def _effective_role_name(board, user_id):
    user_id = str(user_id)
    if board.owner_id and str(board.owner_id) == user_id:
        return 'owner'
    membership = BoardMember.query.filter_by(
        board_id=board.id,
        user_id=user_id,
        status='accepted',
    ).first()
    if not membership:
        return None
    role = membership.role or 'viewer'
    if role == 'member':
        role = 'editor'
    return role if role in ROLE_TIPS else 'viewer'


class RoleTipService:
    @staticmethod
    def get_state(user_id, board_id):
        board = db.session.get(Board, board_id)
        if not board:
            return None, 'Board not found'

        role = _effective_role_name(board, user_id)
        if not role:
            # Removed users see nothing at all.
            return None, 'You do not have active access to this board'

        row = BoardRoleTip.query.filter_by(
            user_id=str(user_id), board_id=str(board.id)
        ).first()
        if not row:
            row = BoardRoleTip(
                user_id=str(user_id),
                board_id=str(board.id),
                last_known_role=role,
            )
            db.session.add(row)
            db.session.flush()

        role_change = None
        if row.last_known_role and row.last_known_role != role:
            row.role_change_from_role = row.last_known_role
            row.role_change_pending = True
            row.role_change_seen_at = None
        row.last_known_role = role

        if row.role_change_pending:
            from_role = row.role_change_from_role or 'previous role'
            role_change = {
                'fromRole': from_role,
                'toRole': role,
                'fromLabel': ROLE_LABELS.get(from_role, from_role),
                'toLabel': ROLE_LABELS.get(role, role),
                'title': 'Your board role changed',
                'message': (
                    f'Your role on this board changed from '
                    f'{ROLE_LABELS.get(from_role, from_role)} to {ROLE_LABELS.get(role, role)}.'
                ),
            }

        tip = None
        if not row.tip_seen_at:
            content = ROLE_TIPS[role]
            tip = {
                'role': role,
                'title': content['title'],
                'body': content['body'],
                'can': list(content['can']),
                'cannot': list(content['cannot']),
            }

        db.session.commit()
        return {
            'role': role,
            'roleLabel': ROLE_LABELS.get(role, role),
            'tip': tip,
            'roleChange': role_change,
        }, None

    @staticmethod
    def mark_tip_seen(user_id, board_id):
        board = db.session.get(Board, board_id)
        if not board:
            return False, 'Board not found'
        role = _effective_role_name(board, user_id)
        if not role:
            return False, 'You do not have active access to this board'
        row = BoardRoleTip.query.filter_by(
            user_id=str(user_id), board_id=str(board.id)
        ).first()
        if not row:
            row = BoardRoleTip(
                user_id=str(user_id),
                board_id=str(board.id),
                last_known_role=role,
            )
            db.session.add(row)
        if not row.tip_seen_at:
            row.tip_seen_at = datetime.utcnow()
            row.last_known_role = role
        db.session.commit()
        return True, None

    @staticmethod
    def mark_role_change_seen(user_id, board_id):
        row = BoardRoleTip.query.filter_by(
            user_id=str(user_id), board_id=str(board_id)
        ).first()
        if not row:
            return False, 'No role information for this board'
        row.role_change_pending = False
        row.role_change_seen_at = datetime.utcnow()
        db.session.commit()
        return True, None
