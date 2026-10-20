import json
import logging
import threading
from flask import current_app
from app import db
from app.models.push_subscription import PushSubscription
from app.models.user import User

logger = logging.getLogger(__name__)

# Global cached Vapid instance for when keys are auto-generated or loaded
_vapid_instance = None
_vapid_public_b64 = None
_vapid_lock = threading.Lock()


class PushNotificationService:
    @staticmethod
    def get_vapid_keys(app=None):
        """
        Retrieves or initializes the VAPID keypair.
        Returns tuple of (vapid_instance, public_key_base64url, claim_email).
        """
        global _vapid_instance, _vapid_public_b64
        cfg = (app.config if app else current_app.config) if (app or current_app) else {}

        pub_configured = cfg.get('VAPID_PUBLIC_KEY')
        priv_configured = cfg.get('VAPID_PRIVATE_KEY')
        claim_email = cfg.get('VAPID_CLAIM_EMAIL') or 'admin@stickymindgrid.com'

        with _vapid_lock:
            if _vapid_instance is not None and _vapid_public_b64 is not None:
                return _vapid_instance, _vapid_public_b64, claim_email

            try:
                from py_vapid import Vapid, b64urlencode
                from cryptography.hazmat.primitives import serialization
            except ImportError as ie:
                logger.error(f"py_vapid or cryptography is not installed: {ie}")
                return None, None, claim_email

            if priv_configured:
                try:
                    # Try loading from PEM string
                    if priv_configured.strip().startswith('-----BEGIN'):
                        v = Vapid.from_pem(priv_configured.encode('utf-8'))
                    else:
                        v = Vapid.from_string(private_key=priv_configured)
                    _vapid_instance = v
                    raw_pub = v.public_key.public_bytes(
                        serialization.Encoding.X962,
                        serialization.PublicFormat.UncompressedPoint
                    )
                    _vapid_public_b64 = pub_configured or b64urlencode(raw_pub)
                    return _vapid_instance, _vapid_public_b64, claim_email
                except Exception as e:
                    logger.warning(f"Failed to load configured VAPID keys, generating fallback: {e}")

            # Generate fresh ephemeral / dev keys
            v = Vapid()
            v.generate_keys()
            _vapid_instance = v
            raw_pub = v.public_key.public_bytes(
                serialization.Encoding.X962,
                serialization.PublicFormat.UncompressedPoint
            )
            _vapid_public_b64 = b64urlencode(raw_pub)
            return _vapid_instance, _vapid_public_b64, claim_email

    @staticmethod
    def get_public_key(app=None) -> str:
        """Returns the URL-safe base64 VAPID public key for frontend subscription."""
        _, pub_key, _ = PushNotificationService.get_vapid_keys(app)
        return pub_key or ""

    @staticmethod
    def save_subscription(user_id: str, subscription_info: dict, user_agent: str = None):
        """
        Saves or updates a Web Push subscription for a user.
        subscription_info should contain: endpoint, keys: { p256dh, auth }
        """
        if not user_id or not subscription_info:
            return None, "Missing user_id or subscription_info"

        endpoint = subscription_info.get('endpoint')
        keys = subscription_info.get('keys', {})
        p256dh = keys.get('p256dh')
        auth = keys.get('auth')

        if not endpoint or not p256dh or not auth:
            return None, "Invalid subscription payload (endpoint, p256dh, auth required)"

        user = db.session.get(User, user_id)
        if not user:
            return None, "User not found"

        sub = PushSubscription.query.filter_by(user_id=user_id, endpoint=endpoint).first()
        if sub:
            sub.p256dh = p256dh
            sub.auth = auth
            sub.user_agent = user_agent or sub.user_agent
        else:
            sub = PushSubscription(
                user_id=user_id,
                endpoint=endpoint,
                p256dh=p256dh,
                auth=auth,
                user_agent=user_agent
            )
            db.session.add(sub)

        db.session.commit()
        return sub, None

    @staticmethod
    def remove_subscription(user_id: str, endpoint: str):
        """Removes a push subscription by endpoint for a user."""
        if not endpoint:
            return False, "Missing endpoint"

        sub = PushSubscription.query.filter_by(user_id=user_id, endpoint=endpoint).first()
        if sub:
            db.session.delete(sub)
            db.session.commit()
            return True, None
        return False, "Subscription not found"

    @staticmethod
    def get_user_subscriptions(user_id: str):
        """Returns all push subscriptions for a user."""
        return PushSubscription.query.filter_by(user_id=user_id).all()

    @staticmethod
    def send_push_notification(user_id: str, payload: dict, async_dispatch: bool = True):
        """
        Dispatches a push notification payload to all active registered devices of user_id.
        Payload format:
        {
            "id": "notif-uuid",
            "title": "Title",
            "message": "Body",
            "link": "/boards/123",
            "type": "mention",
            "tag": "task-uuid"
        }
        """
        subscriptions = PushNotificationService.get_user_subscriptions(user_id)
        if not subscriptions:
            return 0

        # Snapshot subscription models to dicts before spawning background thread
        sub_snapshots = [
            {
                "id": sub.id,
                "endpoint": sub.endpoint,
                "p256dh": sub.p256dh,
                "auth": sub.auth
            }
            for sub in subscriptions
        ]

        app = current_app._get_current_object()

        def _dispatch_worker():
            with app.app_context():
                try:
                    import pywebpush
                    from pywebpush import WebPushException
                except ImportError:
                    logger.warning("pywebpush not installed, skipping push dispatch")
                    return

                vapid_inst, _, claim_email = PushNotificationService.get_vapid_keys(app)
                dead_subscription_ids = []

                for item in sub_snapshots:
                    sub_info = {
                        "endpoint": item["endpoint"],
                        "keys": {
                            "p256dh": item["p256dh"],
                            "auth": item["auth"]
                        }
                    }
                    try:
                        pywebpush.webpush(
                            subscription_info=sub_info,
                            data=json.dumps(payload),
                            vapid_private_key=vapid_inst,
                            vapid_claims={"sub": f"mailto:{claim_email}"},
                            ttl=86400
                        )
                    except WebPushException as ex:
                        status_code = getattr(ex, 'status_code', None) or (getattr(ex.response, 'status_code', None) if getattr(ex, 'response', None) else None)
                        if status_code in (404, 410):
                            # Device unregistered or subscription revoked -> queue for cleanup
                            dead_subscription_ids.append(item["id"])
                        else:
                            logger.info(f"Push notification failed for endpoint: {ex}")
                    except Exception as ex:
                        logger.warning(f"Unexpected error sending web push: {ex}")

                if dead_subscription_ids:
                    try:
                        to_delete = PushSubscription.query.filter(
                            PushSubscription.id.in_(dead_subscription_ids)
                        ).all()
                        for s in to_delete:
                            db.session.delete(s)
                        db.session.commit()
                        logger.info(f"Cleaned up {len(dead_subscription_ids)} expired push subscriptions")
                    except Exception as ex:
                        logger.warning(f"Failed to cleanup expired push subscriptions: {ex}")
                        db.session.rollback()

        if async_dispatch:
            thread = threading.Thread(target=_dispatch_worker, daemon=True)
            thread.start()
        else:
            _dispatch_worker()

        return len(sub_snapshots)
