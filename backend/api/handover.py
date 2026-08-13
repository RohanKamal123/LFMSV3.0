from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Item, ItemState, ItemImage, User, UserRole, AuditLog, Claim
from services.auth import get_current_user, require_role, decode_qr_token
from datetime import datetime

router = APIRouter()


def _resolve_claimant_uiu_id(claimant_token: Optional[str], claimant_uiu_id: Optional[str]) -> str:
    """Prefer a scanned, signed QR token (proves the claimant generated it
    recently from their own session) over a raw typed UIU ID, which is only
    accepted as a manual-entry fallback when the camera isn't usable."""
    if claimant_token:
        payload = decode_qr_token(claimant_token)
        return payload["uiu_id"]
    if claimant_uiu_id:
        return claimant_uiu_id
    raise HTTPException(status_code=400, detail="Scan the claimant's QR or enter their UIU ID.")


def _item_summary(item: Item) -> dict:
    """Item.id doubles as the inventory serial number - there's no separate
    numbering scheme, it's the same ID used everywhere else for this item."""
    primary_img = next((img.url for img in item.images if img.is_primary), item.images[0].url if item.images else None)
    return {"id": item.id, "serial": item.id, "title": item.title, "state": item.state, "image_url": primary_img}


@router.get("/lookup")
async def lookup_visitor(token: str, session: Session = Depends(get_session), current_user: User = Depends(require_role(UserRole.STAFF, UserRole.ADMIN))):
    """
    Staff scans a visitor's personal identity QR (the same signed,
    short-lived token used everywhere else in the handover flow) to pull up
    everything that visitor can do at Room 110 right now - items they still
    need to drop off as a finder, and items already approved and waiting for
    them to pick up. Replaces scanning an item's own tag/QR for intake, and
    replaces the old per-staff session-token QR for pickup - one scan of the
    visitor's own QR now covers both directions.
    """
    payload = decode_qr_token(token)
    uiu_id = payload["uiu_id"]
    visitor = session.exec(select(User).where(User.uiu_id == uiu_id)).first()
    if not visitor:
        raise HTTPException(status_code=404, detail="Visitor not found")

    dropoff_items = session.exec(
        select(Item).where(
            Item.finder_id == visitor.id,
            Item.state.in_([ItemState.PENDING_HANDOVER, ItemState.OVERDUE_SUBMISSION])
        )
    ).all()

    approved_claims = session.exec(
        select(Claim).where(Claim.claimant_id == visitor.id, Claim.status == "APPROVED")
    ).all()
    pickup_items = [
        item for item in (session.get(Item, c.item_id) for c in approved_claims)
        if item and item.state == ItemState.READY_FOR_PICKUP
    ]

    return {
        "visitor": {"id": visitor.id, "name": visitor.name, "uiu_id": visitor.uiu_id},
        "dropoffs": [_item_summary(i) for i in dropoff_items],
        "pickups": [_item_summary(i) for i in pickup_items],
    }


@router.get("/queue")
async def room110_queue(session: Session = Depends(get_session), current_user: User = Depends(require_role(UserRole.STAFF, UserRole.ADMIN))):
    """
    Everything pending at Room 110 right now, across every visitor - no
    scanning needed on staff's side. A finder shows up as soon as their item
    hits PENDING_HANDOVER/OVERDUE_SUBMISSION; a claimant shows up as soon as
    their claim is approved and the item reaches READY_FOR_PICKUP. Staff
    just works the list.
    """
    dropoff_items = session.exec(
        select(Item).where(Item.state.in_([ItemState.PENDING_HANDOVER, ItemState.OVERDUE_SUBMISSION]))
    ).all()
    dropoffs = []
    for item in dropoff_items:
        finder = session.get(User, item.finder_id) if item.finder_id else None
        dropoffs.append({
            **_item_summary(item),
            "person": {"name": finder.name, "uiu_id": finder.uiu_id} if finder else None,
        })

    approved_claims = session.exec(select(Claim).where(Claim.status == "APPROVED")).all()
    pickups = []
    for claim in approved_claims:
        item = session.get(Item, claim.item_id)
        if not item or item.state != ItemState.READY_FOR_PICKUP:
            continue
        claimant = session.get(User, claim.claimant_id)
        pickups.append({
            **_item_summary(item),
            "person": {"name": claimant.name, "uiu_id": claimant.uiu_id} if claimant else None,
        })

    return {"dropoffs": dropoffs, "pickups": pickups}


