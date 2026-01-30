import random
from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from typing import List, Any
from database import get_session
from models import AuditLog, Item, ItemState, User, Location, Category, Claim
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
    
    # Location Distribution
    locations = session.exec(select(Location)).all()
    location_counts = []
    for loc in locations:
        count = session.exec(select(func.count(Item.id)).where(Item.location_id == loc.id)).one()
        if count > 0:
            location_counts.append({"name": loc.name, "count": count})
    
    # Category Distribution
    categories = session.exec(select(Category)).all()
    category_counts = []
    for cat in categories:
        count = session.exec(select(func.count(Item.id)).where(Item.category_id == cat.id)).one()
        if count > 0:
            category_counts.append({"name": cat.name, "count": count})
            
    # Claim Metrics
    total_claims = session.exec(select(func.count(Claim.id))).one()
    approved_claims = session.exec(select(func.count(Claim.id)).where(Claim.status == "APPROVED")).one()
    claim_success_rate = (approved_claims / total_claims * 100) if total_claims > 0 else 100
    
    # User Activity (Top Reporters)
    user_activity_query = (
        select(User.name, func.count(Item.id).label("count"))
        .join(Item, Item.finder_id == User.id)
        .group_by(User.id)
        .order_by(func.count(Item.id).desc())
        .limit(5)
    )
    user_activity = [{"name": row[0], "count": row[1]} for row in session.exec(user_activity_query).all()]

    # Hourly Peaks (Simulation of busy times)
    hourly_stats = []
    for h in range(8, 20): # Business hours
        hourly_stats.append({"hour": f"{h}:00", "count": random.randint(2, 12)})

    # Room 110 Specific Count
    room_110 = session.exec(select(Location).where(Location.name.contains("110"))).first()
    room_110_count = 0
    if room_110:
        room_110_count = session.exec(select(func.count(Item.id)).where(Item.location_id == room_110.id)).one()

    return {
        "summary": summary,
        "timeline": timeline,
        "location_counts": location_counts,
        "category_counts": category_counts,
        "user_activity": user_activity,
        "hourly_stats": hourly_stats,
        "room_110_count": room_110_count,
        "claim_stats": {
            "total": total_claims,
            "success_rate": round(claim_success_rate, 1)
        }
    }
