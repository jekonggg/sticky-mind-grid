import json
from app import db
from app.models.board_member import BoardMember
from app.models.notification import Notification

def test_invitation_lifecycle(client, create_test_user, create_test_board, auth_headers):
    board, owner = create_test_board(name="Invite Test Project")
    invitee = create_test_user(email="invitee@example.com", full_name="Invitee User")

    owner_headers = auth_headers(owner.id)
    invitee_headers = auth_headers(invitee.id)

    # 1. Owner invites Invitee
    invite_res = client.post(
        f"/api/boards/{board.id}/members",
        headers=owner_headers,
        data=json.dumps({"email": invitee.email, "role": "member"}),
        content_type="application/json"
    )
    assert invite_res.status_code == 201
    mem_data = invite_res.get_json()
    assert mem_data["status"] == "pending"

    # 2. Invitee queries pending invitations
    invites_res = client.get("/api/boards/invitations", headers=invitee_headers)
    assert invites_res.status_code == 200
    invites = invites_res.get_json()
    assert len(invites) == 1
    assert invites[0]["boardId"] == board.id
    assert invites[0]["role"] == "member"

    # 3. Invitee accepts the invitation
    accept_res = client.post(f"/api/boards/{board.id}/invitations/accept", headers=invitee_headers)
    assert accept_res.status_code == 200
    accepted_data = accept_res.get_json()
    assert accepted_data["status"] == "accepted"

    # 4. Invitee now has access to the board
    board_res = client.get(f"/api/boards/{board.id}", headers=invitee_headers)
    assert board_res.status_code == 200

    # 5. Verify notifications were generated
    # Notification for invitee (board_invite)
    invitee_notif = Notification.query.filter_by(user_id=invitee.id, type="board_invite").first()
    assert invitee_notif is not None

    # Notification for owner (invite_accepted)
    owner_notif = Notification.query.filter_by(user_id=owner.id, type="invite_accepted").first()
    assert owner_notif is not None

def test_decline_invitation(client, create_test_user, create_test_board, auth_headers):
    board, owner = create_test_board(name="Decline Test Board")
    declinee = create_test_user(email="declinee@example.com", full_name="Declinee User")

    owner_headers = auth_headers(owner.id)
    declinee_headers = auth_headers(declinee.id)

    # 1. Invite
    client.post(
        f"/api/boards/{board.id}/members",
        headers=owner_headers,
        data=json.dumps({"email": declinee.email, "role": "viewer"}),
        content_type="application/json"
    )

    # 2. Decline
    decline_res = client.post(f"/api/boards/{board.id}/invitations/decline", headers=declinee_headers)
    assert decline_res.status_code == 200

    # 3. Verify no pending invitations remain
    invites_res = client.get("/api/boards/invitations", headers=declinee_headers)
    assert len(invites_res.get_json()) == 0

    # 4. Owner received invite_declined notification
    owner_notif = Notification.query.filter_by(user_id=owner.id, type="invite_declined").first()
    assert owner_notif is not None

def test_voluntary_leave_and_owner_guard(client, create_test_user, create_test_board, auth_headers):
    board, owner = create_test_board(name="Leave Board Test")
    member = create_test_user(email="leavingmember@example.com", full_name="Leaving Member")

    # Add member as accepted
    db.session.add(BoardMember(board_id=board.id, user_id=member.id, role="member", status="accepted"))
    db.session.commit()

    owner_headers = auth_headers(owner.id)
    member_headers = auth_headers(member.id)

    # Test 1: Sole owner cannot leave
    owner_leave_res = client.delete(f"/api/boards/{board.id}/members/{owner.id}", headers=owner_headers)
    assert owner_leave_res.status_code == 400
    assert "cannot leave" in owner_leave_res.get_json()["error"]

    # Test 2: Member leaves voluntarily
    member_leave_res = client.delete(f"/api/boards/{board.id}/members/{member.id}", headers=member_headers)
    assert member_leave_res.status_code == 200

    # Member no longer has access
    access_res = client.get(f"/api/boards/{board.id}", headers=member_headers)
    assert access_res.status_code == 403

    # Owner received member_left notification
    owner_notif = Notification.query.filter_by(user_id=owner.id, type="member_left").first()
    assert owner_notif is not None

def test_invite_rejects_escalated_roles(client, create_test_user, create_test_board, auth_headers):
    """Admins must not be able to mint owners (or garbage roles) via invites."""
    board, owner = create_test_board(name="Role Guard Board")

    for role in ["owner", "superadmin", ""]:
        invitee = create_test_user(email=f"roleprobe_{role or 'blank'}@example.com")
        res = client.post(
            f"/api/boards/{board.id}/members",
            headers=auth_headers(owner.id),
            data=json.dumps({"email": invitee.email, "role": role}),
            content_type="application/json"
        )
        assert res.status_code == 400
        assert "Invalid role" in res.get_json()["error"]

def test_invite_accepts_valid_roles(client, create_test_user, create_test_board, auth_headers):
    board, owner = create_test_board(name="Valid Role Board")

    for role in ["admin", "member", "viewer"]:
        invitee = create_test_user(email=f"validrole_{role}@example.com")
        res = client.post(
            f"/api/boards/{board.id}/members",
            headers=auth_headers(owner.id),
            data=json.dumps({"email": invitee.email, "role": role}),
            content_type="application/json"
        )
        assert res.status_code == 201
        assert res.get_json()["role"] == role
