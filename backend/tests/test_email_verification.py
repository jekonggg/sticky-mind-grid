import pytest
from app import db
from app.models.board import Board
from app.models.board_invitation import BoardInvitation
from app.models.board_member import BoardMember
from app.models.user import User
from app.models.notification import Notification
from app.services.board_service import BoardService
from app.services.email_service import EmailService, ConsoleEmailProvider

def test_registration_does_not_autolink_pending_invites_until_verified(client, create_test_user):
    """
    OQ-17: Registration must not auto-link pending board invitations until
    the user verifies their email address via the verification token.
    """
    EmailService.set_provider(ConsoleEmailProvider())
    ConsoleEmailProvider.clear_outbox()

    # 1. Setup: Owner creates board and invites newuser@example.com
    owner = create_test_user(email="owner_oq17@example.com", full_name="Owner OQ17")
    board = Board(name="Secret OQ17 Board", owner_id=owner.id, columns=[{"id": "todo", "title": "To Do"}])
    db.session.add(board)
    db.session.commit()

    BoardService.add_member(board_id=board.id, email="newuser@example.com", role="editor", actor_id=owner.id)
    
    # Verify invite exists in pending state
    inv = BoardInvitation.query.filter_by(email="newuser@example.com", board_id=board.id).first()
    assert inv is not None
    assert inv.status == "pending"

    # Reset outbox before registration
    ConsoleEmailProvider.clear_outbox()

    # 2. Register newuser@example.com
    resp = client.post("/api/auth/register", json={
        "email": "newuser@example.com",
        "password": "SecurePassword123!",
        "fullName": "New User"
    })
    assert resp.status_code == 201
    reg_data = resp.get_json()
    assert reg_data["user"]["emailVerified"] is False

    user = User.query.filter_by(email="newuser@example.com").first()
    assert user is not None
    assert user.email_verified is False
    assert user.verification_token is not None

    # Verify verification email was dispatched
    outbox = ConsoleEmailProvider.get_outbox()
    assert len(outbox) >= 1
    assert any(m["to"] == "newuser@example.com" and "verify" in m["subject"].lower() for m in outbox)

    # 3. CRITICAL: Before verification, pending invites must NOT be auto-linked!
    membership = BoardMember.query.filter_by(board_id=board.id, user_id=user.id).first()
    assert membership is None, "Pending invite must not be auto-linked before email verification"

    notif = Notification.query.filter_by(user_id=user.id, type="board_invite").first()
    assert notif is None, "Board invite notification must not be created before email verification"

    # 4. Attempt verification with invalid token -> 400
    res_bad = client.post("/api/auth/verify-email", json={"token": "invalid-token-12345"})
    assert res_bad.status_code == 400

    # 5. Verify email with valid token -> 200
    res_ok = client.post("/api/auth/verify-email", json={"token": user.verification_token})
    assert res_ok.status_code == 200
    verify_data = res_ok.get_json()
    assert verify_data["user"]["emailVerified"] is True

    # 6. After verification, pending invites MUST be linked
    db.session.expire_all()
    membership_after = BoardMember.query.filter_by(board_id=board.id, user_id=user.id).first()
    assert membership_after is not None
    assert membership_after.role == "editor"

    notif_after = Notification.query.filter_by(user_id=user.id, type="board_invite").first()
    assert notif_after is not None

def test_resend_verification_email(client, create_test_user):
    """
    OQ-17: Users can request a new verification email if unverified.
    """
    EmailService.set_provider(ConsoleEmailProvider())
    ConsoleEmailProvider.clear_outbox()

    resp = client.post("/api/auth/register", json={
        "email": "unverified@example.com",
        "password": "SecurePassword123!",
        "fullName": "Unverified User"
    })
    assert resp.status_code == 201
    
    ConsoleEmailProvider.clear_outbox()

    # Resend verification
    res_resend = client.post("/api/auth/resend-verification", json={"email": "unverified@example.com"})
    assert res_resend.status_code == 200

    outbox = ConsoleEmailProvider.get_outbox()
    assert len(outbox) == 1
    assert outbox[0]["to"] == "unverified@example.com"
