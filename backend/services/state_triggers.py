from sqlmodel import Session, select
from models import Item, ItemState, Notification, NotificationType
from datetime import datetime, timedelta

def update_stale_items(session: Session):
    """
    Checks for items that have exceeded their state time limits and transitions them.
    Should be called periodically or during browse/dashboard loads.
    """
    now = datetime.now()
    
    # 1. PENDING_HANDOVER -> OVERDUE_SUBMISSION (72 hours)
    overdue_limit = now - timedelta(hours=72)
    statement_overdue = select(Item).where(
        Item.state == ItemState.PENDING_HANDOVER,
        Item.state_updated_at < overdue_limit
    )
    overdue_items = session.exec(statement_overdue).all()
    
    for item in overdue_items:
        item.state = ItemState.OVERDUE_SUBMISSION
        item.state_updated_at = now
        session.add(item)
        
        # Send Late Notification to Finder
        if item.finder_id:
            notif = Notification(
                user_id=item.finder_id,
                type=NotificationType.SYSTEM_ALERT,
                title="LATE ALERT: Action Required",
                message=f"Drop-off deadline exceeded for '{item.title}'. Please return it to Room 110 immediately.",
                link="/dashboard"
            )
            session.add(notif)

    # 2. RESOLVED -> ARCHIVED (30 days)
    archive_limit = now - timedelta(days=30)
    statement_archive = select(Item).where(
        Item.state == ItemState.RESOLVED,
        Item.state_updated_at < archive_limit
    )
    resolved_items = session.exec(statement_archive).all()
    
    for item in resolved_items:
        item.state = ItemState.ARCHIVED
        item.state_updated_at = now
        session.add(item)

    session.commit()
