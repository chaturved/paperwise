import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape as html_escape

from src.config import settings


class SmtpMailer:
    @staticmethod
    def _send(to_email: str, subject: str, html: str, plain: str) -> None:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        msg.attach(MIMEText(plain, "plain"))
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())

    def send_welcome(self, to_email: str, first_name: str) -> None:
        subject = "Welcome to Paperwise 👋"
        plain = f"Hi {first_name},\n\nWelcome to Paperwise! Upload a document and start chatting.\n\n{settings.APP_URL}/dashboard"
        html = f"""
<div style="background:#09090b;color:#fafafa;font-family:sans-serif;max-width:600px;margin:auto;padding:40px 32px">
  <h1 style="color:#6366f1;margin-bottom:8px">Paperwise</h1>
  <h2>Welcome, {first_name}! 👋</h2>
  <p>You're all set. Here's how to get started:</p>
  <ol>
    <li>Upload a document</li>
    <li>Ask a question</li>
    <li>Get cited answers</li>
  </ol>
  <a href="{settings.APP_URL}/dashboard" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">Open Paperwise →</a>
  <p style="color:#a1a1aa;font-size:14px">You're on the Free plan: 5 documents, 20 queries/day.</p>
  <hr style="border-color:#27272a;margin:32px 0">
  <p style="color:#52525b;font-size:12px">© 2025 Paperwise</p>
</div>"""
        self._send(to_email, subject, html, plain)

    def send_demo_request(self, to_email: str, demo_request) -> None:
        details = [
            ("Name", demo_request.name),
            ("Email", demo_request.email),
            ("Company", demo_request.company or "-"),
            ("Team size", demo_request.team_size or "-"),
            ("Message", demo_request.message or "-"),
        ]
        plain = "New demo request\n\n" + "\n".join(f"{label}: {value}" for label, value in details)
        rows = "".join(f"<p><strong>{html_escape(label)}:</strong> {html_escape(str(value))}</p>" for label, value in details)
        self._send(to_email, f"Demo request from {demo_request.name}", f"<div style='font-family:sans-serif'><h2>New demo request</h2>{rows}</div>", plain)

    def send_magic_link(self, to_email: str, token: str) -> None:
        link = f"{settings.APP_URL}/auth/magic-link/verify?token={token}"
        subject = "Your Paperwise sign-in link"
        plain = f"Click to sign in: {link}\n\nThis link expires in 15 minutes."
        html = f"""
<div style="background:#09090b;color:#fafafa;font-family:sans-serif;max-width:600px;margin:auto;padding:40px 32px">
  <h1 style="color:#6366f1;margin-bottom:8px">Paperwise</h1>
  <p>Click the button below to sign in to Paperwise.</p>
  <a href="{link}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">Sign in to Paperwise →</a>
  <p style="color:#a1a1aa;font-size:14px">This link expires in 15 minutes and can only be used once.</p>
  <p style="color:#a1a1aa;font-size:14px">If you didn't request this, you can safely ignore this email.</p>
  <hr style="border-color:#27272a;margin:32px 0">
  <p style="color:#52525b;font-size:12px">© 2025 Paperwise</p>
</div>"""
        self._send(to_email, subject, html, plain)

    def send_password_reset(self, to_email: str, token: str) -> None:
        link = f"{settings.APP_URL}/reset-password?token={token}"
        subject = "Reset your Paperwise password"
        plain = f"Reset your password: {link}\n\nThis link expires in 1 hour."
        html = f"""
<div style="background:#09090b;color:#fafafa;font-family:sans-serif;max-width:600px;margin:auto;padding:40px 32px">
  <h1 style="color:#6366f1;margin-bottom:8px">Paperwise</h1>
  <p>We received a request to reset the password for your account.</p>
  <a href="{link}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">Reset my password →</a>
  <p style="color:#a1a1aa;font-size:14px">This link expires in 1 hour.</p>
  <p style="color:#a1a1aa;font-size:14px">If you didn't request a password reset, you can safely ignore this email.</p>
  <hr style="border-color:#27272a;margin:32px 0">
  <p style="color:#52525b;font-size:12px">© 2025 Paperwise</p>
</div>"""
        self._send(to_email, subject, html, plain)
