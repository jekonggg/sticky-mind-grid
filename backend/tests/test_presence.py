import json

import pytest

from app.utils.presence import PresenceRegistry, presence


@pytest.fixture(autouse=True)
def clear_presence_registry():
    presence.clear()
    yield
    presence.clear()


def test_presence_registry_tracks_and_expires_heartbeats():
    clock = {"now": 1000.0}
    registry = PresenceRegistry(ttl_seconds=90, clock=lambda: clock["now"])

    assert registry.is_online("user-1") is False

    registry.touch("user-1")
    assert registry.is_online("user-1") is True

    clock["now"] += 91
    assert registry.is_online("user-1") is False

    registry.touch("user-1")
    registry.mark_offline("user-1")
    assert registry.is_online("user-1") is False


def test_heartbeat_requires_authentication(client):
    resp = client.post("/api/presence/heartbeat")
    assert resp.status_code == 401


def test_heartbeat_and_offline_update_presence(client, create_test_user, auth_headers):
    user = create_test_user(email="presence-user@example.com")
    headers = auth_headers(user.id)

    heartbeat_resp = client.post("/api/presence/heartbeat", headers=headers)
    assert heartbeat_resp.status_code == 200
    assert heartbeat_resp.get_json()["isOnline"] is True
    assert presence.is_online(user.id) is True
    assert user.to_dict()["isOnline"] is True

    offline_resp = client.post("/api/presence/offline", headers=headers)
    assert offline_resp.status_code == 200
    assert offline_resp.get_json()["isOnline"] is False
    assert presence.is_online(user.id) is False
    assert user.to_dict()["isOnline"] is False


def test_conversation_payload_reflects_other_user_presence(
    client, create_test_user, auth_headers
):
    user1 = create_test_user(email="presence-alice@example.com", full_name="Alice")
    user2 = create_test_user(email="presence-bob@example.com", full_name="Bob")
    user1_headers = auth_headers(user1.id)
    user2_headers = auth_headers(user2.id)

    create_resp = client.post(
        "/api/messages/conversations",
        headers=user1_headers,
        data=json.dumps({"type": "direct", "recipientId": user2.id}),
        content_type="application/json",
    )
    assert create_resp.status_code == 201
    conversation_id = create_resp.get_json()["id"]
    assert create_resp.get_json()["otherUser"]["isOnline"] is False

    client.post("/api/presence/heartbeat", headers=user2_headers)

    list_resp = client.get("/api/messages/conversations", headers=user1_headers)
    assert list_resp.status_code == 200
    conversation = next(c for c in list_resp.get_json() if c["id"] == conversation_id)
    assert conversation["otherUser"]["isOnline"] is True

    client.post("/api/presence/offline", headers=user2_headers)

    list_resp = client.get("/api/messages/conversations", headers=user1_headers)
    conversation = next(c for c in list_resp.get_json() if c["id"] == conversation_id)
    assert conversation["otherUser"]["isOnline"] is False
