from fastapi import APIRouter, Depends, Query, HTTPException
from sqlmodel import Session, select
from typing import List, Optional, Any
from database import get_session
from models import Item, ItemState, Category, Location, LostItem, LostItemStatus, AuditLog, User, UserRole
from services.auth import get_optional_user

router = APIRouter()

from services.state_triggers import update_stale_items

# States found-only (no equivalent LostItem status) - a lost report can't
# ever be "pending handover" or "at Room 110" the way a found item can.
_FOUND_ONLY_STATES = {ItemState.PENDING_HANDOVER, ItemState.OVERDUE_SUBMISSION, ItemState.READY_FOR_PICKUP}
# Closest LostItemStatus equivalent for the found-item states that do have
# a lost-side analogue, so one "state" filter value works across both feeds.
_LOST_STATUS_EQUIVALENT = {
    ItemState.ACTIVE: LostItemStatus.ACTIVE,
    ItemState.RESOLVED: LostItemStatus.RECOVERED,
    ItemState.ARCHIVED: LostItemStatus.ARCHIVED,
}

ITEM_LOG_ACTIONS = [
    "REPORT_ITEM", "STATE_CHANGE", "ARCHIVE_ITEM", "ADMIN_UPDATE_ITEM", "ADMIN_DELETE_ITEM",
    "HANDOVER_DIRECT", "ROOM_110_DROPOFF", "ROOM_110_PICKUP", "ROOM_110_INTAKE_QR",
]
LOST_ITEM_LOG_ACTIONS = ["REPORT_LOST_ITEM", "LOST_ITEM_STATUS_CHANGE"]


@router.get("/", response_model=List[dict])
def browse_items(
    category_id: Optional[int] = None,
    location_id: Optional[int] = None,
    search: Optional[str] = None,
    state: Optional[str] = None,
    session: Session = Depends(get_session)
):
    # Lazy-check stale items on feed load
    update_stale_items(session)

    requested_state = None
    if state:
        try:
            requested_state = ItemState(state)
        except ValueError:
            requested_state = None

    # Fetch Found Items - defaults to ACTIVE (the original/only behavior)
    # when no state filter is given, so existing callers see no change.
    found_query = select(Item).where(Item.state == (requested_state or ItemState.ACTIVE))
    if category_id:
        found_query = found_query.where(Item.category_id == category_id)
    if location_id:
        found_query = found_query.where(Item.location_id == location_id)
    if search:
        found_query = found_query.where(Item.title.contains(search))

    found_items = session.exec(found_query).all()

    # Fetch Lost Items - a found-only state (e.g. READY_FOR_PICKUP) has no
    # lost-side meaning, so the lost feed is simply empty for that filter.
    lost_items = []
    if not requested_state or requested_state not in _FOUND_ONLY_STATES:
        lost_status = _LOST_STATUS_EQUIVALENT.get(requested_state, LostItemStatus.ACTIVE) if requested_state else LostItemStatus.ACTIVE
        lost_query = select(LostItem).where(LostItem.status == lost_status)
        if category_id:
            lost_query = lost_query.where(LostItem.category_id == category_id)
        if location_id:
            lost_query = lost_query.where(LostItem.location_id == location_id)
        if search:
            lost_query = lost_query.where(LostItem.title.contains(search))

        lost_items = session.exec(lost_query).all()

    # Unify Results
    unified_items = []

    for item in found_items:
        primary_img = next((img.url for img in item.images if img.is_primary), item.images[0].url if item.images else None)
        unified_items.append({
            "id": item.id,
            "title": item.title,
            "description": item.public_description,
            "category_id": item.category_id,
            "location_id": item.location_id,
            "type": "FOUND",
            "date": item.found_at,
            "state": item.state,
            "finder_id": item.finder_id,
            "contact_email": item.finder.email if item.finder else None,
            "contact_phone": item.finder.phone if item.finder else None,
            "image_url": primary_img if primary_img else None
        })

    for item in lost_items:
        primary_img = next((img.url for img in item.images if img.is_primary), item.images[0].url if item.images else None)
        unified_items.append({
            "id": item.id,
            "title": item.title,
            "description": item.description,
            "category_id": item.category_id,
            "location_id": item.location_id,
            "type": "LOST",
            "date": item.lost_at,
            "state": item.status,
            "reporter_id": item.reporter_id,
            "contact_email": item.reporter.email if item.reporter else None,
            "contact_phone": item.reporter.phone if item.reporter else None,
            "image_url": primary_img if primary_img else None
        })

    # Order by newest
    unified_items.sort(key=lambda x: x["date"], reverse=True)

    return unified_items


@router.get("/detail/{item_type}/{item_id}", response_model=dict)
def item_detail(
    item_type: str,
    item_id: int,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Full single-item detail for the Browse Items modal - images and
    contact info the way the list endpoint already builds them (SQLModel
    doesn't auto-serialize relationships/images on GET /api/items/{id}), plus
    the private description, which stays hidden from anyone who isn't
    signed in as staff/admin since it's the claim-quiz answer key."""
    is_staff_or_admin = bool(current_user and current_user.role in (UserRole.STAFF, UserRole.ADMIN))

    if item_type.upper() == "FOUND":
        item = session.get(Item, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return {
            "id": item.id,
            "type": "FOUND",
            "title": item.title,
            "state": item.state,
            "category_id": item.category_id,
            "location_id": item.location_id,
            "date": item.found_at,
            "public_description": item.public_description,
            "private_description": item.private_description if is_staff_or_admin else None,
            "finder_id": item.finder_id,
            "contact_email": item.finder.email if item.finder else None,
            "contact_phone": item.finder.phone if item.finder else None,
            "images": [{"url": img.url, "is_primary": img.is_primary} for img in item.images],
        }
    else:
        item = session.get(LostItem, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Lost item not found")
        return {
            "id": item.id,
            "type": "LOST",
            "title": item.title,
            "state": item.status,
            "category_id": item.category_id,
            "location_id": item.location_id,
            "date": item.lost_at,
            "public_description": item.description,
            "private_description": None,
            "reporter_id": item.reporter_id,
            "contact_email": item.reporter.email if item.reporter else None,
            "contact_phone": item.reporter.phone if item.reporter else None,
            "images": [{"url": img.url, "is_primary": img.is_primary} for img in item.images],
        }


@router.get("/logs/{item_type}/{item_id}", response_model=List[dict])
def item_timeline(item_type: str, item_id: int, session: Session = Depends(get_session)):
    """Lightweight audit-log timeline for a single item's detail view -
    read-only, no auth (matches the rest of this public browse feed)."""
    actions = ITEM_LOG_ACTIONS if item_type.upper() == "FOUND" else LOST_ITEM_LOG_ACTIONS
    logs = session.exec(
        select(AuditLog)
        .where(AuditLog.entity_id == item_id)
        .where(AuditLog.action_type.in_(actions))
        .order_by(AuditLog.timestamp.asc())
    ).all()
    return [
        {"action_type": l.action_type, "details": l.details, "timestamp": l.timestamp}
        for l in logs
    ]

@router.get("/categories", response_model=List[Category])
def get_categories(session: Session = Depends(get_session)):
    return session.exec(select(Category)).all()

@router.get("/locations", response_model=List[Location])
def get_locations(session: Session = Depends(get_session)):
    return session.exec(select(Location)).all()

