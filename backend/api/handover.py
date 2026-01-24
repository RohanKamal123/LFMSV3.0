from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Item, ItemState, User, AuditLog, Claim
from datetime import datetime

router = APIRouter()

@router.post("/founder-scan-claimer")
async def founder_scan_claimer(item_id: int, claimant_uiu_id: str, finder_id: int, session: Session = Depends(get_session)):
    """
    Finder scans the owner's QR code (containing UIU ID) to hand over the item directly.
    Transitions state to RESOLVED.
    """
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item.finder_id != finder_id:
        raise HTTPException(status_code=403, detail="You are not the finder of this item")
    
    owner = session.exec(select(User).where(User.uiu_id == claimant_uiu_id)).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Claimant not found")

    # Transition
    old_state = item.state
    item.state = ItemState.RESOLVED
    item.state_updated_at = datetime.now()
    session.add(item)
    
    # Log
    log = AuditLog(
        actor_id=finder_id,
        action_type="HANDOVER_DIRECT",
        entity_id=item_id,
        details=f"Direct handover from finder to owner ({claimant_uiu_id}). State: {old_state} -> RESOLVED"
    )
    session.add(log)
    session.commit()
    
    return {"status": "success", "message": "Item handed over to owner successfully", "item": item}

@router.post("/staff-scan-tag")
async def staff_scan_tag(item_id: int, staff_id: int, session: Session = Depends(get_session)):
    """
    Staff at Room 110 scans the physical tag on the item when the finder drops it off.
    Transitions state to READY_FOR_PICKUP.
    """
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    staff = session.get(User, staff_id)
    if not staff or staff.role not in ["STAFF", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only staff can register drop-offs at Room 110")

    old_state = item.state
    item.state = ItemState.READY_FOR_PICKUP
    item.state_updated_at = datetime.now()
    session.add(item)
    
    log = AuditLog(
        actor_id=staff_id,
        action_type="ROOM_110_DROPOFF",
        entity_id=item_id,
        details=f"Item dropped at Room 110. State: {old_state} -> READY_FOR_PICKUP"
    )
    session.add(log)
    session.commit()
    
    return {"status": "success", "message": "Item registered at Room 110", "item": item}

@router.post("/staff-scan-claimer")
async def staff_scan_claimer(item_id: int, claimant_uiu_id: str, staff_id: int, session: Session = Depends(get_session)):
    """
    Staff at Room 110 scans the owner's QR code during the final pickup.
    Transitions state to RESOLVED.
    """
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item.state != ItemState.READY_FOR_PICKUP:
        raise HTTPException(status_code=400, detail="Item is not in Room 110 pickup queue")
    
    staff = session.get(User, staff_id)
    if not staff or staff.role not in ["STAFF", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only staff can verify pickups")

    owner = session.exec(select(User).where(User.uiu_id == claimant_uiu_id)).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Claimant not found")

    # Transition
    item.state = ItemState.RESOLVED
    item.state_updated_at = datetime.now()
    session.add(item)
    
    log = AuditLog(
        actor_id=staff_id,
        action_type="ROOM_110_PICKUP",
        entity_id=item_id,
        details=f"Item picked up from Room 110 by {claimant_uiu_id}. State: RESOLVED"
    )
    session.add(log)
    session.commit()
    
    return {"status": "success", "message": "Item picked up successfully", "item": item}
@router.post("/take-by-qr")
async def take_by_qr(item_id: int, staff_id: int, session: Session = Depends(get_session)):
    """
    Simplified intake: Staff scans a QR containing item_id directly.
    Transitions state to READY_FOR_PICKUP.
    """
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    staff = session.get(User, staff_id)
    if not staff or staff.role not in ["STAFF", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only staff can register drop-offs")

    # Transition
    old_state = item.state
    item.state = ItemState.READY_FOR_PICKUP
    item.state_updated_at = datetime.now()
    session.add(item)
    
    # Log
    log = AuditLog(
        actor_id=staff_id,
        action_type="ROOM_110_INTAKE_QR",
        entity_id=item_id,
        details=f"Item received via QR scan. State: {old_state} -> READY_FOR_PICKUP"
    )
    session.add(log)
    session.commit()
    
    return {"status": "success", "message": "Item registered successfully", "item": item}
