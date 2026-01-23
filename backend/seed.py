from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import Item, ItemState, User, UserRole, Category, Location, ItemImage, Claim, QuizLog

def seed_data():
    create_db_and_tables()
    with Session(engine) as session:
        # 1. Categories
        print("Seeding Categories...")
        cats_data = [
            ("Electronics", "Laptop"),
            ("Accessories", "Watch"),
            ("ID Cards", "CreditCard"),
            ("Clothing", "Shirt"),
            ("Books", "Book"),
            ("Others", "Box"),
        ]
        cats = []
        for name, icon in cats_data:
            c = Category(name=name, icon=icon)
            session.add(c)
            session.commit()
            session.refresh(c)
            cats.append(c)
            print(f"  Category '{name}' seeded, ID: {c.id}")

        # 2. Locations
        print("Seeding Locations...")
        locs_data = [
            ("Library (Ground Floor)", "Indoor"),
            ("Canteen", "Indoor"),
            ("Lab 402", "Lab"),
            ("Field", "Outdoor"),
            ("Auditorium", "Hall"),
        ]
        locs = []
        for name, type_ in locs_data:
            l = Location(name=name, type=type_)
            session.add(l)
            session.commit()
            session.refresh(l)
            locs.append(l)
            print(f"  Location '{name}' seeded, ID: {l.id}")

        # 3. Users
        print("Seeding Users...")
        users_data = [
            ("Tanvir (Student)",  "tanvir@uiu.ac.bd", "011233005", UserRole.STUDENT, "CSE"),
            ("Rahim (Staff)",    "staff@uiu.ac.bd",  "ST-001",    UserRole.STAFF, None),
            ("System Admin",     "admin@uiu.ac.bd",  "AD-001",    UserRole.ADMIN, None),
            ("Sadia (Owner)",    "sadia@uiu.ac.bd",  "011233099", UserRole.STUDENT, "EEE"),
        ]
        users = []
        for name, email, uiu_id, role, dept in users_data:
            u = User(name=name, email=email, uiu_id=uiu_id, role=role, department=dept)
            session.add(u)
            session.commit()
            session.refresh(u)
            users.append(u)
            print(f"  User '{name}' seeded, ID: {u.id}")

        # 4. Items (Using IDs strictly)
        print("Seeding Item 1...")
        item1 = Item(
            title="Lost Macbook Air",
            state=ItemState.ACTIVE,
            category_id=cats[0].id, # Electronics
            location_id=locs[0].id, # Library
            finder_id=users[0].id,
            public_description="Silver Macbook Air M1 found on table 4.",
            private_description="Has a 'GitHub' sticker on the lid corner.",
        )
        session.add(item1)
        session.commit()
        session.refresh(item1)
        print(f"Item 1 seeded, ID: {item1.id}")

        img1 = ItemImage(item_id=item1.id, url="/uploads/mock_macbook.jpg", is_primary=True)
        session.add(img1)
        session.commit()

        print("Seeding Item 2...")
        item2 = Item(
            title="Calculus Book",
            state=ItemState.READY_FOR_PICKUP,
            category_id=cats[4].id, # Books
            location_id=locs[2].id, # Lab 402
            finder_id=users[0].id,
            public_description="Thomas Calculus 14th Ed.",
            private_description="Name 'Rafiq' written inside cover.",
        )
        session.add(item2)
        session.commit()
        session.refresh(item2)
        print(f"Item 2 seeded, ID: {item2.id}")
        
        claim = Claim(
            item_id=item2.id,
            claimant_id=users[3].id,
            owner_private_info="It has my name Rafiq written on it.",
            quiz_score=3,
            is_verified=True,
            status="APPROVED"
        )
        session.add(claim)
        
        session.commit()
        print("Seeding Complete (10 Tables)!")

if __name__ == "__main__":
    seed_data()
