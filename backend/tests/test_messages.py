import json

def test_direct_conversation_lifecycle(client, create_test_user, auth_headers):
    user1 = create_test_user(email="alice@example.com", full_name="Alice Adams")
    user2 = create_test_user(email="bob@example.com", full_name="Bob Brown")

    # 1. Create direct conversation between user1 and user2
    resp1 = client.post(
        "/api/messages/conversations",
        headers=auth_headers(user1.id),
        data=json.dumps({
            "type": "direct",
            "recipientId": user2.id
        }),
        content_type="application/json"
    )
    assert resp1.status_code == 201
    conv_data = resp1.get_json()
    conv_id = conv_data["id"]
    assert conv_data["type"] == "direct"
    assert conv_data["participantCount"] == 2
    assert conv_data["displayTitle"] == "Bob Brown"

    # 2. Creating again from user2 to user1 should return the existing conversation
    resp2 = client.post(
        "/api/messages/conversations",
        headers=auth_headers(user2.id),
        data=json.dumps({
            "type": "direct",
            "recipientId": user1.id
        }),
        content_type="application/json"
    )
    assert resp2.status_code == 201
    assert resp2.get_json()["id"] == conv_id
    assert resp2.get_json()["displayTitle"] == "Alice Adams"

    # 3. User1 sends a message
    msg_resp1 = client.post(
        f"/api/messages/conversations/{conv_id}/messages",
        headers=auth_headers(user1.id),
        data=json.dumps({
            "content": "Hello Bob! How is the project going?"
        }),
        content_type="application/json"
    )
    assert msg_resp1.status_code == 201
    msg1 = msg_resp1.get_json()
    assert msg1["content"] == "Hello Bob! How is the project going?"
    assert msg1["senderId"] == user1.id
    msg1_id = msg1["id"]

    # 4. Check user2's unread count
    unread_resp = client.get("/api/messages/unread-count", headers=auth_headers(user2.id))
    assert unread_resp.status_code == 200
    assert unread_resp.get_json()["unreadCount"] == 1

    # 5. User2 sends a reply
    msg_resp2 = client.post(
        f"/api/messages/conversations/{conv_id}/messages",
        headers=auth_headers(user2.id),
        data=json.dumps({
            "content": "Going great! Releasing today.",
            "replyToId": msg1_id
        }),
        content_type="application/json"
    )
    assert msg_resp2.status_code == 201
    msg2 = msg_resp2.get_json()
    assert msg2["replyTo"]["id"] == msg1_id
    assert msg2["replyTo"]["content"] == "Hello Bob! How is the project going?"

    # 6. Retrieve messages in conversation
    list_msgs = client.get(
        f"/api/messages/conversations/{conv_id}/messages",
        headers=auth_headers(user2.id)
    )
    assert list_msgs.status_code == 200
    messages = list_msgs.get_json()
    assert len(messages) == 2

    # 7. User2 marks conversation as read
    read_resp = client.post(
        f"/api/messages/conversations/{conv_id}/read",
        headers=auth_headers(user2.id)
    )
    assert read_resp.status_code == 200
    unread_after = client.get("/api/messages/unread-count", headers=auth_headers(user2.id))
    assert unread_after.get_json()["unreadCount"] == 0

def test_group_conversation_and_reactions(client, create_test_user, auth_headers):
    user1 = create_test_user(email="carol@example.com", full_name="Carol Danvers")
    user2 = create_test_user(email="dave@example.com", full_name="Dave Smith")
    user3 = create_test_user(email="eve@example.com", full_name="Eve White")

    # 1. Create group conversation
    resp = client.post(
        "/api/messages/conversations",
        headers=auth_headers(user1.id),
        data=json.dumps({
            "type": "group",
            "title": "Alpha Release Team",
            "participantIds": [user2.id, user3.id]
        }),
        content_type="application/json"
    )
    assert resp.status_code == 201
    conv = resp.get_json()
    conv_id = conv["id"]
    assert conv["type"] == "group"
    assert conv["displayTitle"] == "Alpha Release Team"
    assert conv["participantCount"] == 3

    # 2. User1 sends message with attachment
    msg_resp = client.post(
        f"/api/messages/conversations/{conv_id}/messages",
        headers=auth_headers(user1.id),
        data=json.dumps({
            "content": "Check this spec doc",
            "attachments": [{
                "name": "spec.pdf",
                "url": "/api/files/spec.pdf",
                "size": 1024,
                "mimeType": "application/pdf"
            }]
        }),
        content_type="application/json"
    )
    assert msg_resp.status_code == 201
    msg = msg_resp.get_json()
    msg_id = msg["id"]
    assert len(msg["attachments"]) == 1

    # 3. User2 reacts with 👍
    react_resp = client.post(
        f"/api/messages/{msg_id}/reactions",
        headers=auth_headers(user2.id),
        data=json.dumps({"emoji": "👍"}),
        content_type="application/json"
    )
    assert react_resp.status_code == 200
    assert "👍" in react_resp.get_json()["reactions"]
    assert user2.id in react_resp.get_json()["reactions"]["👍"]

    # 4. User2 toggles 👍 again (removes it)
    react_remove = client.post(
        f"/api/messages/{msg_id}/reactions",
        headers=auth_headers(user2.id),
        data=json.dumps({"emoji": "👍"}),
        content_type="application/json"
    )
    assert react_remove.status_code == 200
    assert "👍" not in react_remove.get_json()["reactions"]

    # 5. User1 deletes the message (soft delete)
    del_resp = client.delete(f"/api/messages/{msg_id}", headers=auth_headers(user1.id))
    assert del_resp.status_code == 200
    assert del_resp.get_json()["isDeleted"] is True
    assert del_resp.get_json()["content"] == "This message was deleted"

def test_unauthorized_conversation_access(client, create_test_user, auth_headers):
    user1 = create_test_user(email="frank@example.com")
    user2 = create_test_user(email="grace@example.com")
    intruder = create_test_user(email="intruder@example.com")

    # Create private direct conversation
    resp = client.post(
        "/api/messages/conversations",
        headers=auth_headers(user1.id),
        data=json.dumps({
            "type": "direct",
            "recipientId": user2.id
        }),
        content_type="application/json"
    )
    conv_id = resp.get_json()["id"]

    # Intruder tries to get messages
    unauth_get = client.get(
        f"/api/messages/conversations/{conv_id}/messages",
        headers=auth_headers(intruder.id)
    )
    assert unauth_get.status_code == 403

    # Intruder tries to send message
    unauth_post = client.post(
        f"/api/messages/conversations/{conv_id}/messages",
        headers=auth_headers(intruder.id),
        data=json.dumps({"content": "I shouldn't be here"}),
        content_type="application/json"
    )
    assert unauth_post.status_code == 403
