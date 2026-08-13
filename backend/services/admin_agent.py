from datetime import datetime

from sqlmodel import Session, select, func
from google.genai import types

from services.ai_client import get_client, MODEL_NAME
from models import (
    Item, ItemState, Claim, SupportTicket, TicketStatus, User,
    AuditLog,
)

SYSTEM_PROMPT = """
You are the Find-X admin assistant - an internal tool for UIU Lost & Found
staff/admins, not a public chatbot. You have read access to the system's
data and a small set of write tools to act on it directly, via the
functions made available to you. Always use the tools to look up real data
before answering factual questions - never guess numbers or invent items,
claims, or tickets.

When the admin asks you to change something (resolve a ticket, archive an
item), use the matching write tool and then confirm in plain language what
you did, including the specific ID(s) affected. If a request is ambiguous
(e.g. "archive the old ones" with no ID), ask a clarifying question instead
of guessing an ID. Keep replies concise and factual - this is a working
tool, not a conversation partner.
"""


def _build_tools(session: Session, actions_taken: list):
    def get_summary_stats() -> dict:
        """Overall system counts: items by state, claims by status, tickets by status, and total registered users."""
        items_by_state = {}
        for state in ItemState:
            count = session.exec(select(func.count()).select_from(Item).where(Item.state == state)).one()
            items_by_state[state.value] = count

        claims_by_status = {}
        for status in ["PENDING", "APPROVED", "REJECTED"]:
            count = session.exec(select(func.count()).select_from(Claim).where(Claim.status == status)).one()
            claims_by_status[status] = count

        tickets_by_status = {}
        for status in TicketStatus:
            count = session.exec(select(func.count()).select_from(SupportTicket).where(SupportTicket.status == status)).one()
            tickets_by_status[status.value] = count

        total_users = session.exec(select(func.count()).select_from(User)).one()

        return {
            "items_by_state": items_by_state,
            "claims_by_status": claims_by_status,
            "tickets_by_status": tickets_by_status,
            "total_users": total_users,
        }

    def search_items(query: str = "", state: str = "") -> list:
        """Search found items by title substring and/or exact state (e.g. ACTIVE, PENDING_HANDOVER, RESOLVED). Leave a field blank to not filter on it. Returns up to 20 matches with id, title, state, and finder_id."""
        stmt = select(Item)
        if query:
            stmt = stmt.where(Item.title.contains(query))
        if state:
            try:
                stmt = stmt.where(Item.state == ItemState(state))
            except ValueError:
                return [{"error": f"'{state}' is not a valid item state"}]
        items = session.exec(stmt.limit(20)).all()
        return [{"id": i.id, "title": i.title, "state": i.state, "finder_id": i.finder_id} for i in items]

    def get_item_detail(item_id: int) -> dict:
        """Full detail for one found item by ID, including its private (owner-only) description."""
        item = session.get(Item, item_id)
        if not item:
            return {"error": "item not found"}
        return {
            "id": item.id, "title": item.title, "state": item.state,
            "public_description": item.public_description,
            "private_description": item.private_description,
            "finder_id": item.finder_id, "found_at": str(item.found_at),
        }

    def search_claims(status: str = "") -> list:
        """Search claims, optionally filtered by exact status (PENDING, APPROVED, REJECTED). Returns up to 20 matches."""
        stmt = select(Claim)
        if status:
            stmt = stmt.where(Claim.status == status)
        claims = session.exec(stmt.limit(20)).all()
        return [{"id": c.id, "item_id": c.item_id, "claimant_id": c.claimant_id, "status": c.status, "quiz_score": c.quiz_score} for c in claims]

    def search_tickets(status: str = "") -> list:
        """Search support tickets, optionally filtered by exact status (OPEN, IN_PROGRESS, RESOLVED, CLOSED). Returns up to 20 matches."""
        stmt = select(SupportTicket)
        if status:
            try:
                stmt = stmt.where(SupportTicket.status == TicketStatus(status))
            except ValueError:
                return [{"error": f"'{status}' is not a valid ticket status"}]
        tickets = session.exec(stmt.limit(20)).all()
        return [{"id": t.id, "subject": t.subject, "category": t.category, "status": t.status, "user_id": t.user_id} for t in tickets]

    def search_users(query: str = "") -> list:
        """Search registered users by name or UIU ID substring. Returns up to 20 matches with id, name, uiu_id, role."""
        stmt = select(User)
        if query:
            stmt = stmt.where((User.name.contains(query)) | (User.uiu_id.contains(query)))
        users = session.exec(stmt.limit(20)).all()
        return [{"id": u.id, "name": u.name, "uiu_id": u.uiu_id, "role": u.role} for u in users]

    def list_recent_audit_logs(limit: int = 10) -> list:
        """The most recent system activity log entries (item/claim/handover/ticket actions), newest first."""
        logs = session.exec(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(min(limit, 30))).all()
        return [{"action_type": l.action_type, "entity_id": l.entity_id, "details": l.details, "timestamp": str(l.timestamp)} for l in logs]

    def resolve_support_ticket(ticket_id: int, response: str) -> dict:
        """Marks a support ticket RESOLVED and records a staff response for the user to see. Use only when the admin explicitly asks to resolve/close a specific ticket with a given answer."""
        ticket = session.get(SupportTicket, ticket_id)
        if not ticket:
            return {"error": "ticket not found"}
        ticket.status = TicketStatus.RESOLVED
        ticket.staff_response = response
        ticket.resolved_at = datetime.now()
        session.add(ticket)
        session.commit()
        actions_taken.append(f"Resolved ticket #{ticket_id}")
        return {"status": "success", "ticket_id": ticket_id}

    def archive_found_item(item_id: int) -> dict:
        """Archives a found item by ID (moves it out of the active registry). Use only when the admin explicitly asks to archive a specific item."""
        item = session.get(Item, item_id)
        if not item:
            return {"error": "item not found"}
        item.state = ItemState.ARCHIVED
        session.add(item)
        session.add(AuditLog(actor_id=0, action_type="ARCHIVE_ITEM", entity_id=item_id, details="Archived by admin AI agent"))
        session.commit()
        actions_taken.append(f"Archived item #{item_id}")
        return {"status": "success", "item_id": item_id}

    return [
        get_summary_stats, search_items, get_item_detail, search_claims,
        search_tickets, search_users, list_recent_audit_logs,
        resolve_support_ticket, archive_found_item,
    ]


