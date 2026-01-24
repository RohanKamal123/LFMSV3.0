-- Lost & Found Management System (LFMS V2.0) - Complete SQL Schema
-- Generated from SQLModel Definitions

-- 1. USER TABLE
CREATE TABLE user (
    id INTEGER NOT NULL, 
    uiu_id VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    email VARCHAR NOT NULL, 
    phone VARCHAR, 
    role VARCHAR(7) NOT NULL, 
    fraud_score INTEGER NOT NULL, 
    department VARCHAR, 
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX ix_user_uiu_id ON user (uiu_id);

-- 2. CATEGORY TABLE (Dynamic categories like Electronics, Books, etc.)
CREATE TABLE category (
    id INTEGER NOT NULL, 
    name VARCHAR NOT NULL, 
    icon VARCHAR NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (name)
);

-- 3. LOCATION TABLE (Dynamic locations like Library, Cafeteria, etc.)
CREATE TABLE location (
    id INTEGER NOT NULL, 
    name VARCHAR NOT NULL, 
    type VARCHAR NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (name)
);

-- 4. FOUND ITEM TABLE
CREATE TABLE item (
    id INTEGER NOT NULL, 
    title VARCHAR NOT NULL, 
    state VARCHAR(18) NOT NULL, -- ACTIVE, PENDING_HANDOVER, RESOLVED, etc.
    category_id INTEGER, 
    location_id INTEGER, 
    finder_id INTEGER, 
    public_description VARCHAR NOT NULL, 
    private_description VARCHAR NOT NULL, -- The "Secret" owner must know
    found_at DATETIME NOT NULL, 
    state_updated_at DATETIME NOT NULL, 
    recovery_path VARCHAR(6), -- PATH_A or PATH_B
    PRIMARY KEY (id), 
    FOREIGN KEY(category_id) REFERENCES category (id), 
    FOREIGN KEY(location_id) REFERENCES location (id), 
    FOREIGN KEY(finder_id) REFERENCES user (id)
);

-- 5. LOST ITEM REPORT TABLE
CREATE TABLE lostitem (
    id INTEGER NOT NULL, 
    title VARCHAR NOT NULL, 
    description VARCHAR NOT NULL, 
    status VARCHAR(9) NOT NULL, -- ACTIVE, RECOVERED, ARCHIVED
    category_id INTEGER, 
    location_id INTEGER, 
    reporter_id INTEGER, 
    lost_at DATETIME NOT NULL, 
    created_at DATETIME NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(category_id) REFERENCES category (id), 
    FOREIGN KEY(location_id) REFERENCES location (id), 
    FOREIGN KEY(reporter_id) REFERENCES user (id)
);

-- 6. ITEM IMAGES TABLE (One item can have many images)
CREATE TABLE itemimage (
    id INTEGER NOT NULL, 
    item_id INTEGER, 
    lost_item_id INTEGER, 
    url VARCHAR NOT NULL, 
    is_primary BOOLEAN NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(item_id) REFERENCES item (id), 
    FOREIGN KEY(lost_item_id) REFERENCES lostitem (id)
);

-- 7. CLAIMS TABLE (When a user tries to claim a found item)
CREATE TABLE claim (
    id INTEGER NOT NULL, 
    item_id INTEGER NOT NULL, 
    claimant_id INTEGER NOT NULL, 
    owner_private_info VARCHAR NOT NULL, 
    quiz_score INTEGER NOT NULL, 
    is_verified BOOLEAN NOT NULL, 
    status VARCHAR NOT NULL, -- PENDING, APPROVED, REJECTED
    timestamp DATETIME NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(item_id) REFERENCES item (id), 
    FOREIGN KEY(claimant_id) REFERENCES user (id)
);

-- 8. QUIZ LOGS (Detailing the claim verification process)
CREATE TABLE quizlog (
    id INTEGER NOT NULL, 
    claim_id INTEGER NOT NULL, 
    question_text VARCHAR NOT NULL, 
    answer_text VARCHAR NOT NULL, 
    is_correct BOOLEAN NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(claim_id) REFERENCES claim (id)
);

-- 9. RECOVERY OTP (For secure Path A handovers)
CREATE TABLE recoveryotp (
    id INTEGER NOT NULL, 
    item_id INTEGER NOT NULL, 
    otp_code VARCHAR NOT NULL, 
    created_at DATETIME NOT NULL, 
    is_used BOOLEAN NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(item_id) REFERENCES item (id)
);

-- 10. DISPUTES TABLE (For fraud or ownership conflicts)
CREATE TABLE dispute (
    id INTEGER NOT NULL, 
    item_id INTEGER NOT NULL, 
    filer_id INTEGER NOT NULL, 
    reason VARCHAR NOT NULL, 
    status VARCHAR NOT NULL, 
    created_at DATETIME NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(item_id) REFERENCES item (id), 
    FOREIGN KEY(filer_id) REFERENCES user (id)
);

-- 11. AUDIT LOG (Security tracking)
CREATE TABLE auditlog (
    id INTEGER NOT NULL, 
    actor_id INTEGER NOT NULL, 
    action_type VARCHAR NOT NULL, 
    entity_id INTEGER NOT NULL, 
    details VARCHAR NOT NULL, 
    timestamp DATETIME NOT NULL, 
    PRIMARY KEY (id)
);

-- 12. FAST ID ITEMS (Specialized for ID card matching)
CREATE TABLE fastiditem (
    id INTEGER NOT NULL, 
    type VARCHAR(5) NOT NULL, -- FOUND, LOST
    extracted_id VARCHAR, 
    manual_id VARCHAR, 
    image_url VARCHAR, 
    status VARCHAR(8) NOT NULL, 
    reporter_id INTEGER NOT NULL, 
    location_id INTEGER, 
    description VARCHAR, 
    created_at DATETIME NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(reporter_id) REFERENCES user (id), 
    FOREIGN KEY(location_id) REFERENCES location (id)
);

-- 13. FAST ID MATCHES (Automated links between lost and found IDs)
CREATE TABLE fastidmatch (
    id INTEGER NOT NULL, 
    found_item_id INTEGER NOT NULL, 
    lost_item_id INTEGER NOT NULL, 
    confidence FLOAT NOT NULL, 
    status VARCHAR NOT NULL, 
    created_at DATETIME NOT NULL, 
    resolved_at DATETIME, 
    PRIMARY KEY (id), 
    FOREIGN KEY(found_item_id) REFERENCES fastiditem (id), 
    FOREIGN KEY(lost_item_id) REFERENCES fastiditem (id)
);

-- 14. CV SCAN RESULTS (AI results from image processing)
CREATE TABLE cvscanresult (
    id INTEGER NOT NULL, 
    fast_id_item_id INTEGER NOT NULL, 
    raw_ai_response VARCHAR NOT NULL, 
    detected_id VARCHAR, 
    confidence_score FLOAT NOT NULL, 
    timestamp DATETIME NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(fast_id_item_id) REFERENCES fastiditem (id)
);

-- 15. NOTIFICATIONS
CREATE TABLE notification (
    id INTEGER NOT NULL, 
    user_id INTEGER NOT NULL, 
    type VARCHAR(13) NOT NULL, 
    title VARCHAR NOT NULL, 
    message VARCHAR NOT NULL, 
    is_read BOOLEAN NOT NULL, 
    link VARCHAR, 
    created_at DATETIME NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(user_id) REFERENCES user (id)
);

-- 16. HANDOVER SESSIONS (Staff-mediated giveaway)
CREATE TABLE handoversession (
    id INTEGER NOT NULL, 
    staff_id INTEGER NOT NULL, 
    session_token VARCHAR NOT NULL, 
    claimant_id INTEGER, 
    is_active BOOLEAN NOT NULL, 
    created_at DATETIME NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(staff_id) REFERENCES user (id), 
    FOREIGN KEY(claimant_id) REFERENCES user (id)
);
CREATE UNIQUE INDEX ix_handoversession_session_token ON handoversession (session_token);
