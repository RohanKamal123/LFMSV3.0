from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Item, ItemState, User, UserRole, AuditLog, Claim
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
