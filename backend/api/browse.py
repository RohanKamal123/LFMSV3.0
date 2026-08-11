from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from typing import List, Optional, Any
from database import get_session
from models import Item, ItemState, Category, Location, LostItem, LostItemStatus

router = APIRouter()

from services.state_triggers import update_stale_items

@router.get("/", response_model=List[dict])
def browse_items(
    category_id: Optional[int] = None,
    location_id: Optional[int] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session)
):
    # Lazy-check stale items on feed load
    update_stale_items(session)
    
    # Fetch Found Items
    found_query = select(Item).where(Item.state == ItemState.ACTIVE)
    if category_id:
        found_query = found_query.where(Item.category_id == category_id)
    if location_id:
        found_query = found_query.where(Item.location_id == location_id)
    if search:
        found_query = found_query.where(Item.title.contains(search))
    
    found_items = session.exec(found_query).all()
    
    # Fetch Lost Items
    lost_query = select(LostItem).where(LostItem.status == LostItemStatus.ACTIVE)
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
            "contact_email": item.reporter.email if item.reporter else None,
            "contact_phone": item.reporter.phone if item.reporter else None,
            "image_url": primary_img if primary_img else None
        })

    # Order by newest
    unified_items.sort(key=lambda x: x["date"], reverse=True)
    
    return unified_items

@router.get("/categories", response_model=List[Category])
def get_categories(session: Session = Depends(get_session)):
    return session.exec(select(Category)).all()

@router.get("/locations", response_model=List[Location])
def get_locations(session: Session = Depends(get_session)):
    return session.exec(select(Location)).all()

