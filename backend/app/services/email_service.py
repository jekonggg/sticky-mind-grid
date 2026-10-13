import os
import smtplib
import logging
from email.message import EmailMessage
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

class EmailProvider(ABC):
    @abstractmethod
    def send_email(self, to_email: str, subject: str, text_body: str, html_body: str = None) -> bool:
        pass

class ConsoleEmailProvider(EmailProvider):
    _outbox = []

    @classmethod
    def get_outbox(cls):
        return cls._outbox

    @classmethod
    def clear_outbox(cls):
        cls._outbox.clear()

    def send_email(self, to_email: str, subject: str, text_body: str, html_body: str = None) -> bool:
        message_record = {
            "to": to_email,
            "subject": subject,
            "text": text_body,
            "html": html_body or ""
        }
        self._outbox.append(message_record)
        logger.info(f"[ConsoleEmailProvider] Outbox delivery to={to_email} subject='{subject}'")
        return True

class SMTPEmailProvider(EmailProvider):
    def __init__(self, host=None, port=587, username=None, password=None, use_tls=True, from_email=None):
        self.host = host or os.environ.get("SMTP_HOST", "localhost")
        self.port = int(port or os.environ.get("SMTP_PORT", 587))
        self.username = username or os.environ.get("SMTP_USER", "")
        self.password = password or os.environ.get("SMTP_PASSWORD", "")
        self.use_tls = use_tls if use_tls is not None else (os.environ.get("SMTP_USE_TLS", "true").lower() == "true")
        self.from_email = from_email or os.environ.get("EMAIL_FROM", "noreply@stickymindgrid.com")

    def send_email(self, to_email: str, subject: str, text_body: str, html_body: str = None) -> bool:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = self.from_email
        msg["To"] = to_email
        msg.set_content(text_body)

        if html_body:
            msg.add_alternative(html_body, subtype="html")

        try:
            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                if self.use_tls:
                    server.starttls()
                if self.username and self.password:
                    server.login(self.username, self.password)
                server.send_message(msg)
            logger.info(f"[SMTPEmailProvider] Successfully sent email to {to_email}")
            return True
        except Exception as e:
            logger.error(f"[SMTPEmailProvider] Failed to send email to {to_email}: {e}")
            return False

class EmailService:
    _provider = None

    @classmethod
    def get_provider(cls) -> EmailProvider:
        if cls._provider is None:
            provider_type = os.environ.get("EMAIL_PROVIDER", "console").lower()
            if provider_type == "smtp":
                cls._provider = SMTPEmailProvider()
            else:
                cls._provider = ConsoleEmailProvider()
        return cls._provider

    @classmethod
    def set_provider(cls, provider: EmailProvider):
        cls._provider = provider

    @classmethod
    def send_email(cls, to_email: str, subject: str, text_body: str, html_body: str = None) -> bool:
        return cls.get_provider().send_email(to_email, subject, text_body, html_body)

    @classmethod
    def send_board_invitation(cls, to_email: str, board_name: str, inviter_name: str, role: str, invite_link: str = None) -> bool:
        subject = f"Invitation: Join {board_name} on Sticky Mind Grid"
        role_label = role.capitalize()
        link = invite_link or "http://localhost:8080/boards"

        text_body = (
            f"Hello,\n\n"
            f"{inviter_name} has invited you to collaborate on the board \"{board_name}\" with the role of {role_label}.\n\n"
            f"You can view and accept your invitation by navigating to:\n{link}\n\n"
            f"Note: This invitation will expire in 7 days.\n\n"
            f"— The Sticky Mind Grid Team"
        )

        html_body = (
            f"<div style='font-family: sans-serif; line-height: 1.5; color: #1e293b; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 8px;'>"
            f"<h2 style='color: #0f172a; margin-top: 0;'>Board Collaboration Invitation</h2>"
            f"<p><strong>{inviter_name}</strong> has invited you to collaborate on the board <strong>\"{board_name}\"</strong> as <strong>{role_label}</strong>.</p>"
            f"<p style='margin: 24px 0;'><a href='{link}' style='background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>View Invitation</a></p>"
            f"<p style='font-size: 13px; color: #64748b;'>This invitation expires in 7 days. If you did not expect this invitation, you can safely ignore this message.</p>"
            f"<hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;' />"
            f"<p style='font-size: 12px; color: #94a3b8;'>Sticky Mind Grid — Real-Time Kanban Workspace</p>"
            f"</div>"
        )

        return cls.send_email(to_email, subject, text_body, html_body)

    @classmethod
    def send_verification_email(cls, to_email: str, verification_token: str, verification_link: str = None) -> bool:
        subject = "Verify your email address for Sticky Mind Grid"
        link = verification_link or f"http://localhost:8080/verify-email?token={verification_token}"

        text_body = (
            f"Welcome to Sticky Mind Grid!\n\n"
            f"Please verify your email address to activate your account and access any pending board invitations:\n{link}\n\n"
            f"This link expires in 24 hours.\n\n"
            f"— The Sticky Mind Grid Team"
        )

        html_body = (
            f"<div style='font-family: sans-serif; line-height: 1.5; color: #1e293b; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 8px;'>"
            f"<h2 style='color: #0f172a; margin-top: 0;'>Confirm Your Email Address</h2>"
            f"<p>Welcome to Sticky Mind Grid! Please verify your email to secure your account and link your workspaces.</p>"
            f"<p style='margin: 24px 0;'><a href='{link}' style='background-color: #10b981; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Verify Email</a></p>"
            f"<p style='font-size: 13px; color: #64748b;'>This link will expire in 24 hours.</p>"
            f"<hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;' />"
            f"<p style='font-size: 12px; color: #94a3b8;'>Sticky Mind Grid — Real-Time Kanban Workspace</p>"
            f"</div>"
        )

        return cls.send_email(to_email, subject, text_body, html_body)
