import os
import smtplib
from email.message import EmailMessage
from typing import Optional

from sqlmodel import Session

from models import Notification, NotificationType, User


def _send_email(to_email: str, subject: str, body: str) -> None:
    """Best-effort SMTP send. No-ops (and logs) if SMTP isn't configured or fails -
    notifications must never block the request that triggered them."""
    host = os.environ.get("SMTP_HOST")
    if not host or not to_email:
        return

    port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")
    from_email = os.environ.get("SMTP_FROM_EMAIL", smtp_user or "noreply@find-x.local")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(body)

    try:
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.starttls()
            if smtp_user and smtp_pass:
                server.login(smtp_user, smtp_pass)
            server.send_message(msg)
    except Exception as e:
        print(f"Email send to {to_email} failed: {e!r}")


def send_notification(
    session: Session,
    user_id: int,
    type: NotificationType,
    title: str,
    message: str,
    link: Optional[str] = None,
) -> Notification:
    """Creates a Notification row (added to the session - caller still commits,
    same as constructing Notification(...) directly) and emails the user
    immediately if SMTP_HOST is configured; degrades to in-app-only otherwise."""
    notif = Notification(user_id=user_id, type=type, title=title, message=message, link=link)
    session.add(notif)

    user = session.get(User, user_id)
    if user and user.email:
        _send_email(user.email, f"Find-X: {title}", message)

    return notif
