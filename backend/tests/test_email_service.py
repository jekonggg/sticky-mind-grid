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
