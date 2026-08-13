from typing import Optional

from sqlmodel import Session, select

from models import User, UserRole, AuditLog, NotificationType
from services.ai_client import get_client, MODEL_NAME
from services.notify import send_notification, send_email_direct
from services.mock_university_db import lookup_student


def _compose_email_body(name: str, student_id: str) -> str:
    """Uses Gemini to write a short, friendly email if available; falls
    back to a fixed template otherwise, same degrade-gracefully pattern as
    every other AI-backed feature in this app."""
    fallback = (
        f"Hi {name},\n\n"
        f"Good news - a UIU student ID card matching your student ID ({student_id}) "
        f"was just found and logged on Find-X, UIU's Lost & Found system.\n\n"
        f"Please visit Room 110 (Staff Office) to collect it in person.\n\n"
        f"- Find-X, UIU Lost & Found"
    )
    client = get_client()
    if not client:
        return fallback
    try:
        prompt = f"""
Write a short, warm email (3-5 sentences, no subject line) to a UIU student
named {name} letting them know their student ID card (ID: {student_id}) was
just found and logged with Find-X, UIU's Lost & Found system. Tell them to
visit Room 110 (Staff Office) in person to collect it. Sign off as
"Find-X, UIU Lost & Found". Plain text only, no markdown.
"""
        response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
        text = response.text.strip() if response and response.text else ""
        return text or fallback
    except Exception as e:
        print(f"ID-owner email composition failed (model={MODEL_NAME}): {e!r}")
        return fallback


def notify_id_owner(session: Session, student_id: str, fast_id_item_id: Optional[int] = None) -> dict:
    """
    Runs after a FOUND ID card's number is extracted, when no existing
    in-app LOST report already matched it (that path already emails the
    reporter's registered address - this covers everyone else). Looks up
    who the ID belongs to: a registered Find-X user first (their real
    signed-up email), then a mock university registry as a stand-in for a
    real student database this app can't access during development - and
    emails them directly. Reports the outcome to admin either way.
    Best-effort: never raises, so it can't block the found-ID report that
    triggered it.
    """
    result = {"notified": False, "channel": None, "recipient": None, "name": None}

    try:
        user = session.exec(select(User).where(User.uiu_id == student_id)).first()
        if user and user.email:
            body = _compose_email_body(user.name, student_id)
            send_email_direct(user.email, "Find-X: Your Student ID Was Found", body)
            result = {"notified": True, "channel": "registered_user", "recipient": user.email, "name": user.name}
        else:
            record = lookup_student(student_id)
            if record:
                body = _compose_email_body(record["name"], student_id)
                send_email_direct(record["email"], "Find-X: Your Student ID Was Found", body)
                result = {"notified": True, "channel": "mock_registry", "recipient": record["email"], "name": record["name"]}
    except Exception as e:
        print(f"ID-owner notification failed for {student_id}: {e!r}")
        result["error"] = str(e)

    admin = session.exec(select(User).where(User.role == UserRole.ADMIN)).first()
    if admin:
        if result["notified"]:
            channel_label = "registered account" if result["channel"] == "registered_user" else "university registry lookup"
            message = f"ID {student_id} found - emailed {result['name']} via {channel_label} ({result['recipient']})."
        else:
            message = f"ID {student_id} found, but no registered user or registry match - owner could not be emailed."
        send_notification(
            session,
            user_id=admin.id,
            type=NotificationType.SYSTEM_ALERT,
            title="Agentic ID Alert",
            message=message,
            link="/admin",
        )

    log = AuditLog(
        actor_id=0,
        action_type="AGENTIC_ID_NOTIFY",
        entity_id=fast_id_item_id,
        details=f"ID {student_id}: {'notified via ' + result['channel'] if result['notified'] else 'no match found, owner not notified'}",
    )
    session.add(log)
    session.commit()

    return result
