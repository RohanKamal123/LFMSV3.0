from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Item, ItemState, Claim, User, AuditLog
from typing import List, Optional
from datetime import datetime

router = APIRouter()

@router.get("/items", response_model=List[Item])
def admin_list_items(session: Session = Depends(get_session)):
    return session.exec(select(Item)).all()

@router.put("/items/{item_id}", response_model=Item)
def admin_update_item(item_id: int, payload: dict, admin_id: int, session: Session = Depends(get_session)):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    for key, value in payload.items():
        if hasattr(item, key):
            # Special handling for state changes to update timestamp
            if key == "state" and item.state != value:
                item.state_updated_at = datetime.now()
            setattr(item, key, value)
    
    session.add(item)
    session.commit()
    session.refresh(item)
    
    # Log
    log = AuditLog(
        actor_id=admin_id,
        action_type="ADMIN_UPDATE_ITEM",
        entity_id=item_id,
        details=f"Admin {admin_id} updated item fields: {list(payload.keys())}"
    )
    session.add(log)
    session.commit()
    
    return item

@router.delete("/items/{item_id}")
def admin_delete_item(item_id: int, admin_id: int, session: Session = Depends(get_session)):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    session.delete(item)
    session.commit()
    
    log = AuditLog(
        actor_id=admin_id,
        action_type="ADMIN_DELETE_ITEM",
        entity_id=item_id,
        details=f"Admin {admin_id} deleted item {item_id}"
    )
    session.add(log)
    session.commit()
    
    return {"message": "Item deleted"}

@router.get("/claims", response_model=List[Claim])
def admin_list_claims(session: Session = Depends(get_session)):
    return session.exec(select(Claim)).all()

@router.put("/claims/{claim_id}", response_model=Claim)
def admin_update_claim(claim_id: int, status: str, admin_id: int, session: Session = Depends(get_session)):
    claim = session.get(Claim, claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    old_status = claim.status
    claim.status = status
    session.add(claim)
    
    log = AuditLog(
        actor_id=admin_id,
        action_type="ADMIN_UPDATE_CLAIM",
        entity_id=claim_id,
        details=f"Admin {admin_id} updated claim status: {old_status} -> {status}"
    )
    session.add(log)
    session.commit()
    session.refresh(claim)
    
    return claim
