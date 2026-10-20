import pytest
from unittest.mock import patch, MagicMock
from app import db
from app.models.user import User
from app.models.push_subscription import PushSubscription
from app.services.push_notification_service import PushNotificationService


def test_get_vapid_public_key(client, create_test_user, auth_headers):
    user = create_test_user(email="push_vapid@example.com")
    headers = auth_headers(user.id)
    res = client.get("/api/notifications/vapid-public-key", headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert "publicKey" in data
    assert len(data["publicKey"]) > 20


def test_register_and_unregister_push_subscription(client, create_test_user, auth_headers):
    user = create_test_user(email="push_sub@example.com")
    headers = auth_headers(user.id)
    payload = {
        "subscription": {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint-123",
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9Q0nA5P",
                "auth": "tBHItSIziVD-uniYZBgUxQ"
            }
        }
    }

    # 1. Register subscription
    res = client.post("/api/notifications/push-subscriptions", headers=headers, json=payload)
    assert res.status_code == 201
    data = res.get_json()
    assert data["message"] == "Push subscription registered successfully"
    assert data["subscription"]["endpoint"] == payload["subscription"]["endpoint"]

    # Verify in DB
    sub = PushSubscription.query.filter_by(user_id=user.id).first()
    assert sub is not None
    assert sub.auth == "tBHItSIziVD-uniYZBgUxQ"

    # 2. Re-registering with updated keys updates existing subscription
    payload["subscription"]["keys"]["auth"] = "updatedAuthKey123"
    res2 = client.post("/api/notifications/push-subscriptions", headers=headers, json=payload)
    assert res2.status_code == 201

    subs = PushSubscription.query.filter_by(user_id=user.id).all()
    assert len(subs) == 1
    assert subs[0].auth == "updatedAuthKey123"

    # 3. Unregister subscription
    del_res = client.delete(
        "/api/notifications/push-subscriptions",
        headers=headers,
        json={"endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint-123"}
    )
    assert del_res.status_code == 200

    sub = PushSubscription.query.filter_by(user_id=user.id).first()
    assert sub is None


def test_send_test_push_endpoint(client, create_test_user, auth_headers):
    user = create_test_user(email="push_test_user@example.com")
    headers = auth_headers(user.id)

    sub = PushSubscription(
        user_id=user.id,
        endpoint="https://fcm.googleapis.com/fcm/send/test-endpoint-456",
        p256dh="test_p256dh_key",
        auth="test_auth_key"
    )
    db.session.add(sub)
    db.session.commit()

    with patch("pywebpush.webpush") as mock_webpush:
        mock_webpush.return_value = MagicMock(status_code=201)
        res = client.post("/api/notifications/test-push", headers=headers)
        assert res.status_code == 200
        data = res.get_json()
        assert data["devicesNotified"] == 1
        assert mock_webpush.called


def test_dead_subscription_cleanup_on_410_gone(app, create_test_user):
    user = create_test_user(email="push_cleanup@example.com")
    sub = PushSubscription(
        user_id=user.id,
        endpoint="https://fcm.googleapis.com/fcm/send/dead-device",
        p256dh="test_p256dh",
        auth="test_auth"
    )
    db.session.add(sub)
    db.session.commit()
    sub_id = sub.id

    from pywebpush import WebPushException

    mock_resp = MagicMock(status_code=410)
    mock_resp.text = "Subscription has expired or is invalid."

    with patch("pywebpush.webpush", side_effect=WebPushException("410 Gone", response=mock_resp)):
        PushNotificationService.send_push_notification(
            user.id,
            {"title": "Test", "message": "Test"},
            async_dispatch=False
        )
        db.session.expire_all()
        # Verify the dead subscription was removed
        cleaned = db.session.get(PushSubscription, sub_id)
        assert cleaned is None


def test_user_cascade_deletes_push_subscriptions(app, create_test_user):
    user = create_test_user(email="push_cascade@example.com")
    sub = PushSubscription(
        user_id=user.id,
        endpoint="https://fcm.googleapis.com/fcm/send/cascade-test",
        p256dh="test_p256dh",
        auth="test_auth"
    )
    db.session.add(sub)
    db.session.commit()

    # Delete user
    u = db.session.get(User, user.id)
    db.session.delete(u)
    db.session.commit()

    # Check that subscription is cascade deleted
    remaining = PushSubscription.query.filter_by(endpoint="https://fcm.googleapis.com/fcm/send/cascade-test").first()
    assert remaining is None