@router.get("/serial/{item_id}")
async def lookup_by_serial(item_id: int, session: Session = Depends(get_session), current_user: User = Depends(require_role(UserRole.STAFF, UserRole.ADMIN))):
    """
    Staff looks an item up directly by its serial number (its item ID) -
    the manual-entry path for a non-user pickup, where there's no personal
    QR to scan, and a general fallback when a visitor's phone isn't handy.
    """
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="No item with that serial number")
    return _item_summary(item)


@router.post("/founder-scan-claimer")
async def founder_scan_claimer(item_id: int, claimant_uiu_id: Optional[str] = None, claimant_token: Optional[str] = None, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """
    Finder scans the owner's QR code (a signed, short-lived token) to hand
    over the item directly. Transitions state to RESOLVED.
    """
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.finder_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not the finder of this item")

    resolved_uiu_id = _resolve_claimant_uiu_id(claimant_token, claimant_uiu_id)
    owner = session.exec(select(User).where(User.uiu_id == resolved_uiu_id)).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Claimant not found")

    # Transition
    old_state = item.state
    item.state = ItemState.RESOLVED
    item.state_updated_at = datetime.now()
    session.add(item)

    # Log
    log = AuditLog(
        actor_id=current_user.id,
        action_type="HANDOVER_DIRECT",
        entity_id=item_id,
        details=f"Direct handover from finder to owner ({resolved_uiu_id}). State: {old_state} -> RESOLVED"
    )
    session.add(log)
    session.commit()
    session.refresh(item)

    return {"status": "success", "message": "Item handed over to owner successfully", "item": item}


@router.post("/claimant-scan-founder")
async def claimant_scan_founder(item_id: int, finder_uiu_id: Optional[str] = None, finder_token: Optional[str] = None, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """
    Claimant scans the finder's QR code (or enters their UIU ID) to receive
    the item directly, in person - the finder keeps custody until this
    moment and just shows their own QR, no scanning on their side.
    Transitions state to RESOLVED.
    """
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    claim = session.exec(
        select(Claim).where(Claim.item_id == item_id, Claim.claimant_id == current_user.id, Claim.status == "APPROVED")
    ).first()
    if not claim:
        raise HTTPException(status_code=403, detail="You don't have an approved claim on this item")

    resolved_uiu_id = _resolve_claimant_uiu_id(finder_token, finder_uiu_id)
    finder = session.exec(select(User).where(User.uiu_id == resolved_uiu_id)).first()
    if not finder or finder.id != item.finder_id:
        raise HTTPException(status_code=400, detail="That QR doesn't match the finder of this item")

    old_state = item.state
    item.state = ItemState.RESOLVED
    item.state_updated_at = datetime.now()
    session.add(item)

    log = AuditLog(
        actor_id=current_user.id,
        action_type="HANDOVER_DIRECT",
        entity_id=item_id,
        details=f"Direct handover: claimant ({current_user.uiu_id}) scanned finder ({resolved_uiu_id}). State: {old_state} -> RESOLVED"
    )
    session.add(log)
    session.commit()
    session.refresh(item)

    return {"status": "success", "message": "Item received directly from finder", "item": item}


@router.post("/staff-scan-tag")
async def staff_scan_tag(item_id: int, session: Session = Depends(get_session), current_user: User = Depends(require_role(UserRole.STAFF, UserRole.ADMIN))):
    """
    Staff at Room 110 scans the physical tag on the item when the finder drops it off.
    Transitions state to READY_FOR_PICKUP.
    """
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    old_state = item.state
    item.state = ItemState.READY_FOR_PICKUP
    item.state_updated_at = datetime.now()
    session.add(item)

    log = AuditLog(
        actor_id=current_user.id,
        action_type="ROOM_110_DROPOFF",
        entity_id=item_id,
        details=f"Item dropped at Room 110. State: {old_state} -> READY_FOR_PICKUP"
    )
    session.add(log)
    session.commit()
    session.refresh(item)

    return {"status": "success", "message": "Item registered at Room 110", "item": item}

@router.post("/staff-scan-claimer")
async def staff_scan_claimer(item_id: int, claimant_uiu_id: Optional[str] = None, claimant_token: Optional[str] = None, session: Session = Depends(get_session), current_user: User = Depends(require_role(UserRole.STAFF, UserRole.ADMIN))):
    """
    Staff at Room 110 scans the owner's QR code (a signed, short-lived
    token) during the final pickup. Transitions state to RESOLVED.
    """
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.state != ItemState.READY_FOR_PICKUP:
        raise HTTPException(status_code=400, detail="Item is not in Room 110 pickup queue")

    resolved_uiu_id = _resolve_claimant_uiu_id(claimant_token, claimant_uiu_id)
    owner = session.exec(select(User).where(User.uiu_id == resolved_uiu_id)).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Claimant not found")

    # Transition
    item.state = ItemState.RESOLVED
    item.state_updated_at = datetime.now()
    session.add(item)

    log = AuditLog(
        actor_id=current_user.id,
        action_type="ROOM_110_PICKUP",
        entity_id=item_id,
        details=f"Item picked up from Room 110 by {resolved_uiu_id}. State: RESOLVED"
    )
    session.add(log)
    session.commit()
    session.refresh(item)

    return {"status": "success", "message": "Item picked up successfully", "item": item}

@router.post("/take-by-qr")
async def take_by_qr(item_id: int, session: Session = Depends(get_session), current_user: User = Depends(require_role(UserRole.STAFF, UserRole.ADMIN))):
    """
    Simplified intake: Staff scans a QR containing item_id directly.
    Transitions state to READY_FOR_PICKUP.
    """
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Transition
    old_state = item.state
    item.state = ItemState.READY_FOR_PICKUP
    item.state_updated_at = datetime.now()
    session.add(item)

    # Log
    log = AuditLog(
        actor_id=current_user.id,
        action_type="ROOM_110_INTAKE_QR",
        entity_id=item_id,
        details=f"Item received via QR scan. State: {old_state} -> READY_FOR_PICKUP"
    )
    session.add(log)
    session.commit()
    session.refresh(item)

    return {"status": "success", "message": "Item registered successfully", "item": item}


@router.post("/staff-quick-report")
async def staff_quick_report(payload: dict, session: Session = Depends(get_session), current_user: User = Depends(require_role(UserRole.STAFF, UserRole.ADMIN))):
    """
    Staff logs a found item from scratch on behalf of a walk-in who drops it
    off with no Find-X account - just a title, one hidden identifying detail
    for the future claim quiz, and an optional photo. No finder to attach it
    to, and no public description needed from staff. Goes straight to
    ACTIVE so it's immediately browsable/claimable online even though the
    physical item is already sitting at Room 110.
    """
    title = (payload.get("title") or "").strip()
    private_description = (payload.get("private_description") or "").strip()
    if not title or not private_description:
        raise HTTPException(status_code=400, detail="Title and a hidden identifying detail are required.")

    item = Item(
        title=title,
        public_description="Found and logged by Room 110 staff on behalf of a walk-in finder. Ask at Room 110 to claim.",
        private_description=private_description,
        category_id=payload.get("category_id"),
        location_id=payload.get("location_id"),
        finder_id=None,
        state=ItemState.ACTIVE,
    )
    session.add(item)
    session.commit()
    session.refresh(item)

    image_url = payload.get("image_url")
    if image_url:
        session.add(ItemImage(item_id=item.id, url=image_url, is_primary=True))
        session.commit()

    log = AuditLog(
        actor_id=current_user.id,
        action_type="REPORT_ITEM",
        entity_id=item.id,
        details=f"Item '{item.title}' logged by staff for a walk-in drop-off (serial #{item.id})"
    )
    session.add(log)
    session.commit()
    session.refresh(item)

    return _item_summary(item)


@router.post("/manual-release")
async def manual_release(item_id: int, note: Optional[str] = None, session: Session = Depends(get_session), current_user: User = Depends(require_role(UserRole.STAFF, UserRole.ADMIN))):
    """
    Staff manually marks an item picked up by serial number, for a walk-in
    non-user with no Find-X account and nothing to scan - ownership was
    already verified in person. Works from any pre-RESOLVED state, since a
    walk-in pickup doesn't necessarily go through READY_FOR_PICKUP first.
    """
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="No item with that serial number")
    if item.state in (ItemState.RESOLVED, ItemState.ARCHIVED):
        raise HTTPException(status_code=400, detail="This item has already been resolved.")

    old_state = item.state
    item.state = ItemState.RESOLVED
    item.state_updated_at = datetime.now()
    session.add(item)

    log = AuditLog(
        actor_id=current_user.id,
        action_type="ROOM_110_MANUAL_PICKUP",
        entity_id=item_id,
        details=f"Manually released to a walk-in by serial #{item_id}{f' - {note}' if note else ''}. State: {old_state} -> RESOLVED"
    )
    session.add(log)
    session.commit()
    session.refresh(item)

    return {"status": "success", "message": "Item marked as picked up", "item": item}
