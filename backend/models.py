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

class LostItemStatus(str, Enum):
    ACTIVE = "ACTIVE"
    RECOVERED = "RECOVERED"
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
    phone: Optional[str] = None
    role: UserRole = Field(default=UserRole.STUDENT)
    department: Optional[str] = None
    
    items_found: List["Item"] = Relationship(back_populates="finder")
    items_lost: List["LostItem"] = Relationship(back_populates="reporter")
    claims: List["Claim"] = Relationship(back_populates="claimant")

# --- 2. Category (Dynamic) ---
class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True)
    icon: str # Lucide icon name string
    items: List["Item"] = Relationship(back_populates="category_rel")
    lost_items: List["LostItem"] = Relationship(back_populates="category_rel")

# --- 3. Location (Dynamic) ---
class Location(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True)
    type: str # Indoor, Outdoor, Lab, etc.
    items: List["Item"] = Relationship(back_populates="location_rel")
    lost_items: List["LostItem"] = Relationship(back_populates="location_rel")

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
    state_updated_at: datetime = Field(default_factory=datetime.now)
    
    # Recovery Logic
    recovery_path: Optional[RecoveryPath] = None
    
    images: List["ItemImage"] = Relationship(back_populates="item")
    claims: List["Claim"] = Relationship(back_populates="item")

# --- 5. ItemImage ---
class ItemImage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: Optional[int] = Field(default=None, foreign_key="item.id")
    lost_item_id: Optional[int] = Field(default=None, foreign_key="lostitem.id")
    url: str
    is_primary: bool = Field(default=False)
    
    item: Optional[Item] = Relationship(back_populates="images")
    lost_item: Optional["LostItem"] = Relationship(back_populates="images")

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

# --- 7b. QuizAttempt (server-side answer key, never sent to the client) ---
class QuizAttempt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(foreign_key="item.id")
    questions_json: str  # full generate_quiz() output, including correct_index
    created_at: datetime = Field(default_factory=datetime.now)

# --- 8. Support Tickets ---
class TicketCategory(str, Enum):
    BUG = "BUG"
    ITEM_ISSUE = "ITEM_ISSUE"
    ACCOUNT = "ACCOUNT"
    OTHER = "OTHER"

class TicketStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

class SupportTicket(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    subject: str
    category: TicketCategory = Field(default=TicketCategory.OTHER)
    description: str
    item_id: Optional[int] = Field(default=None, foreign_key="item.id") # optional: ties a ticket to a specific item
    status: TicketStatus = Field(default=TicketStatus.OPEN)
    staff_response: Optional[str] = None
    resolved_by: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.now)
    resolved_at: Optional[datetime] = None

# --- 10. AuditLog (Security) ---
class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    actor_id: int # User ID performed action
    action_type: str # SCAN_QR, STATE_CHANGE, VERIFY_CLAIM
    entity_id: Optional[int] = Field(default=None) # Item ID or Report ID
    details: str
    timestamp: datetime = Field(default_factory=datetime.now)
# --- 11. LostItem ---
class LostItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    status: LostItemStatus = Field(default=LostItemStatus.ACTIVE)
    
    # Relationships
    category_id: Optional[int] = Field(default=None, foreign_key="category.id")
    category_rel: Optional[Category] = Relationship(back_populates="lost_items")
    
    location_id: Optional[int] = Field(default=None, foreign_key="location.id")
    location_rel: Optional[Location] = Relationship(back_populates="lost_items")
    
    reporter_id: Optional[int] = Field(default=None, foreign_key="user.id")
    reporter: Optional[User] = Relationship(back_populates="items_lost")
    
    lost_at: datetime = Field(default_factory=datetime.now)
    created_at: datetime = Field(default_factory=datetime.now)
    
    images: List[ItemImage] = Relationship(back_populates="lost_item")

# --- 12. Fast ID (Student ID Cards) ---
class FastIDType(str, Enum):
    FOUND = "FOUND"
    LOST = "LOST"

class FastIDStatus(str, Enum):
    PENDING = "PENDING"
    MATCHED = "MATCHED"
    RESOLVED = "RESOLVED"

class FastIDItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    type: FastIDType
    extracted_id: Optional[str] = None # For found items (AI extracted)
    manual_id: Optional[str] = None    # For lost reports (Manual entry)
    image_url: Optional[str] = None    # Photo of the ID card
    status: FastIDStatus = Field(default=FastIDStatus.PENDING)
    
    reporter_id: int = Field(foreign_key="user.id")
    location_id: Optional[int] = Field(default=None, foreign_key="location.id")
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

class FastIDMatch(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    found_item_id: int = Field(foreign_key="fastiditem.id")
    lost_item_id: int = Field(foreign_key="fastiditem.id")
    confidence: float = Field(default=0.0)
    status: str = Field(default="PENDING") # PENDING, CONFIRMED, REJECTED
    created_at: datetime = Field(default_factory=datetime.now)
    resolved_at: Optional[datetime] = None

class CVScanResult(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    fast_id_item_id: int = Field(foreign_key="fastiditem.id")
    raw_ai_response: str
    detected_id: Optional[str] = None
    confidence_score: float
    timestamp: datetime = Field(default_factory=datetime.now)

# --- 12b. ItemEmbedding (metadata row; the actual vector lives in the
#     sqlite-vec virtual table "item_vec", keyed by this row's id) ---
class ItemEmbedding(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    item_type: str  # "FOUND" (Item) or "LOST" (LostItem)
    item_id: int
    created_at: datetime = Field(default_factory=datetime.now)

# --- 13. Notifications ---
class NotificationType(str, Enum):
    FAST_ID_MATCH = "FAST_ID_MATCH"
    CLAIM_UPDATE = "CLAIM_UPDATE"
    SYSTEM_ALERT = "SYSTEM_ALERT"
    POSSIBLE_MATCH = "POSSIBLE_MATCH"

class Notification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    type: NotificationType
    title: str
    message: str
    is_read: bool = Field(default=False)
    link: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

# --- 14. Handover Sessions (Staff-led Giveaway) ---
class HandoverSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    staff_id: int = Field(foreign_key="user.id")
    session_token: str = Field(unique=True, index=True)
    claimant_id: Optional[int] = Field(default=None, foreign_key="user.id")
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.now)
