import os
import smtplib
import logging
import json
import urllib.request
import urllib.error
from email.message import EmailMessage
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

class EmailProvider(ABC):
    @abstractmethod
    def send_email(self, to_email: str, subject: str, text_body: str, html_body: str = None, **kwargs) -> bool:
        pass

class ConsoleEmailProvider(EmailProvider):
    _outbox = []

    @classmethod
    def get_outbox(cls):
        return cls._outbox

    @classmethod
    def clear_outbox(cls):
        cls._outbox.clear()

    def send_email(self, to_email: str, subject: str, text_body: str, html_body: str = None, **kwargs) -> bool:
        message_record = {
            "to": to_email,
            "subject": subject,
            "text": text_body,
            "html": html_body or "",
            "params": kwargs
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

    def send_email(self, to_email: str, subject: str, text_body: str, html_body: str = None, **kwargs) -> bool:
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

class EmailJSEmailProvider(EmailProvider):
    """
    Sends transactional emails via EmailJS REST API over HTTPS (Port 443).
    Compatible with cloud platforms (e.g. Render Free Tier) where SMTP ports are blocked.
    """
    def __init__(self, service_id=None, template_id=None, public_key=None, private_key=None):
        self.service_id = service_id or os.environ.get("EMAILJS_SERVICE_ID", "")
        self.template_id = template_id or os.environ.get("EMAILJS_TEMPLATE_ID", "")
        self.public_key = public_key or os.environ.get("EMAILJS_PUBLIC_KEY", "")
        self.private_key = private_key or os.environ.get("EMAILJS_PRIVATE_KEY", "")

    def send_email(self, to_email: str, subject: str, text_body: str, html_body: str = None, **kwargs) -> bool:
        if not self.service_id or not self.template_id or not self.public_key:
            logger.error("[EmailJSEmailProvider] Missing EmailJS configuration (EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, or EMAILJS_PUBLIC_KEY)")
            return False

        template_params = {
            "to_email": to_email,
            "email": to_email,
            "to_name": to_email.split('@')[0],
            "subject": subject,
            "message": text_body,
            "text_message": text_body,
            "html_message": html_body or "",
            **kwargs
        }

        payload = {
            "service_id": self.service_id,
            "template_id": self.template_id,
            "user_id": self.public_key,
            "template_params": template_params
        }
        if self.private_key:
            payload["accessToken"] = self.private_key

        try:
            req = urllib.request.Request(
                "https://api.emailjs.com/api/v1.0/email/send",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "StickyMindGrid-Backend/1.0"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                status = response.getcode()
                if 200 <= status < 300:
                    logger.info(f"[EmailJSEmailProvider] Successfully sent email to {to_email} via EmailJS")
                    return True
                else:
                    logger.error(f"[EmailJSEmailProvider] Unexpected response status {status} from EmailJS")
                    return False
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8") if e.fp else str(e)
            logger.error(f"[EmailJSEmailProvider] HTTP error from EmailJS ({e.code}): {err_body}")
            return False
        except Exception as e:
            logger.error(f"[EmailJSEmailProvider] Failed to send email to {to_email} via EmailJS: {e}")
            return False

class EmailService:
    _provider = None

    @classmethod
    def get_provider(cls) -> EmailProvider:
        if cls._provider is None:
            provider_type = os.environ.get("EMAIL_PROVIDER", "console").lower()
            if provider_type == "smtp":
                cls._provider = SMTPEmailProvider()
            elif provider_type == "emailjs":
                cls._provider = EmailJSEmailProvider()
            else:
                cls._provider = ConsoleEmailProvider()
        return cls._provider

    @classmethod
    def set_provider(cls, provider: EmailProvider):
        cls._provider = provider

    @classmethod
    def send_email(cls, to_email: str, subject: str, text_body: str, html_body: str = None, **kwargs) -> bool:
        return cls.get_provider().send_email(to_email, subject, text_body, html_body, **kwargs)

    @classmethod
    def _ensure_absolute_url(cls, url: str = None, fallback_path: str = "/boards") -> str:
        """
        Ensures that an email link is an absolute URL with a scheme (http:// or https://).
        If url is a relative path (e.g. '/boards/xyz'), prepends FRONTEND_URL.
        If url is None or empty, returns FRONTEND_URL joined with fallback_path.
        """
        base_url = os.environ.get("FRONTEND_URL", "http://localhost:8080").rstrip("/")
        if not url:
            path = fallback_path if fallback_path.startswith("/") else f"/{fallback_path}"
            return f"{base_url}{path}"
        if url.startswith("http://") or url.startswith("https://"):
            return url
        path = url if url.startswith("/") else f"/{url}"
        return f"{base_url}{path}"

    @classmethod
    def send_board_invitation(cls, to_email: str, board_name: str, inviter_name: str, role: str, invite_link: str = None) -> bool:
        subject = f"Invitation: Join {board_name} on Sticky Mind Grid"
        role_label = role.capitalize()
        link = cls._ensure_absolute_url(invite_link, fallback_path="/boards")

        text_body = (
            f"Hello,\n\n"
            f"{inviter_name} has invited you to collaborate on the board \"{board_name}\" with the role of {role_label}.\n\n"
            f"You can view and accept your invitation by navigating to:\n{link}\n\n"
            f"Don't have an account yet? Simply click the link and sign up with this email address — your invitation will be waiting on your dashboard.\n\n"
            f"Note: This invitation will expire in 7 days.\n\n"
            f"— The Sticky Mind Grid Team"
        )

        html_body = (
            f"<div style='font-family: sans-serif; line-height: 1.5; color: #1e293b; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;'>"
            f"<h2 style='color: #0f172a; margin-top: 0;'>Board Collaboration Invitation</h2>"
            f"<p><strong>{inviter_name}</strong> has invited you to collaborate on the board <strong>\"{board_name}\"</strong> as <strong>{role_label}</strong>.</p>"
            f"<p style='margin: 24px 0;'><a href='{link}' style='background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>View Invitation</a></p>"
            f"<p style='font-size: 13px; color: #475569;'>Don't have an account yet? Simply click the link and sign up with this email address — your invitation will be waiting on your dashboard.</p>"
            f"<p style='font-size: 13px; color: #64748b;'>This invitation expires in 7 days. If you did not expect this invitation, you can safely ignore this message.</p>"
            f"<hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;' />"
            f"<p style='font-size: 12px; color: #94a3b8;'>Sticky Mind Grid — Real-Time Kanban Workspace</p>"
            f"</div>"
        )

        return cls.send_email(
            to_email=to_email,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
            board_name=board_name,
            inviter_name=inviter_name,
            role=role_label,
            invite_link=link
        )

    @classmethod
    def send_ownership_transfer_notice(cls, to_email: str, board_name: str, former_owner_name: str, board_link: str = None) -> bool:
        subject = f"[Sticky Mind Grid] You are now the Owner of {board_name}"
        link = cls._ensure_absolute_url(board_link, fallback_path="/boards")

        text_body = (
            f"Hello,\n\n"
            f"The previous owner ({former_owner_name}) of the board \"{board_name}\" has deleted their account.\n\n"
            f"As the oldest active administrator or team member, board ownership has been automatically transferred to you.\n\n"
            f"You now have full owner permissions, including board management, member administration, and column settings.\n\n"
            f"Access your board here:\n{link}\n\n"
            f"— The Sticky Mind Grid Team"
        )

        html_body = (
            f"<div style='font-family: sans-serif; line-height: 1.5; color: #1e293b; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;'>"
            f"<h2 style='color: #0f172a; margin-top: 0;'>Board Ownership Transferred</h2>"
            f"<p>The previous owner (<strong>{former_owner_name}</strong>) of <strong>\"{board_name}\"</strong> has deleted their account.</p>"
            f"<p>As the oldest active administrator or team member, <strong>board ownership has been automatically transferred to you</strong>. You now have full owner permissions, including member management and board administration.</p>"
            f"<p style='margin: 24px 0;'><a href='{link}' style='background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Open Board</a></p>"
            f"<hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;' />"
            f"<p style='font-size: 12px; color: #94a3b8;'>Sticky Mind Grid — Real-Time Kanban Workspace</p>"
            f"</div>"
        )

        return cls.send_email(
            to_email=to_email,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
            board_name=board_name,
            former_owner_name=former_owner_name,
            board_link=link
        )

    @classmethod
    def send_verification_email(cls, to_email: str, verification_token: str, verification_link: str = None) -> bool:
        subject = "Verify your email address for Sticky Mind Grid"
        fallback = f"/verify-email?token={verification_token}" if verification_token else "/login"
        link = cls._ensure_absolute_url(verification_link, fallback_path=fallback)

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

        return cls.send_email(
            to_email=to_email,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
            verification_token=verification_token,
            verification_link=link
        )
