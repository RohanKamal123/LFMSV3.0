from sqlmodel import Session, select

from conftest import make_staff_or_admin, register_student


def test_notifies_registered_user_via_their_own_email(server, db_engine):
    from services.id_owner_notifier import notify_id_owner
    from models import AuditLog

    uiu_id, _, student = register_student(server)

    with Session(db_engine) as session:
        result = notify_id_owner(session, uiu_id)
        assert result["notified"] is True
        assert result["channel"] == "registered_user"
        assert result["recipient"] == student["email"]

        log = session.exec(
            select(AuditLog).where(AuditLog.action_type == "AGENTIC_ID_NOTIFY").order_by(AuditLog.id.desc())
        ).first()
        assert log is not None
        assert uiu_id in log.details
        assert "registered_user" in log.details


def test_falls_back_to_mock_registry_for_unregistered_id(server, db_engine):
    from services.id_owner_notifier import notify_id_owner
    from services.mock_university_db import MOCK_UNIVERSITY_DB

    mock_id = next(iter(MOCK_UNIVERSITY_DB))
    expected_email = MOCK_UNIVERSITY_DB[mock_id]["email"]

    with Session(db_engine) as session:
        result = notify_id_owner(session, mock_id)
        assert result["notified"] is True
        assert result["channel"] == "mock_registry"
        assert result["recipient"] == expected_email


def test_no_match_reports_owner_not_notified(server, db_engine):
    from services.id_owner_notifier import notify_id_owner

    with Session(db_engine) as session:
        result = notify_id_owner(session, "000000000")
        assert result["notified"] is False
        assert result["recipient"] is None


def test_admin_gets_notification_regardless_of_outcome(server, db_engine):
    from services.id_owner_notifier import notify_id_owner
    from models import Notification

    # Ensure at least one admin exists to receive the report-back.
    make_staff_or_admin(db_engine, "ADMIN")

    with Session(db_engine) as session:
        notify_id_owner(session, "222222222")

        matches = session.exec(
            select(Notification).where(Notification.title == "Agentic ID Alert")
        ).all()
        assert any("222222222" in n.message for n in matches)
