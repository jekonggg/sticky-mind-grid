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


def test_new_unverified_user_login_strictly_blocked_with_403(client):
    """
    New accounts created after release must verify email before logging in.
    Attempting login returns 403 without issuing a JWT access token.
    """
    from app.services.email_service import EmailService, ConsoleEmailProvider
    EmailService.set_provider(ConsoleEmailProvider())
    ConsoleEmailProvider.clear_outbox()

    # 1. Register new user
    resp = client.post("/api/auth/register", json={
        "email": "new_blocked@example.com",
        "password": "Password123!",
        "fullName": "New Blocked User"
    })
    assert resp.status_code == 201

    # 2. Attempt login
    login_resp = client.post("/api/auth/login", json={
        "email": "new_blocked@example.com",
        "password": "Password123!"
    })
    assert login_resp.status_code == 403
    data = login_resp.get_json()
    assert "token" not in data
    assert data["emailVerified"] is False
    assert data["canSignUpAgain"] is True
    assert "verify your email" in data["message"].lower()


def test_legacy_unverified_user_can_login_before_deadline(client, create_test_user):
    """
    Legacy accounts created before release are grandfathered in before their deadline.
    They receive a valid JWT and their user object includes legacyUnverified: True.
    """
    from datetime import datetime, timedelta
    user = create_test_user(email="legacy_user@example.com", password="Password123!", email_verified=False)
    user.legacy_unverified = True
    user.legacy_deadline = datetime.utcnow() + timedelta(days=20)
    db.session.commit()

    login_resp = client.post("/api/auth/login", json={
        "email": "legacy_user@example.com",
        "password": "Password123!"
    })
    assert login_resp.status_code == 200
    data = login_resp.get_json()
    assert "token" in data
    assert data["user"]["legacyUnverified"] is True
    assert data["user"]["legacyDeadline"] is not None


def test_legacy_unverified_user_blocked_after_deadline(client, create_test_user):
    """
    Once the 30-day legacy deadline expires, legacy unverified users are blocked with 403
    and prompted to link a verified email address to restore their account.
    """
    from datetime import datetime, timedelta
    user = create_test_user(email="legacy_expired@example.com", password="Password123!", email_verified=False)
    user.legacy_unverified = True
    user.legacy_deadline = datetime.utcnow() - timedelta(days=2)
    db.session.commit()

    login_resp = client.post("/api/auth/login", json={
        "email": "legacy_expired@example.com",
        "password": "Password123!"
    })
    assert login_resp.status_code == 403
    data = login_resp.get_json()
    assert "token" not in data
    assert data["legacyExpired"] is True
    assert "deadline has passed" in data["message"].lower()


def test_link_email_flow_verifies_and_clears_legacy_status(client, create_test_user):
    """
    Link email flow sends a single-use token to the new address.
    Validating the token marks account verified, updates email, and clears legacy flags.
    Dispatches confirmation to new email and alert to old email.
    """
    from app.services.email_service import EmailService, ConsoleEmailProvider
    EmailService.set_provider(ConsoleEmailProvider())
    ConsoleEmailProvider.clear_outbox()

    user = create_test_user(email="old_legacy@example.com", password="Password123!", email_verified=False)
    user.legacy_unverified = True
    db.session.commit()

    # 1. Request link email (unauthenticated recovery mode with credentials)
    req_resp = client.post("/api/auth/link-email/request", json={
        "originalEmail": "old_legacy@example.com",
        "password": "Password123!",
        "newEmail": "new_verified@example.com"
    })
    assert req_resp.status_code == 200

    outbox = ConsoleEmailProvider.get_outbox()
    assert len(outbox) == 1
    assert outbox[0]["to"] == "new_verified@example.com"
    token = user.pending_email_token
    assert token is not None

    ConsoleEmailProvider.clear_outbox()

    # 2. Verify link email via the existing verify-email endpoint
    verify_resp = client.post("/api/auth/verify-email", json={"token": token})
    assert verify_resp.status_code == 200
    v_data = verify_resp.get_json()
    assert v_data["user"]["email"] == "new_verified@example.com"
    assert v_data["user"]["emailVerified"] is True
    assert v_data["user"]["legacyUnverified"] is False
    assert v_data["user"]["legacyDeadline"] is None

    # Check notification emails dispatched
    outbox2 = ConsoleEmailProvider.get_outbox()
    assert len(outbox2) == 2
    recipients = [m["to"] for m in outbox2]
    assert "new_verified@example.com" in recipients
    assert "old_legacy@example.com" in recipients


