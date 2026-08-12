from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime

from database import get_session
from models import SupportTicket, TicketCategory, TicketStatus, User, AuditLog, NotificationType
from services.notify import send_notification

router = APIRouter()

@router.post("/", response_model=SupportTicket)
def create_ticket(payload: dict, session: Session = Depends(get_session)):
    user = session.get(User, payload.get("user_id"))
    if not user:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    ticket = SupportTicket(
        user_id=payload["user_id"],
        subject=payload["subject"],
        category=payload.get("category", TicketCategory.OTHER),
        description=payload["description"],
        item_id=payload.get("item_id"),
    )
    session.add(ticket)
    session.commit()
    session.refresh(ticket)

    log = AuditLog(
        actor_id=user.id,
        action_type="TICKET_CREATED",
        entity_id=ticket.id,
        details=f"Ticket opened by {user.name}: {ticket.subject}"
    )
    session.add(log)
    session.commit()
    session.refresh(ticket)

    return ticket

@router.get("/mine/{user_id}", response_model=List[SupportTicket])
def list_my_tickets(user_id: int, session: Session = Depends(get_session)):
    return session.exec(
        select(SupportTicket).where(SupportTicket.user_id == user_id).order_by(SupportTicket.created_at.desc())
    ).all()

@router.get("/", response_model=List[SupportTicket])
def list_all_tickets(status: Optional[TicketStatus] = None, session: Session = Depends(get_session)):
    query = select(SupportTicket).order_by(SupportTicket.created_at.desc())
    if status:
        query = query.where(SupportTicket.status == status)
    return session.exec(query).all()

@router.put("/{ticket_id}/respond", response_model=SupportTicket)
def respond_to_ticket(ticket_id: int, payload: dict, session: Session = Depends(get_session)):
    ticket = session.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    staff_id = payload.get("staff_id")
    staff = session.get(User, staff_id)
    if not staff or staff.role not in ["STAFF", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only staff can respond to tickets")

    ticket.staff_response = payload.get("staff_response", ticket.staff_response)
    new_status = payload.get("status")
    if new_status:
        ticket.status = new_status
        if new_status in (TicketStatus.RESOLVED, TicketStatus.CLOSED):
            ticket.resolved_at = datetime.now()
            ticket.resolved_by = staff_id

    session.add(ticket)

    log = AuditLog(
        actor_id=staff_id,
        action_type="TICKET_RESPONDED",
        entity_id=ticket.id,
        details=f"Staff {staff.name} responded to ticket {ticket_id}, status -> {ticket.status}"
    )
    session.add(log)

    send_notification(
        session,
        user_id=ticket.user_id,
        type=NotificationType.SYSTEM_ALERT,
        title=f"Ticket Update: {ticket.subject}",
        message=ticket.staff_response or f"Your ticket status changed to {ticket.status}.",
        link="/dashboard"
    )

    session.commit()
    session.refresh(ticket)

    return ticket
