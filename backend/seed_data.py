import random
from datetime import datetime, timedelta
from sqlmodel import Session, SQLModel, select
from database import engine
from models import *

# Stock image mappings by category
STOCK_IMAGES = {
    "Electronics": [
        "https://images.unsplash.com/photo-1491933382434-500287f9b54b", # Macbook
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9", # iPhone
        "https://images.unsplash.com/photo-1546868891-752627d43c58", # Apple Watch
        "https://images.unsplash.com/photo-1484704849700-f032a568e944", # Headphones
        "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6", # Laptop
    ],
    "Accessories": [
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30", # Watch
        "https://images.unsplash.com/photo-1627124118123-e4d31109dc47", # Wallet
        "https://images.unsplash.com/photo-1583333223166-97d028dad897", # Keys
        "https://images.unsplash.com/photo-1617130863175-19e344e73f2f", # Ring
        "https://images.unsplash.com/photo-1583394838336-acd977730f90", # Glasses
    ],
    "Documents": [
        "https://images.unsplash.com/photo-1589561093571-072fc245d41c", # Cards
        "https://images.unsplash.com/photo-1614028674026-a65e31bfd27c", # Files
        "https://images.unsplash.com/photo-1634733988138-bf2c3a2a13fa", # Passport/Docs
    ],
    "Apparel": [
        "https://images.unsplash.com/photo-1591047139829-d91aecb6caea", # Hoodie
        "https://images.unsplash.com/photo-1543163521-1bf539c55dd2", # Shoes
        "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504", # Cap
    ],
    "Books": [
        "https://images.unsplash.com/photo-1544947950-fa07a98d237f", # Book
        "https://images.unsplash.com/photo-1512820790803-83ca734da794", # Stack of books
        "https://images.unsplash.com/photo-1532012197267-da84d127e765", # Open book
    ],
    "Stationery": [
        "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd", # Pens
        "https://images.unsplash.com/photo-1585336139118-1356ee74c1e1", # Notebook
    ]
}

def get_random_image(cat_name):
    return random.choice(STOCK_IMAGES.get(cat_name, STOCK_IMAGES["Accessories"]))

from sqlalchemy import text
# ... existing imports ...