def test_duplicate_register_resends_verification_without_overwriting_password(client):
    """
    Requirement 6: Duplicate sign-up with an unverified email resends verification.
    Never overwrites password, name, or existing account data.
    """
    from app.services.email_service import EmailService, ConsoleEmailProvider
    EmailService.set_provider(ConsoleEmailProvider())
    ConsoleEmailProvider.clear_outbox()

    # 1. First registration
    client.post("/api/auth/register", json={
        "email": "dup_test@example.com",
        "password": "OriginalPassword1!",
        "fullName": "Original Name"
    })
    user = User.query.filter_by(email="dup_test@example.com").first()
    orig_hash = user.password_hash

    ConsoleEmailProvider.clear_outbox()

    # 2. Re-register with different password
    dup_resp = client.post("/api/auth/register", json={
        "email": "dup_test@example.com",
        "password": "NewAttemptPassword2@",
        "fullName": "Changed Name"
    })
    assert dup_resp.status_code == 200
    assert dup_resp.get_json()["emailResent"] is True

    # 3. Assert database password and name were untouched
    db.session.refresh(user)
    assert user.password_hash == orig_hash
    assert user.full_name == "Original Name"
    assert user.check_password("OriginalPassword1!") is True
    assert user.check_password("NewAttemptPassword2@") is False

    # Check verification email was resent
    outbox = ConsoleEmailProvider.get_outbox()
    assert len(outbox) == 1
    assert outbox[0]["to"] == "dup_test@example.com"


def test_notifications_and_invites_never_sent_to_unverified_legacy_email(create_test_user, create_test_board):
    """
    Requirement 5: Send all invitations and notifications to verified emails only.
    Never send to an unverified legacy email.
    """
    from app.services.board_service import BoardService
    from app.services.email_service import EmailService, ConsoleEmailProvider
    EmailService.set_provider(ConsoleEmailProvider())
    ConsoleEmailProvider.clear_outbox()

    board, owner = create_test_board(name="Strict Notification Board")
    
    # Create unverified legacy user
    legacy_user = create_test_user(email="silent_legacy@example.com", email_verified=False)
    legacy_user.legacy_unverified = True
    db.session.commit()

    ConsoleEmailProvider.clear_outbox()

    # Invite unverified legacy user to board
    res, err = BoardService.add_member(board.id, "silent_legacy@example.com", "editor", actor_id=owner.id)
    assert err is None

    # Assert NO outbound email was dispatched to silent_legacy@example.com
    outbox = ConsoleEmailProvider.get_outbox()
    assert len(outbox) == 0


def test_legacy_purge_service_archives_and_purges_only_90_days_past_deadline(create_test_user, tmp_path):
    """
    Requirement 9: Purge only accounts that stay unverified 90+ days after deadline.
    Export/archive data first. Never delete verified accounts.
    """
    from datetime import datetime, timedelta
    from app.services.legacy_purge_service import LegacyPurgeService

    # 1. Account 95 days past deadline -> Should be purged
    user_expired = create_test_user(email="to_purge@example.com", email_verified=False)
    user_expired.legacy_unverified = True
    user_expired.legacy_deadline = datetime.utcnow() - timedelta(days=95)

    # 2. Account 10 days past deadline -> Should NOT be purged (still in 90-day grace)
    user_grace = create_test_user(email="in_grace@example.com", email_verified=False)
    user_grace.legacy_unverified = True
    user_grace.legacy_deadline = datetime.utcnow() - timedelta(days=10)

    # 3. Verified account -> Never purged
    user_verified = create_test_user(email="safe_verified@example.com", email_verified=True)
    user_verified.legacy_unverified = False
    db.session.commit()

    archive_dir = str(tmp_path / "test_archives")
    purged = LegacyPurgeService.purge_unverified_legacy_accounts(grace_days=90, dry_run=False, archive_dir=archive_dir)

    purged_ids = [p["userId"] for p in purged]
    assert user_expired.id in purged_ids
    assert user_grace.id not in purged_ids
    assert user_verified.id not in purged_ids

    # Verify user_expired is deleted and verified user remains intact
    assert db.session.get(User, user_expired.id) is None
    assert db.session.get(User, user_verified.id) is not None
