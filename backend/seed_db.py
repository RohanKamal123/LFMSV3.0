import random
from datetime import datetime, timedelta
from sqlmodel import Session, SQLModel, select
from database import engine
from models import (
    User, UserRole, Category, Location, Item, ItemState,
    ItemImage, Claim, AuditLog, LostItem, LostItemStatus,
    FastIDItem, FastIDType, FastIDStatus, FastIDMatch, RecoveryPath
)
from services.auth import hash_password

# Demo-only password for every seeded account. Real registrations set their
# own password via /api/auth/register - this exists purely so the seeded
# demo data is still logged into for local testing.
DEMO_PASSWORD = "findx-2026"

# Realistic UIU Mock Data
STUDENT_NAMES = [
    "Mahir Faisal", "Sadia Islam", "Abrar Hamim", "Nabila Rahman", 
    "Sifat Ahmed", "Raisa Khan", "Tanvir Hossain", "Mehedi Hasan",
    "Lamia Akter", "Zubair Al-Mahmud", "Iffat Ara", "Fardin Nayem"
]

DEPARTMENTS = ["CSE", "EEE", "BBA", "Pharmacy", "CIVIL"]

LOCATIONS = [
    ("Central Library", "Indoor"),
    ("Main Cafeteria", "Indoor"),
    ("Room 110 (Security)", "Indoor"),
    ("Room 402 Lab", "Lab"),
    ("Annex Field", "Outdoor"),
    ("Auditorium Hall", "Hall"),
    ("Student Lounge", "Indoor"),
    ("Gymnasium", "Indoor"),
    ("Parking Area", "Outdoor")
]

CATEGORIES = [
    ("Electronics", "Smartphone"),
    ("Accessories", "Watch"),
    ("ID Cards", "CreditCard"),
    ("Clothing", "Shirt"),
    ("Books", "Book"),
    ("Stationery", "Pen"),
    ("Others", "Box")
]

# Unsplash images for realistic look
STOCK_IMAGES = {
    "Electronics": ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9", "https://images.unsplash.com/photo-1491933382434-500287f9b54b"],
    "Accessories": ["https://images.unsplash.com/photo-1523275335684-37898b6baf30", "https://images.unsplash.com/photo-1627124118123-e4d31109dc47"],
    "ID Cards": ["https://images.unsplash.com/photo-1589561093571-072fc245d41c"],
    "Clothing": ["https://images.unsplash.com/photo-1591047139829-d91aecb6caea"],
    "Books": ["https://images.unsplash.com/photo-1544947950-fa07a98d237f"],
    "Stationery": ["https://images.unsplash.com/photo-1583485088034-697b5bc54ccd"],
    "Others": ["https://images.unsplash.com/photo-1540348563548-648af33008c3"]
}

