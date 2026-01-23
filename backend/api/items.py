from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from database import get_session
from models import Item, ItemState, User, AuditLog
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=Item)
def create_item(item: Item, session: Session = Depends(get_session)):
    # Validate finder
    if item.finder_id:
        finder = session.get(User, item.finder_id)
        if not finder:
            raise HTTPException(status_code=400, detail="Invalid finder_id")
    
    session.add(item)
    session.commit()
    session.refresh(item)
    
    # Audit Log
    log = AuditLog(
        actor_id=item.finder_id or 0,
        action_type="REPORT_ITEM",
        entity_id=item.id,
        details=f"Item {item.title} reported as {item.state}"
    )
    session.add(log)
    session.commit()
    
    return item

@router.get("/", response_model=List[Item])
def read_items(session: Session = Depends(get_session)):
    # Return all items (Feed filters are in browse.py)
    return session.exec(select(Item)).all()

@router.get("/{item_id}", response_model=Item)
def read_item(item_id: int, session: Session = Depends(get_session)):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.put("/{item_id}", response_model=Item)
def update_item(item_id: int, updated_item: Item, session: Session = Depends(get_session)):
    db_item = session.get(Item, item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item_data = updated_item.dict(exclude_unset=True)
    for key, value in item_data.items():
        setattr(db_item, key, value)
    
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item

@router.delete("/{item_id}")
def delete_item(item_id: int, session: Session = Depends(get_session)):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    session.delete(item)
    session.commit()
    return {"ok": True}

@router.put("/{item_id}/state", response_model=Item)
def update_item_state(item_id: int, state: ItemState, actor_id: int = 0, session: Session = Depends(get_session)):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    old_state = item.state
    item.state = state
    session.add(item)
    
    # Audit transition
    log = AuditLog(
        actor_id=actor_id,
        action_type="STATE_CHANGE",
        entity_id=item_id,
        details=f"Changed state from {old_state} to {state}"
    )
    session.add(log)
    session.commit()
    session.refresh(item)
    return item
@router.put("/{item_id}/archive", response_model=Item)
def archive_item(item_id: int, actor_id: int = 0, session: Session = Depends(get_session)):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item.state = ItemState.ARCHIVED
    session.add(item)
    
    log = AuditLog(
        actor_id=actor_id,
        action_type="ARCHIVE_ITEM",
        entity_id=item_id,
        details="Item moved to archives"
    )
    session.add(log)
    session.commit()
    session.refresh(item)
    return item
