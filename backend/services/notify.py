import os
import smtplib
from email.message import EmailMessage
from typing import Optional

import requests
from sqlmodel import Session

from models import Notification, NotificationType, User


def _send_email(to_email: str, subject: str, body: str) -> None:
    """Best-effort email send. No-ops (and logs) if nothing is configured, or
    fails - notifications must never block the request that triggered them.

    Prefers MailerSend's HTTP API (MAILERSEND_API_KEY) over raw SMTP: many
    PaaS free tiers (Render included) block outbound SMTP ports entirely to
    prevent spam abuse, while HTTPS is always allowed. Falls back to SMTP_*
    for providers/hosts where direct SMTP actually works."""
    if not to_email:
        return

    api_key = os.environ.get("MAILERSEND_API_KEY")
    if api_key:
        _send_via_mailersend_api(api_key, to_email, subject, body)
        return

    host = os.environ.get("SMTP_HOST")
    if not host:
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


def _send_via_mailersend_api(api_key: str, to_email: str, subject: str, body: str) -> None:
    from_email = os.environ.get("SMTP_FROM_EMAIL", "noreply@find-x.local")
    try:
        resp = requests.post(
            "https://api.mailersend.com/v1/email",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "from": {"email": from_email},
                "to": [{"email": to_email}],
                "subject": subject,
                "text": body,
            },
            timeout=10,
        )
        if resp.status_code >= 300:
            print(f"Email send to {to_email} failed: MailerSend API {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"Email send to {to_email} failed: {e!r}")


def send_email_direct(to_email: str, subject: str, body: str) -> None:
    """Public entry point for sending an email to an address with no
    corresponding User row - e.g. a mock-registry lookup for someone who
    never signed up for Find-X. Same best-effort semantics as
    send_notification's email step (never raises)."""
    _send_email(to_email, subject, body)


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
