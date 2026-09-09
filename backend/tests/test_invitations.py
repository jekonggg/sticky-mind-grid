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

def test_invite_unregistered_email_and_auto_attach_on_signup(client, create_test_board, auth_headers):
    from app.models.board_invitation import BoardInvitation
    board, owner = create_test_board(name="Unregistered Invite Board")
    owner_headers = auth_headers(owner.id)

    unregistered_email = "notyetregistered@example.com"

    # 1. Invite an unregistered email
    invite_res = client.post(
        f"/api/boards/{board.id}/members",
        headers=owner_headers,
        data=json.dumps({"email": unregistered_email, "role": "editor"}),
        content_type="application/json"
    )
    assert invite_res.status_code == 201
    invite_data = invite_res.get_json()
    assert invite_data["status"] == "pending"
    assert invite_data["email"] == unregistered_email

    # Verify invitation record in database
    inv = BoardInvitation.query.filter_by(board_id=board.id, email=unregistered_email).first()
    assert inv is not None
    assert inv.status == "pending"
    assert inv.expires_at is not None

    # 2. User registers with that exact verified email
    reg_res = client.post(
        "/api/auth/register",
        data=json.dumps({
            "email": unregistered_email,
            "password": "Password123!",
            "fullName": "Now Registered User"
        }),
        content_type="application/json"
    )
    assert reg_res.status_code == 201
    user_data = reg_res.get_json()
    new_user_token = user_data["token"]
    user_headers = {"Authorization": f"Bearer {new_user_token}"}

    # 3. New user sees the pending invitation
    invites_res = client.get("/api/boards/invitations", headers=user_headers)
    assert invites_res.status_code == 200
    invites = invites_res.get_json()
    assert len(invites) == 1
    assert invites[0]["boardId"] == board.id
    assert invites[0]["role"] == "editor"

    # 4. New user accepts invitation
    accept_res = client.post(f"/api/boards/{board.id}/invitations/accept", headers=user_headers)
    assert accept_res.status_code == 200
    assert accept_res.get_json()["status"] == "accepted"

    # 5. Access board
    board_res = client.get(f"/api/boards/{board.id}", headers=user_headers)
    assert board_res.status_code == 200

def test_invite_7_day_expiry_and_resend(client, create_test_user, create_test_board, auth_headers):
    from datetime import datetime, timedelta
    from app.models.board_invitation import BoardInvitation

    board, owner = create_test_board(name="Expiry Test Board")
    invitee = create_test_user(email="expiringuser@example.com")
    owner_headers = auth_headers(owner.id)
    invitee_headers = auth_headers(invitee.id)

    # 1. Send invite
    invite_res = client.post(
        f"/api/boards/{board.id}/members",
        headers=owner_headers,
        data=json.dumps({"email": invitee.email, "role": "commenter"}),
        content_type="application/json"
    )
    assert invite_res.status_code == 201

    # 2. Simulate expiration (time travel expires_at to 1 hour ago)
    inv = BoardInvitation.query.filter_by(board_id=board.id, email=invitee.email).first()
    assert inv is not None
    inv.expires_at = datetime.utcnow() - timedelta(hours=1)
    db.session.commit()

    # 3. Invitee attempting to accept expired invite is rejected
    accept_res = client.post(f"/api/boards/{board.id}/invitations/accept", headers=invitee_headers)
    assert accept_res.status_code == 400
    assert "expired" in accept_res.get_json()["error"].lower()

    # Querying invitations automatically marks it expired
    invites_res = client.get("/api/boards/invitations", headers=invitee_headers)
    assert len(invites_res.get_json()) == 0

    # 4. Admin resends the expired invitation
    resend_res = client.post(f"/api/boards/{board.id}/invitations/{inv.id}/resend", headers=owner_headers)
    assert resend_res.status_code == 200

    # Verify status is back to pending and expires_at is refreshed
    db.session.refresh(inv)
    assert inv.status == "pending"
    assert inv.expires_at > datetime.utcnow() + timedelta(days=6)

    # 5. Invitee can now accept successfully
    accept_res_2 = client.post(f"/api/boards/{board.id}/invitations/accept", headers=invitee_headers)
    assert accept_res_2.status_code == 200
    assert accept_res_2.get_json()["status"] == "accepted"

