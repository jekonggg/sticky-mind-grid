from app import db
from app.models.notification import Notification
from app.models.user import User

class NotificationService:
    @staticmethod
    def should_notify(user_id: str, notif_type: str) -> bool:
        user = db.session.get(User, user_id)
        if not user or not user.preferences:
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
    def create_notification(user_id: str, type: str, title: str, message: str, link: str = None) -> Notification:
        if not NotificationService.should_notify(user_id, type):
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
