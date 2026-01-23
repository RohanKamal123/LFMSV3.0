from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, JSON, Column, Relationship
from enum import Enum
from datetime import datetime

# --- Enums ---
class ItemState(str, Enum):
    ACTIVE = "ACTIVE"
    PENDING_HANDOVER = "PENDING_HANDOVER"
    OVERDUE_SUBMISSION = "OVERDUE_SUBMISSION"
    READY_FOR_PICKUP = "READY_FOR_PICKUP"
    RESOLVED = "RESOLVED"
    ARCHIVED = "ARCHIVED"

class UserRole(str, Enum):
    STUDENT = "STUDENT"
    STAFF = "STAFF"
    ADMIN = "ADMIN"

class RecoveryPath(str, Enum):
    PATH_A = "PATH_A" # Direct
    PATH_B = "PATH_B" # Staff Mediated

# --- 1. User ---
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    uiu_id: str = Field(index=True, unique=True) # Critical unique identifier
    name: str
    email: str
    role: UserRole = Field(default=UserRole.STUDENT)
    fraud_score: int = Field(default=0) # 0-100, impacts reputation
    department: Optional[str] = None
    
    items_found: List["Item"] = Relationship(back_populates="finder")
    claims: List["Claim"] = Relationship(back_populates="claimant")

# --- 2. Category (Dynamic) ---
class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True)
    icon: str # Lucide icon name string
    items: List["Item"] = Relationship(back_populates="category_rel")

# --- 3. Location (Dynamic) ---
class Location(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True)
    type: str # Indoor, Outdoor, Lab, etc.
    items: List["Item"] = Relationship(back_populates="location_rel")

# --- 4. Item (Core) ---
class Item(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    state: ItemState = Field(default=ItemState.ACTIVE)
    
    # Relationships
    category_id: Optional[int] = Field(default=None, foreign_key="category.id")
    category_rel: Optional[Category] = Relationship(back_populates="items")
    
    location_id: Optional[int] = Field(default=None, foreign_key="location.id")
    location_rel: Optional[Location] = Relationship(back_populates="items")
    
    finder_id: Optional[int] = Field(default=None, foreign_key="user.id")
    finder: Optional[User] = Relationship(back_populates="items_found")
    
    # Details
    public_description: str
    private_description: str # The "Secret"
    found_at: datetime = Field(default_factory=datetime.now)
    
    # Recovery Logic
    recovery_path: Optional[RecoveryPath] = None
    
    images: List["ItemImage"] = Relationship(back_populates="item")
    claims: List["Claim"] = Relationship(back_populates="item")

# --- 5. ItemImage ---
class ItemImage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(foreign_key="item.id")
    url: str
    is_primary: bool = Field(default=False)
    
    item: Optional[Item] = Relationship(back_populates="images")

# --- 6. Claim ---
class Claim(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(foreign_key="item.id")
    claimant_id: int = Field(foreign_key="user.id")
    
    # Verification Data
    owner_private_info: str # What owner said
    quiz_score: int = Field(default=0) # 0-3
    is_verified: bool = Field(default=False)
    status: str = "PENDING" # PENDING, APPROVED, REJECTED
    timestamp: datetime = Field(default_factory=datetime.now)
    
    item: Optional[Item] = Relationship(back_populates="claims")
    claimant: Optional[User] = Relationship(back_populates="claims")
    quiz_logs: List["QuizLog"] = Relationship(back_populates="claim")

# --- 7. QuizLog ---
class QuizLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    claim_id: int = Field(foreign_key="claim.id")
    question_text: str
    answer_text: str
    is_correct: bool
    
    claim: Optional[Claim] = Relationship(back_populates="quiz_logs")

# --- 8. RecoveryOTP (Path A) ---
class RecoveryOTP(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(foreign_key="item.id")
    otp_code: str
    created_at: datetime = Field(default_factory=datetime.now)
    is_used: bool = Field(default=False)

# --- 9. Dispute (Reclaim Window) ---
class Dispute(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(foreign_key="item.id")
    filer_id: int = Field(foreign_key="user.id")
    reason: str
    status: str = "OPEN" # OPEN, RESOLVED_FRAUD, RESOLVED_DISMISSED
    created_at: datetime = Field(default_factory=datetime.now)

# --- 10. AuditLog (Security) ---
class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    actor_id: int # User ID performed action
    action_type: str # SCAN_QR, STATE_CHANGE, VERIFY_CLAIM
    entity_id: int # Item ID or Report ID
    details: str
    timestamp: datetime = Field(default_factory=datetime.now)
