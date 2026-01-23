from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from typing import List, Optional
from database import get_session
from models import Item, ItemState, Category, Location

router = APIRouter()

@router.get("/", response_model=List[Item])
def browse_items(
    category_id: Optional[int] = None,
    location_id: Optional[int] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session)
):
    query = select(Item).where(Item.state == ItemState.ACTIVE)
    
    if category_id:
        query = query.where(Item.category_id == category_id)
    if location_id:
        query = query.where(Item.location_id == location_id)
    if search:
        query = query.where(Item.title.contains(search))
    
    # Order by newest
    query = query.order_by(Item.found_at.desc())
    
    items = session.exec(query).all()
    return items

@router.get("/categories", response_model=List[Category])
def get_categories(session: Session = Depends(get_session)):
    return session.exec(select(Category)).all()

@router.get("/locations", response_model=List[Location])
def get_locations(session: Session = Depends(get_session)):
    return session.exec(select(Location)).all()