def test_accept_with_mismatched_email_rejected_http_403(client, create_test_user, create_test_board, auth_headers):
    board, owner = create_test_board(name="Security Guard Board")
    victim = create_test_user(email="intended_recipient@example.com")
    attacker = create_test_user(email="attacker_impostor@example.com")

    owner_headers = auth_headers(owner.id)
    attacker_headers = auth_headers(attacker.id)

    # 1. Owner invites victim
    client.post(
        f"/api/boards/{board.id}/members",
        headers=owner_headers,
        data=json.dumps({"email": victim.email, "role": "editor"}),
        content_type="application/json"
    )

    # 2. Attacker attempts to accept the board invitation
    attack_res = client.post(f"/api/boards/{board.id}/invitations/accept", headers=attacker_headers)
    assert attack_res.status_code == 403
    assert "mismatch" in attack_res.get_json()["error"].lower()

    # Attacker does not have board access
    access_res = client.get(f"/api/boards/{board.id}", headers=attacker_headers)
    assert access_res.status_code == 403

def test_duplicate_invite_updates_existing_record(client, create_test_user, create_test_board, auth_headers):
    from app.models.board_invitation import BoardInvitation
    board, owner = create_test_board(name="Duplicate Guard Board")
    owner_headers = auth_headers(owner.id)
    target_email = "duplicate_check@example.com"

    # 1. Send first invite as viewer
    res1 = client.post(
        f"/api/boards/{board.id}/members",
        headers=owner_headers,
        data=json.dumps({"email": target_email, "role": "viewer"}),
        content_type="application/json"
    )
    assert res1.status_code == 201

    # 2. Re-invite same email with upgraded role editor
    res2 = client.post(
        f"/api/boards/{board.id}/members",
        headers=owner_headers,
        data=json.dumps({"email": target_email, "role": "editor"}),
        content_type="application/json"
    )
    assert res2.status_code == 201

    # Verify only ONE invitation record exists and role is updated to editor
    all_invites = BoardInvitation.query.filter_by(board_id=board.id, email=target_email).all()
    assert len(all_invites) == 1
    assert all_invites[0].role == "editor"
    assert all_invites[0].status == "pending"

def test_admin_revoke_pending_invite(client, create_test_user, create_test_board, auth_headers):
    from app.models.board_invitation import BoardInvitation
    board, owner = create_test_board(name="Revoke Board")
    target_user = create_test_user(email="revokeme@example.com")
    owner_headers = auth_headers(owner.id)
    target_headers = auth_headers(target_user.id)

    # 1. Send invite
    client.post(
        f"/api/boards/{board.id}/members",
        headers=owner_headers,
        data=json.dumps({"email": target_user.email, "role": "member"}),
        content_type="application/json"
    )

    inv = BoardInvitation.query.filter_by(board_id=board.id, email=target_user.email).first()
    assert inv.status == "pending"

    # 2. Admin revokes invitation
    revoke_res = client.delete(f"/api/boards/{board.id}/invitations/{inv.id}/revoke", headers=owner_headers)
    assert revoke_res.status_code == 200

    db.session.refresh(inv)
    assert inv.status == "revoked"

    # 3. Invitee cannot accept revoked invite
    accept_res = client.post(f"/api/boards/{board.id}/invitations/accept", headers=target_headers)
    assert accept_res.status_code in [400, 404]

def test_spam_protection_daily_invitation_rate_limit(client, create_test_board, auth_headers):
    from datetime import datetime
    from app.models.board_invitation import BoardInvitation
    board, owner = create_test_board(name="Rate Limit Board")
    owner_headers = auth_headers(owner.id)

    # Pre-seed 20 sent invitations for owner in the last 24 hours
    for i in range(20):
        db.session.add(BoardInvitation(
            board_id=board.id,
            email=f"seeded_rate_{i}@example.com",
            inviter_id=owner.id,
            role="viewer"
        ))
    db.session.commit()

    # 21st invitation from the same user should be blocked by rate limit
    blocked_res = client.post(
        f"/api/boards/{board.id}/members",
        headers=owner_headers,
        data=json.dumps({"email": "twentyfirst@example.com", "role": "viewer"}),
        content_type="application/json"
    )
    assert blocked_res.status_code == 400
    assert "Daily invitation limit reached" in blocked_res.get_json()["error"]

