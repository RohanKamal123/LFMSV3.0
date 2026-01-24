from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from typing import List, Any
from database import get_session
from models import AuditLog, Item, ItemState, User
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/login-logs", response_model=List[Any])
def get_login_logs(limit: int = 50, session: Session = Depends(get_session)):
    query = select(AuditLog).where(AuditLog.action_type == "LOGIN").order_by(AuditLog.timestamp.desc()).limit(limit)
    logs = session.exec(query).all()
    
    result = []
    for log in logs:
        user = session.get(User, log.actor_id)
        result.append({
            "id": log.id,
            "user_id": user.id if user else None,
            "uiu_id": user.uiu_id if user else "Unknown",
            "user_name": user.name if user else "Unknown User",
            "role": user.role if user else "UNKNOWN",
            "timestamp": log.timestamp.isoformat(),
            "details": log.details
        })
    return result

@router.get("/summary-stats")
def get_summary_stats(session: Session = Depends(get_session)):
    # Simple counts
    states = [state.value for state in ItemState]
    summary = {}
    for state in states:
        count = session.exec(select(func.count(Item.id)).where(Item.state == state)).one()
        summary[state] = count
    
    # 7-day timeline
    timeline = []
    today = datetime.now().date()
    for i in range(6, -1, -1):
        target_date = today - timedelta(days=i)
        
        # Items found on this day
        found_on_day = session.exec(
            select(func.count(Item.id))
            .where(func.date(Item.found_at) == target_date)
        ).one()
        
        # Items resolved on this day
        resolved_on_day = session.exec(
            select(func.count(AuditLog.id))
            .where(AuditLog.action_type.in_(["HANDOVER_DIRECT", "ROOM_110_PICKUP"]))
            .where(func.date(AuditLog.timestamp) == target_date)
        ).one()
        
        timeline.append({
            "date": target_date.strftime("%b %d"),
            "found": found_on_day,
            "resolved": resolved_on_day
        })
        
    return {
        "summary": summary,
        "timeline": timeline
    }
