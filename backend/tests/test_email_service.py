import pytest
import json
from unittest.mock import MagicMock, patch
from app import db
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.user import User

def test_email_service_console_provider_captures_sent_messages():
    """
    EmailService using ConsoleEmailProvider should record sent emails in outbox
    and support basic templating/delivery.
    """
    from app.services.email_service import EmailService, ConsoleEmailProvider

    EmailService.set_provider(ConsoleEmailProvider())
    ConsoleEmailProvider.clear_outbox()

    success = EmailService.send_email(
        to_email="colleague@example.com",
        subject="Welcome to Sticky Mind Grid",
        text_body="You have been invited.",
        html_body="<p>You have been invited.</p>"
    )

    assert success is True
    outbox = ConsoleEmailProvider.get_outbox()
    assert len(outbox) == 1
    assert outbox[0]["to"] == "colleague@example.com"
    assert outbox[0]["subject"] == "Welcome to Sticky Mind Grid"
    assert "You have been invited." in outbox[0]["text"]
    assert "<p>You have been invited.</p>" in outbox[0]["html"]

def test_email_service_smtp_provider_dispatches_via_smtplib():
    """
    EmailService using SMTPEmailProvider connects via smtplib and sends mime message.
    """
    from app.services.email_service import EmailService, SMTPEmailProvider

    smtp_provider = SMTPEmailProvider(
        host="smtp.example.com",
        port=587,
        username="smtp_user",
        password="smtp_password",
        use_tls=True,
        from_email="noreply@example.com"
    )

    with patch("smtplib.SMTP") as mock_smtp:
        mock_instance = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_instance

        success = smtp_provider.send_email(
            to_email="target@example.com",
            subject="Test Subject",
            text_body="Test Body",
            html_body="<p>Test Body</p>"
        )

        assert success is True
        mock_smtp.assert_called_once_with("smtp.example.com", 587, timeout=10)
        mock_instance.starttls.assert_called_once()
        mock_instance.login.assert_called_once_with("smtp_user", "smtp_password")
        mock_instance.send_message.assert_called_once()

def test_board_invite_and_resend_dispatches_invitation_email(client, create_test_user, auth_headers):
    """
    Calling POST /api/boards/<board_id>/members and resend-invite should trigger
    outbound invitation emails via EmailService.
    """
    from app.services.email_service import EmailService, ConsoleEmailProvider

    EmailService.set_provider(ConsoleEmailProvider())
    ConsoleEmailProvider.clear_outbox()

    owner = create_test_user(email="owner_invite@example.com", full_name="Board Admin")
    board = Board(name="Marketing Roadmap", owner_id=owner.id, columns=[{"id": "c1", "title": "Todo"}])
    db.session.add(board)
    db.session.commit()
    db.session.add(BoardMember(board_id=board.id, user_id=owner.id, role='owner', status='accepted'))
    db.session.commit()

    # 1. Invite a new user
    invitee_email = "newbie@example.com"
    resp = client.post(
        f"/api/boards/{board.id}/members",
        headers=auth_headers(owner.id),
        data=json.dumps({"email": invitee_email, "role": "editor"}),
        content_type="application/json"
    )
    assert resp.status_code == 201

    outbox = ConsoleEmailProvider.get_outbox()
    assert len(outbox) == 1
    assert outbox[0]["to"] == invitee_email
    assert "Marketing Roadmap" in outbox[0]["subject"]
    assert "Board Admin" in outbox[0]["text"]
    assert "editor" in outbox[0]["text"].lower()

    # 2. Resend invitation
    ConsoleEmailProvider.clear_outbox()
    inv_id = resp.get_json()["id"]
    resend_resp = client.post(
        f"/api/boards/{board.id}/invitations/{inv_id}/resend",
        headers=auth_headers(owner.id)
    )
    assert resend_resp.status_code == 200

    outbox_resend = ConsoleEmailProvider.get_outbox()
    assert len(outbox_resend) == 1
    assert outbox_resend[0]["to"] == invitee_email
    assert "Marketing Roadmap" in outbox_resend[0]["subject"]

def test_email_service_emailjs_provider_dispatches_via_http():
    """
    EmailJSEmailProvider dispatches a JSON POST payload to the EmailJS REST API over HTTPS.
    """
    from app.services.email_service import EmailJSEmailProvider

    provider = EmailJSEmailProvider(
        service_id="service_test123",
        template_id="template_test456",
        public_key="public_key_789",
        private_key="access_token_abc"
    )

    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_response = MagicMock()
        mock_response.getcode.return_value = 200
        mock_urlopen.return_value.__enter__.return_value = mock_response

        success = provider.send_email(
            to_email="colleague@example.com",
            subject="Test Board Invitation",
            text_body="Join my board",
            html_body="<p>Join my board</p>",
            board_name="Design Sprint",
            inviter_name="Alice",
            role="Editor",
            invite_link="https://app.example.com/boards"
        )

        assert success is True
        mock_urlopen.assert_called_once()
        req = mock_urlopen.call_args[0][0]
        assert req.get_full_url() == "https://api.emailjs.com/api/v1.0/email/send"
        assert req.get_method() == "POST"

        payload = json.loads(req.data.decode("utf-8"))
        assert payload["service_id"] == "service_test123"
        assert payload["template_id"] == "template_test456"
        assert payload["user_id"] == "public_key_789"
        assert payload["accessToken"] == "access_token_abc"
        assert payload["template_params"]["to_email"] == "colleague@example.com"
        assert payload["template_params"]["board_name"] == "Design Sprint"
        assert payload["template_params"]["inviter_name"] == "Alice"
        assert payload["template_params"]["role"] == "Editor"
        assert payload["template_params"]["invite_link"] == "https://app.example.com/boards"

def test_email_service_emailjs_provider_fails_on_missing_config():
    """
    EmailJSEmailProvider should safely log and return False if config is missing.
    """
    from app.services.email_service import EmailJSEmailProvider

    provider = EmailJSEmailProvider(service_id="", template_id="", public_key="")
    success = provider.send_email(
        to_email="test@example.com",
        subject="Test",
        text_body="Hello"
    )
    assert success is False

def test_board_service_invite_member_dispatches_email_with_deep_invite_link(create_test_user, create_test_board):
    from app.services.board_service import BoardService
    from app.services.email_service import EmailService, ConsoleEmailProvider
    from app.models.board_invitation import BoardInvitation

    EmailService.set_provider(ConsoleEmailProvider())
    ConsoleEmailProvider.clear_outbox()

    board, owner = create_test_board(name="Deep Link Test Board")
    target_email = "deep_link_user@example.com"

    res, err = BoardService.add_member(board.id, target_email, "editor", actor_id=owner.id)
    assert err is None

    inv = BoardInvitation.query.filter_by(board_id=board.id, email=target_email).first()
    assert inv is not None

    outbox = ConsoleEmailProvider.get_outbox()
    assert len(outbox) == 1
    sent_mail = outbox[0]
    assert sent_mail["to"] == target_email
    expected_link = f"/invite/{inv.id}"
    assert expected_link in sent_mail["text"]
    assert expected_link in sent_mail["html"]

