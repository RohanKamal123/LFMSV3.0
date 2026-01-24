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

def seed_data():
    print("Zeroing database for massive seed...")
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # 1. Users
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
        session.commit()
        for u in users: session.refresh(u)
        
        # 2. Categories
        categories = [
            Category(name="Electronics", icon="Smartphone"),
            Category(name="Accessories", icon="Watch"),
            Category(name="Documents", icon="FileText"),
            Category(name="Apparel", icon="ShoppingBag"),
            Category(name="Books", icon="Book"),
            Category(name="Stationery", icon="Pen"),
        ]
        session.add_all(categories)
        session.commit()
        for c in categories: session.refresh(c)
        
        # 3. Locations
        locations = [
            Location(name="Central Library", type="Indoor"),
            Location(name="Cafeteria", type="Indoor"),
            Location(name="Annex Hall", type="Indoor"),
            Location(name="Main Field", type="Outdoor"),
            Location(name="Lab 402", type="Lab"),
            Location(name="Auditorium", type="Hall"),
            Location(name="Parking Lot", type="Outdoor"),
        ]
        session.add_all(locations)
        session.commit()
        for l in locations: session.refresh(l)

        students = [u for u in users if u.role == UserRole.STUDENT]
        staff = next(u for u in users if u.role == UserRole.STAFF)

        # 4. Item Scenarios (Massive Seed - 45 items total)
        scenarios = [
            # Title, Category Index, Location Index, State
            ("M1 MacBook Air Silver", 0, 0, ItemState.ACTIVE), # Electronics, Library
            ("iPhone 13 Pro Black", 0, 1, ItemState.PENDING_HANDOVER), # Electronics, Cafeteria
            ("Leather Wallet", 1, 2, ItemState.READY_FOR_PICKUP), # Accessories, Annex
            ("Blue Hoodie XL", 3, 3, ItemState.OVERDUE_SUBMISSION), # Apparel, Field
            ("Thomas Calculus Book", 4, 4, ItemState.RESOLVED), # Books, Lab 402
            ("Sony Headphones", 0, 5, ItemState.ACTIVE), # Electronics, Auditorium
            ("Scientific Calculator", 0, 4, ItemState.READY_FOR_PICKUP),
            ("Smart Watch Series 7", 1, 6, ItemState.ACTIVE),
            ("Car Keys (Toyota)", 1, 5, ItemState.PENDING_HANDOVER),
            ("Passport in Holder", 2, 0, ItemState.RESOLVED),
            ("Lamy Fountain Pen", 5, 0, ItemState.ACTIVE),
            ("Nike Running Shoes", 3, 3, ItemState.ARCHIVED),
            ("iPad Pencil", 0, 4, ItemState.ACTIVE),
            ("Glass Water Bottle", 1, 1, ItemState.READY_FOR_PICKUP),
            ("Algorithms Textbook", 4, 0, ItemState.OVERDUE_SUBMISSION),
            ("Samsung Earbuds", 0, 2, ItemState.ACTIVE),
            ("Red Scarf", 3, 5, ItemState.RESOLVED),
            ("Power Bank 20000mAh", 0, 6, ItemState.PENDING_HANDOVER),
            ("Student ID: 011221005", 2, 0, ItemState.READY_FOR_PICKUP),
            ("Scientific Notebook", 5, 4, ItemState.ACTIVE),
            # Add 25 more generic items
        ]
        
        # Fill up to 45
        for i in range(25):
            cat_idx = i % len(categories)
            scenarios.append((
                f"Item {i + 21} ({categories[cat_idx].name})",
                cat_idx,
                random.randint(0, len(locations)-1),
                random.choice(list(ItemState))
            ))

        print(f"Seeding {len(scenarios)} item scenarios...")
        for title, cat_idx, loc_idx, state in scenarios:
            cat = categories[cat_idx]
            loc = locations[loc_idx]
            finder = random.choice(students)
            
            # Timestamp logic for Overdue/Resolved
            updated_at = datetime.now()
            if state == ItemState.OVERDUE_SUBMISSION:
                updated_at = datetime.now() - timedelta(days=4)
            elif state == ItemState.RESOLVED:
                updated_at = datetime.now() - timedelta(days=2)
            
            item = Item(
                title=title,
                state=state,
                category_id=cat.id,
                location_id=loc.id,
                finder_id=finder.id,
                public_description=f"A {title.lower()} was found near {loc.name}. Looks well-maintained.",
                private_description=f"Has specific identification marks: {random.getrandbits(16):x}.",
                found_at=datetime.now() - timedelta(days=random.randint(1, 30)),
                state_updated_at=updated_at,
                recovery_path=RecoveryPath.PATH_B if state == ItemState.READY_FOR_PICKUP else RecoveryPath.PATH_A
            )
            session.add(item)
            session.flush()

            # Add Image
            img = ItemImage(item_id=item.id, url=get_random_image(cat.name), is_primary=True)
            session.add(img)

            # Scenario: If Ready for Pickup, needs an APPROVED claim
            if state == ItemState.READY_FOR_PICKUP:
                claimant = random.choice([u for u in students if u.id != finder.id])
                claim = Claim(
                    item_id=item.id,
                    claimant_id=claimant.id,
                    owner_private_info="I lost this yesterday. It has my name on the back.",
                    quiz_score=3,
                    is_verified=True,
                    status="APPROVED"
                )
                session.add(claim)
            
            # Scenario: If Resolved, needs an AuditLog
            if state == ItemState.RESOLVED:
                claimant = random.choice([u for u in students if u.id != finder.id])
                session.add(AuditLog(
                    actor_id=staff.id,
                    action_type="ROOM_110_PICKUP",
                    entity_id=item.id,
                    details=f"Item handed over to {claimant.uiu_id} by staff.",
                    timestamp=updated_at
                ))

        # 5. Fast ID Simulation (25 records)
        print("Seeding 25 Fast ID records...")
        for i in range(12):
            id_num = f"011221{ i+100 :03}"
            
            # Found ID card
            found_id = FastIDItem(
                type=FastIDType.FOUND,
                extracted_id=id_num,
                reporter_id=random.choice(students).id,
                location_id=random.choice(locations).id,
                description=f"Found student card {id_num} on the canteen floor.",
                status=FastIDStatus.MATCHED if i < 6 else FastIDStatus.PENDING,
                image_url="https://images.unsplash.com/photo-1589561093571-072fc245d41c"
            )
            session.add(found_id)
            session.flush()

            # Lost ID report (for matching)
            lost_id = FastIDItem(
                type=FastIDType.LOST,
                manual_id=id_num,
                reporter_id=random.choice(students).id,
                description=f"Lost my ID card {id_num} somewhere near Annex.",
                status=FastIDStatus.MATCHED if i < 6 else FastIDStatus.PENDING
            )
            session.add(lost_id)
            session.flush()

            if i < 6:
                # Create a match
                match = FastIDMatch(
                    found_item_id=found_id.id,
                    lost_item_id=lost_id.id,
                    confidence=0.98,
                    status="CONFIRMED"
                )
                session.add(match)

        # Add some extra unmatched ones
        for i in range(3):
            session.add(FastIDItem(
                type=FastIDType.LOST,
                manual_id=f"011213{900+i}",
                reporter_id=random.choice(students).id,
                description="Lost ID card, please help.",
                status=FastIDStatus.PENDING
            ))

        session.commit()
        print(f"SUCCESS: Seeded 45 items, 27 Fast ID records, and 22 users.")

if __name__ == "__main__":
    seed_data()
