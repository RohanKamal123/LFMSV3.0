from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from database import get_session, engine
from models import LostItem, LostItemStatus, User, AuditLog, Item, NotificationType
from services.embeddings import index_item, find_similar
from services.notify import send_notification
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=LostItem)
def report_lost_item(payload: dict, session: Session = Depends(get_session)):
    from models import ItemImage
    
    # Extract images but don't pass them to LostItem constructor
    image_urls = payload.pop("image_urls", [])
    
    # Fix datetime
    lost_at_str = payload.get("lost_at")
    if lost_at_str:
        payload["lost_at"] = datetime.fromisoformat(lost_at_str.replace("Z", "+00:00"))

    item = LostItem(**payload)
    
    # Validate reporter
    if item.reporter_id:
        reporter = session.get(User, item.reporter_id)
        if not reporter:
            raise HTTPException(status_code=400, detail="Invalid reporter_id")
    
    session.add(item)
    session.commit()
    session.refresh(item)
    
    # Save Images
    for i, url in enumerate(image_urls):
        img_record = ItemImage(
            lost_item_id=item.id,
            url=url,
            is_primary=(i == 0)
        )
        session.add(img_record)
    
    session.commit()
    
    # Audit Log
    log = AuditLog(
        actor_id=item.reporter_id or 0,
        action_type="REPORT_LOST_ITEM",
        entity_id=item.id,
        details=f"Lost item {item.title} reported as {item.status}"
    )
    session.add(log)
    session.commit()

    # Semantic matching against existing found items (best-effort, never
    # blocks the report - a suggestion only, doesn't touch any item state).
    category_name = item.category_rel.name if item.category_rel else ""
    location_name = item.location_rel.name if item.location_rel else ""
    embedding_text = f"{item.title}. {item.description}. Category: {category_name}. Location: {location_name}."
    index_item(session, engine, "LOST", item.id, embedding_text)

    matches = find_similar(session, engine, embedding_text, opposite_type="FOUND", k=3)
    for found_item_id, _distance in matches:
        found_item = session.get(Item, found_item_id)
        if found_item and found_item.finder_id:
            send_notification(
                session,
                user_id=item.reporter_id,
                type=NotificationType.POSSIBLE_MATCH,
                title="Possible Match Found",
                message=f"An already-found item may match what you lost ('{item.title}'). Check Browse Items and file a claim if it's yours.",
                link="/browse"
            )
    if matches:
        session.commit()

    return item

@router.get("/", response_model=List[LostItem])
def read_lost_items(session: Session = Depends(get_session)):
    return session.exec(select(LostItem)).all()

@router.get("/{item_id}", response_model=LostItem)
def read_lost_item(item_id: int, session: Session = Depends(get_session)):
    item = session.get(LostItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Lost item not found")
    return item

@router.put("/{item_id}/status", response_model=LostItem)
def update_lost_item_status(item_id: int, status: LostItemStatus, actor_id: int = 0, session: Session = Depends(get_session)):
    item = session.get(LostItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Lost item not found")
    
    old_status = item.status
    item.status = status
    session.add(item)
    
    # Audit transition
    log = AuditLog(
        actor_id=actor_id,
        action_type="LOST_ITEM_STATUS_CHANGE",
        entity_id=item_id,
        details=f"Changed status from {old_status} to {status}"
    )
    session.add(log)
    session.commit()
    session.refresh(item)
    return item