def seed_data_internal(session: Session):
    import random
    from datetime import datetime, timedelta
    from sqlalchemy import text
    from models import (
        User, UserRole, Category, Location, Item, ItemState, 
        ItemImage, RecoveryPath, Claim, AuditLog, 
        FastIDItem, FastIDType, FastIDStatus, FastIDMatch
    )

    print("Cleaning existing records via strict SQL order...")
    # Order: Children before Parents to respect FKs even if PRAGMA fails
    tables = [
        "cvscanresult", "fastidmatch", "fastiditem", "quizlog", 
        "claim", "itemimage", "auditlog", "notification", 
        "handoversession", "recoveryotp", "dispute", "item", 
        "lostitem", "category", "location", "user"
    ]
    
    session.execute(text("PRAGMA foreign_keys=OFF"))
    for t in tables:
        try:
            session.execute(text(f"DELETE FROM {t}"))
        except Exception as e:
            print(f"Skipping table {t}: {e}")
    
    session.commit()
    session.execute(text("PRAGMA foreign_keys=ON"))
    
    # Force schema recreation to apply changes (like Optional fields)
    print("Re-creating database schema...")
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    
    print("Seeding Users...")
    users = [
        User(uiu_id="AD-001", name="System Admin", email="admin@uiu.ac.bd", role=UserRole.ADMIN),
        User(uiu_id="ST-110", name="Staff Member", email="staff@uiu.ac.bd", role=UserRole.STAFF),
    ]
    for i in range(20):
        users.append(User(
            uiu_id=f"011223{100 + i:03}",
            name=f"Student {chr(65+i)}",
            email=f"student{i}@uiu.ac.bd",
            role=UserRole.STUDENT,
            department=random.choice(["CSE", "EEE", "BBA", "Pharmacy"])
        ))
    session.add_all(users)
    session.flush()

    print("Seeding Categories & Locations...")
    categories = [
        Category(name="Electronics", icon="Smartphone"),
        Category(name="Accessories", icon="Watch"),
        Category(name="Documents", icon="FileText"),
        Category(name="Apparel", icon="ShoppingBag"),
        Category(name="Books", icon="Book"),
        Category(name="Stationery", icon="Pen"),
    ]
    session.add_all(categories)
    
    locations = [
        Location(name="Central Library", type="Indoor"),
        Location(name="Cafeteria", type="Indoor"),
        Location(name="Security Office (Room 110)", type="Office"),
        Location(name="Main Field", type="Outdoor"),
        Location(name="Lab 402", type="Lab"),
        Location(name="Auditorium", type="Hall"),
        Location(name="Annex Hall", type="Indoor"),
        Location(name="Gymnasium", type="Indoor"),
        Location(name="Faculty Lounge", type="Indoor"),
        Location(name="Prayer Room", type="Indoor"),
    ]
    session.add_all(locations)
    session.flush()

    students = [u for u in users if u.role == UserRole.STUDENT]
    staff_user = next(u for u in users if u.role == UserRole.STAFF)
    admin_user = users[0]
    room_110 = next(l for l in locations if "110" in l.name)

    print("Seeding 80 Item Scenarios...")
    scenarios = [
        ("M1 MacBook Air Silver", 0, 0, ItemState.ACTIVE), 
        ("iPhone 13 Pro Black", 0, 1, ItemState.PENDING_HANDOVER), 
        ("Leather Wallet", 1, 2, ItemState.READY_FOR_PICKUP), 
        ("Blue Hoodie XL", 3, 3, ItemState.OVERDUE_SUBMISSION), 
        ("Thomas Calculus Book", 4, 4, ItemState.RESOLVED), 
        ("Sony Headphones", 0, 5, ItemState.ACTIVE),
        ("Scientific Calculator", 0, 2, ItemState.READY_FOR_PICKUP),
        ("Smart Watch Series 7", 1, 6, ItemState.ACTIVE),
        ("Car Keys (Toyota)", 1, 5, ItemState.PENDING_HANDOVER),
        ("Passport in Holder", 2, 2, ItemState.RESOLVED),
        ("Lamy Fountain Pen", 5, 2, ItemState.ACTIVE),
        ("Nike Running Shoes", 3, 3, ItemState.ARCHIVED),
        ("iPad Pencil", 0, 2, ItemState.ACTIVE),
        ("Glass Water Bottle", 1, 1, ItemState.READY_FOR_PICKUP),
        ("Algorithms Textbook", 4, 0, ItemState.OVERDUE_SUBMISSION),
        ("Samsung Earbuds", 0, 2, ItemState.ACTIVE),
        ("Red Scarf", 3, 5, ItemState.RESOLVED),
        ("Power Bank 20000mAh", 0, 2, ItemState.PENDING_HANDOVER),
        ("Student ID: 011221005", 2, 0, ItemState.READY_FOR_PICKUP),
        ("Scientific Notebook", 5, 2, ItemState.ACTIVE),
    ]
    
    for i in range(60):
        cat_idx = i % len(categories)
        loc_idx = locations.index(room_110) if (i % 4 == 0) else random.randint(0, len(locations)-1)
        scenarios.append((
            f"Asset {random.getrandbits(16):X} ({categories[cat_idx].name})",
            cat_idx, loc_idx, random.choice(list(ItemState))
        ))

    for title, cat_idx, loc_idx, state in scenarios:
        days_ago = random.randint(0, 30)
        found_time = datetime.now() - timedelta(days=days_ago, hours=random.randint(0, 23))
        updated_at = found_time + timedelta(hours=random.randint(1, 48))
        if state == ItemState.RESOLVED:
            updated_at = datetime.now() - timedelta(days=random.randint(0, 7))
        
        item = Item(
            title=title, state=state, category_id=categories[cat_idx].id, 
            location_id=locations[loc_idx].id, finder_id=random.choice(students).id,
            public_description=f"Found near {locations[loc_idx].name}.",
            private_description=f"Serial: {random.getrandbits(32):x}",
            found_at=found_time, state_updated_at=updated_at,
            recovery_path=random.choice(list(RecoveryPath))
        )
        session.add(item)
        session.flush()
        session.add(ItemImage(item_id=item.id, url=get_random_image(categories[cat_idx].name), is_primary=True))

        if state == ItemState.RESOLVED:
            actor = random.choice([staff_user, admin_user])
            session.add(AuditLog(
                actor_id=actor.id, action_type=random.choice(["HANDOVER_DIRECT", "ROOM_110_PICKUP"]),
                entity_id=item.id, details="Asset officially returned to owner.", timestamp=updated_at
            ))

    print("Seeding 35 Fast ID records...")
    for i in range(15):
        id_num = f"011221{i+100:03}"
        status = random.choice([FastIDStatus.MATCHED, FastIDStatus.PENDING, FastIDStatus.RESOLVED])
        found_id = FastIDItem(
            type=FastIDType.FOUND, extracted_id=id_num if random.random() > 0.1 else None,
            reporter_id=random.choice(students).id, location_id=random.choice(locations).id,
            description=f"Student card {id_num}", status=status,
            image_url="https://images.unsplash.com/photo-1589561093571-072fc245d41c"
        )
        session.add(found_id)
        session.flush()
        lost_id = FastIDItem(
            type=FastIDType.LOST, manual_id=id_num, reporter_id=random.choice(students).id,
            description=f"Lost ID {id_num}", status=status
        )
        session.add(lost_id)
        session.flush()

        if status != FastIDStatus.PENDING:
            session.add(FastIDMatch(
                found_item_id=found_id.id, lost_item_id=lost_id.id,
                confidence=0.95 + (random.random() * 0.04), status="CONFIRMED"
            ))

    print("Seeding 60 login logs...")
    for i in range(60):
        u = random.choice(users)
        days_ago = random.randint(0, 7)
        log_time = datetime.now() - timedelta(days=days_ago, hours=random.randint(0, 23))
        session.add(AuditLog(
            actor_id=u.id, action_type="LOGIN",
            details=f"Successful authentication via {random.choice(['Web', 'Mobile'])}",
            timestamp=log_time
        ))

    session.commit()
    print(f"SUCCESS: Seeded high-fidelity ecosystem.")

def seed_data():
    print("Initializing high-fidelity seed sequence...")
    with Session(engine) as session:
        seed_data_internal(session)

if __name__ == "__main__":
    seed_data()

if __name__ == "__main__":
    seed_data()