def seed():
    print("🚀 Initializing Find-X Database Seeding...")
    
    # Drop and recreate tables to start fresh
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # 1. Create Core Static Data
        print("--- Seeding Categories & Locations ---")
        category_objects = []
        for name, icon in CATEGORIES:
            cat = Category(name=name, icon=icon)
            session.add(cat)
            category_objects.append(cat)
        
        location_objects = []
        for name, l_type in LOCATIONS:
            loc = Location(name=name, type=l_type)
            session.add(loc)
            location_objects.append(loc)
        
        session.commit()
        for c in category_objects: session.refresh(c)
        for l in location_objects: session.refresh(l)

        # 2. Create Users
        print("--- Seeding Users ---")
        # Admin & Staff
        admin = User(uiu_id="AD-001", name="System Administrator", email="admin@uiu.ac.bd", role=UserRole.ADMIN, password_hash=hash_password(DEMO_PASSWORD))
        staff = User(uiu_id="ST-110", name="Room 110 Security", email="staff@uiu.ac.bd", role=UserRole.STAFF, password_hash=hash_password(DEMO_PASSWORD))
        session.add_all([admin, staff])

        # Random Students
        students = []
        for i, name in enumerate(STUDENT_NAMES):
            student = User(
                uiu_id=f"01122{1000 + i}",
                name=name,
                email=f"{name.lower().replace(' ', '.')}@uiu.ac.bd",
                role=UserRole.STUDENT,
                department=random.choice(DEPARTMENTS),
                phone=f"01700{random.randint(100000, 999999)}",
                password_hash=hash_password(DEMO_PASSWORD)
            )
            session.add(student)
            students.append(student)
        
        session.commit()
        for s in students: session.refresh(s)
        session.refresh(staff)

        # 3. Create Found Items
        print("--- Seeding Found Items ---")
        item_scenarios = [
            ("MacBook Pro M2", "Electronics", "Central Library", ItemState.ACTIVE),
            ("G-Shock Watch", "Accessories", "Gymnasium", ItemState.READY_FOR_PICKUP),
            ("Calculus II Notebook", "Stationery", "Room 402 Lab", ItemState.PENDING_HANDOVER),
            ("UIU Student ID Card", "ID Cards", "Main Cafeteria", ItemState.ACTIVE),
            ("Black Wallet", "Others", "Auditorium Hall", ItemState.RESOLVED),
            ("iPhone 14 Black", "Electronics", "Annex Field", ItemState.OVERDUE_SUBMISSION),
            ("Chemistry Textbook", "Books", "Student Lounge", ItemState.ACTIVE),
        ]

        for i in range(20):
            if i < len(item_scenarios):
                title, cat_name, loc_name, state = item_scenarios[i]
            else:
                title = f"Found Item {i+1}"
                cat_name = random.choice([c[0] for c in CATEGORIES])
                loc_name = random.choice([l[0] for l in LOCATIONS])
                state = random.choice(list(ItemState))

            cat = next((c for c in category_objects if c.name == cat_name), category_objects[0])
            loc = next((l for l in location_objects if l.name == loc_name), location_objects[0])
            finder = random.choice(students)
            
            item = Item(
                title=title,
                state=state,
                category_id=cat.id,
                location_id=loc.id,
                finder_id=finder.id,
                public_description=f"A {title.lower()} was found at {loc_name}. Please contact if this belongs to you.",
                private_description=f"Specific detail: {random.randint(1000, 9999)} serial mark.",
                found_at=datetime.now() - timedelta(days=random.randint(1, 10)),
                recovery_path=RecoveryPath.PATH_B if random.random() > 0.5 else RecoveryPath.PATH_A
            )
            session.add(item)
            session.flush()

            # Add Image
            img_url = random.choice(STOCK_IMAGES.get(cat.name, STOCK_IMAGES["Others"]))
            img = ItemImage(item_id=item.id, url=img_url, is_primary=True)
            session.add(img)

            # Add logical state data
            if state == ItemState.READY_FOR_PICKUP:
                claimant = random.choice([s for s in students if s.id != finder.id])
                session.add(Claim(
                    item_id=item.id,
                    claimant_id=claimant.id,
                    owner_private_info="The serial number is correct.",
                    quiz_score=3,
                    is_verified=True,
                    status="APPROVED"
                ))
            
            if state == ItemState.RESOLVED:
                session.add(AuditLog(
                    actor_id=staff.id,
                    action_type="HANDOVER_SUCCESS",
                    entity_id=item.id,
                    details=f"Item handed over successfully."
                ))

        # 4. Create Lost Item Reports
        print("--- Seeding Lost Item Reports ---")
        for i in range(10):
            cat = random.choice(category_objects)
            loc = random.choice(location_objects)
            reporter = random.choice(students)
            lost_item = LostItem(
                title=f"Lost My {cat.name}",
                description=f"I lost my {cat.name} near {loc.name}. Very urgent!",
                category_id=cat.id,
                location_id=loc.id,
                reporter_id=reporter.id,
                status=LostItemStatus.ACTIVE
            )
            session.add(lost_item)

        # 5. Fast ID Simulation
        print("--- Seeding Fast ID Data ---")
        for i in range(10):
            target_id = f"01122{1500+i}"
            # Found ID
            f_id = FastIDItem(
                type=FastIDType.FOUND,
                extracted_id=target_id,
                reporter_id=random.choice(students).id,
                location_id=random.choice(location_objects).id,
                description="Found a student card.",
                status=FastIDStatus.MATCHED if i < 5 else FastIDStatus.PENDING,
                image_url="https://images.unsplash.com/photo-1589561093571-072fc245d41c"
            )
            session.add(f_id)
            session.flush()

            # Lost ID
            l_id = FastIDItem(
                type=FastIDType.LOST,
                manual_id=target_id,
                reporter_id=random.choice(students).id,
                description="Lost my ID card.",
                status=FastIDStatus.MATCHED if i < 5 else FastIDStatus.PENDING
            )
            session.add(l_id)
            session.flush()

            if i < 5:
                session.add(FastIDMatch(
                    found_item_id=f_id.id,
                    lost_item_id=l_id.id,
                    confidence=0.95,
                    status="CONFIRMED"
                ))

        session.commit()
        print("✅ Database Seeded Successfully with Demo Datasets!")
        print(f"   Demo login password for every seeded account: {DEMO_PASSWORD}")
        print("   e.g. uiu_id=AD-001 (admin), ST-110 (staff), 011221000.. (students)")

if __name__ == "__main__":
    seed()
