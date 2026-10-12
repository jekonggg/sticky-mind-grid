from app import db
from app.models.notification import Notification
from app.models.user import User
from app.models.board_member import BoardMember
from app.utils.decorators import get_effective_role, ROLE_HIERARCHY

class NotificationService:
    @staticmethod
    def _extract_board_id(link: str = None, board_id: str = None) -> str:
        if board_id:
            return str(board_id)
        if link and link.startswith('/boards/'):
            parts = link.split('/boards/', 1)[1].split('/')
            if parts and parts[0]:
                return parts[0].split('?')[0]
        return None

    @staticmethod
    def should_notify(user_id: str, notif_type: str, board_id: str = None) -> bool:
        user = db.session.get(User, user_id)
        if not user:
            return False

        # Check board-level membership and per-board mute
        if board_id and notif_type not in ('invite', 'board_invite', 'system'):
            if get_effective_role(board_id, user_id) < ROLE_HIERARCHY['viewer']:
                return False
            bm = BoardMember.query.filter_by(
                board_id=board_id,
                user_id=str(user_id),
                status='accepted'
            ).first()
            if bm and getattr(bm, 'is_muted', False):
                return False

        if not user.preferences:
            return True
        prefs = user.preferences
        if notif_type == 'mention' and not prefs.notify_mentions:
            return False
        if notif_type == 'assignment' and not prefs.notify_assignments:
            return False
        if notif_type in ('invite', 'board_invite') and not prefs.notify_invites:
            return False
        if notif_type in ('comment', 'task_comment') and not prefs.notify_comments:
            return False
        return True

    @staticmethod
    def create_notification(
        user_id: str,
        type: str,
        title: str,
        message: str,
        link: str = None,
        board_id: str = None
    ) -> Notification:
        effective_board_id = NotificationService._extract_board_id(link=link, board_id=board_id)
        if not NotificationService.should_notify(user_id, type, board_id=effective_board_id):
            return None
        notif = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            link=link
        )
        db.session.add(notif)
        return notif

