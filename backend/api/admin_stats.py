from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from sqlalchemy import extract
from typing import List, Any
from database import get_session
from models import AuditLog, Item, ItemState, User, UserRole, Location, Category, Claim, SupportTicket, TicketStatus
from services.auth import require_role
from datetime import datetime, timedelta

RESOLUTION_ACTIONS = ["HANDOVER_DIRECT", "ROOM_110_PICKUP"]

# Groups the free-form action_type strings scattered across the routers
# into a handful of categories, purely for the log monitoring UI (filter
# dropdown + color coding) - doesn't affect anything else action_type touches.
ACTION_CATEGORIES = {
    "LOGIN": "AUTH", "REGISTER": "AUTH",
    "REPORT_ITEM": "ITEM", "STATE_CHANGE": "ITEM", "ARCHIVE_ITEM": "ITEM",
    "ADMIN_UPDATE_ITEM": "ITEM", "ADMIN_DELETE_ITEM": "ITEM",
    "REPORT_LOST_ITEM": "ITEM", "LOST_ITEM_STATUS_CHANGE": "ITEM",
    "HANDOVER_DIRECT": "HANDOVER", "ROOM_110_DROPOFF": "HANDOVER",
    "ROOM_110_PICKUP": "HANDOVER", "ROOM_110_INTAKE_QR": "HANDOVER",
    "ADMIN_UPDATE_CLAIM": "CLAIM",
    "TICKET_CREATED": "TICKET", "TICKET_RESPONDED": "TICKET",
}
# Rough severity so the UI can flag anything destructive/overriding without
# a human having to read every "details" string.
ACTION_LEVEL = {
    "ADMIN_DELETE_ITEM": "WARN",
    "ADMIN_UPDATE_ITEM": "WARN",
    "ADMIN_UPDATE_CLAIM": "WARN",
}

router = APIRouter()
admin_only = require_role(UserRole.ADMIN)

@router.get("/audit-logs", response_model=List[Any])
def get_audit_logs(
    limit: int = 100,
    category: str = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(admin_only),
):
    """Full system activity log for the admin Log Monitoring view - every
    AuditLog row (item lifecycle, claims, handovers, tickets, auth), not
    just logins. See ACTION_CATEGORIES for how action_type groups into the
    filterable categories the UI shows."""
    query = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)
    logs = session.exec(query).all()

    result = []
    for log in logs:
        log_category = ACTION_CATEGORIES.get(log.action_type, "OTHER")
        if category and category != log_category:
            continue
        actor = session.get(User, log.actor_id)
        result.append({
            "id": log.id,
            "timestamp": log.timestamp.isoformat(),
            "action_type": log.action_type,
            "category": log_category,
            "level": ACTION_LEVEL.get(log.action_type, "INFO"),
            "entity_id": log.entity_id,
            "details": log.details,
            "actor_id": actor.id if actor else log.actor_id,
            "actor_name": actor.name if actor else "System",
            "actor_uiu_id": actor.uiu_id if actor else None,
            "actor_role": actor.role if actor else None,
        })
    return result


@router.get("/login-logs", response_model=List[Any])
def get_login_logs(limit: int = 50, session: Session = Depends(get_session), current_user: User = Depends(admin_only)):
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
def get_summary_stats(session: Session = Depends(get_session), current_user: User = Depends(admin_only)):
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
        day_start = datetime.combine(target_date, datetime.min.time())
        day_end = day_start + timedelta(days=1)

        # Items found on this day
        found_on_day = session.exec(
            select(func.count(Item.id))
            .where(Item.found_at >= day_start)
            .where(Item.found_at < day_end)
        ).one()

        # Items resolved on this day
        resolved_on_day = session.exec(
            select(func.count(AuditLog.id))
            .where(AuditLog.action_type.in_(["HANDOVER_DIRECT", "ROOM_110_PICKUP"]))
            .where(AuditLog.timestamp >= day_start)
            .where(AuditLog.timestamp < day_end)
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
            location_counts.append({"id": loc.id, "name": loc.name, "count": count})

    # Category Distribution
    categories = session.exec(select(Category)).all()
    category_counts = []
    for cat in categories:
        count = session.exec(select(func.count(Item.id)).where(Item.category_id == cat.id)).one()
        if count > 0:
            category_counts.append({"id": cat.id, "name": cat.name, "count": count})


    # Claim Metrics
    total_claims = session.exec(select(func.count(Claim.id))).one()
    approved_claims = session.exec(select(func.count(Claim.id)).where(Claim.status == "APPROVED")).one()
    pending_claims = session.exec(select(func.count(Claim.id)).where(Claim.status == "PENDING")).one()
    rejected_claims = session.exec(select(func.count(Claim.id)).where(Claim.status == "REJECTED")).one()
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

    # Hourly Peaks - real distribution of when items were reported found
    hourly_stats = []
    for h in range(8, 20): # Business hours
        count = session.exec(
            select(func.count(Item.id)).where(extract('hour', Item.found_at) == h)
        ).one()
        hourly_stats.append({"hour": f"{h}:00", "count": count})

    # Time-to-resolution: delta between an item being found and its
    # HANDOVER_DIRECT/ROOM_110_PICKUP audit log entry
    resolution_logs = session.exec(
        select(AuditLog).where(AuditLog.action_type.in_(RESOLUTION_ACTIONS))
    ).all()
    resolution_hours = []
    for log in resolution_logs:
        item = session.get(Item, log.entity_id)
        if item:
            delta_hours = (log.timestamp - item.found_at).total_seconds() / 3600.0
            if delta_hours >= 0:
                resolution_hours.append(delta_hours)
    avg_resolution_hours = round(sum(resolution_hours) / len(resolution_hours), 1) if resolution_hours else None

    # Staff throughput - who's actually completing handovers
    staff_throughput_query = (
        select(User.name, func.count(AuditLog.id).label("count"))
        .join(AuditLog, AuditLog.actor_id == User.id)
        .where(AuditLog.action_type.in_(RESOLUTION_ACTIONS))
        .group_by(User.id)
        .order_by(func.count(AuditLog.id).desc())
        .limit(5)
    )
    staff_throughput = [{"name": row[0], "count": row[1]} for row in session.exec(staff_throughput_query).all()]

    # Ticket metrics
    total_tickets = session.exec(select(func.count(SupportTicket.id))).one()
    resolved_tickets = session.exec(
        select(func.count(SupportTicket.id)).where(SupportTicket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED]))
    ).one()
    ticket_resolution_rate = round(resolved_tickets / total_tickets * 100, 1) if total_tickets > 0 else 100

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
            "success_rate": round(claim_success_rate, 1),
            "approved": approved_claims,
            "pending": pending_claims,
            "rejected": rejected_claims
        },
        "avg_resolution_hours": avg_resolution_hours,
        "staff_throughput": staff_throughput,
        "ticket_stats": {
            "total": total_tickets,
            "resolved": resolved_tickets,
            "resolution_rate": ticket_resolution_rate
        }
    }