def ask_admin_agent(session: Session, question: str) -> dict:
    """Runs one turn of the admin AI agent: the model calls whichever read
    tools it needs to answer, and may call a write tool if the admin
    explicitly asked for an action. Returns {reply, actions_taken}.
    Best-effort: returns an "unavailable" reply (never raises) if no
    GEMINI_API_KEY is configured or the call fails."""
    client = get_client()
    if not client:
        return {"reply": "The AI assistant needs a GEMINI_API_KEY configured to run - ask the person managing deployment to set one.", "actions_taken": []}

    actions_taken: list = []
    tools = _build_tools(session, actions_taken)

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=f"{SYSTEM_PROMPT}\n\nAdmin's message: {question}",
            config=types.GenerateContentConfig(tools=tools),
        )
        reply = response.text.strip() if response and response.text else "(no response)"
    except Exception as e:
        print(f"Admin agent failed (model={MODEL_NAME}): {e!r}")
        # Tool calls (and any writes they made) run and commit as part of
        # the model's own turn, before this exception point - report what
        # actually happened rather than implying nothing did, if a tool
        # already completed before the call failed.
        if actions_taken:
            reply = "Done, but I couldn't generate a summary: " + "; ".join(actions_taken) + "."
        else:
            reply = "Something went wrong reaching the AI assistant. Please try again."
        return {"reply": reply, "actions_taken": actions_taken}

    return {"reply": reply, "actions_taken": actions_taken}
