# Lost & Found Management System (LFMS V3.0) - Documentation & ERD Guide

## 1. Project Summary
The **Lost & Found Management System (LFMS V2.0)** is a comprehensive platform designed to streamline the process of reporting, finding, and reclaiming lost items within an institution (like a university). It features advanced verification methods, automated matching for student IDs (Fast ID), and secure handover protocols.

### Key Features:
- **Core Lost & Found:** Users can report lost items or log found items.
- **Fast ID (AI Matching):** Specifically for Student ID cards. Uses CV/AI to extract IDs from photos and match them automatically.
- **Verification System:** Includes "Secret" descriptions and Quiz-based verification to ensure items are returned to rightful owners.
- **Path-based Recovery:**
    - **Path A (Direct):** Finder and Owner meet directly using an OTP (One-Time Password) for security.
    - **Path B (Staff-Mediated):** Items are deposited at a central office and handed over by staff.
- **Audit Logging:** Every critical action (QR scans, state changes) is logged for security.

---

## 2. Database Documentation (Data Model)

The system uses a relational database schema (SQLite) managed via SQLAlchemy/SQLModel.

### Core Entities:
1.  **User**: Stores user profiles (Student, Staff, Admin) with their unique UIU ID and fraud score.
2.  **Item (Found Item)**: The primary entity for items found. Contains public and private (secret) descriptions.
3.  **LostItem (Lost Report)**: Reports filed by users who have lost something.
4.  **Claim**: A record of a user attempting to claim a found item. Includes verification status and quiz scores.
5.  **Category & Location**: Dynamic tables to organize items by type (Electronic, Wallet, etc.) and place (Library, Cafeteria, etc.).
6.  **FastIDItem**: Specialized entries for ID cards, using AI-extracted ID numbers for automated matching.

### Relationships:
- A **User** can find many **Items** and report many **LostItems**.
- An **Item** belongs to one **Category** and one **Location**.
- Multiple **Claims** can be made against a single **Item**, but only one can be approved.
- **ItemImage** supports multiple photos for both found and lost items.
- **Notification** connects system alerts to specific users.

---

## 3. How to Generate the ERD Model

To get a visual Entity Relationship Diagram (ERD), follow these steps:

### Method A: Using `dbdiagram.io` (Recommended for Clean Visuals)
1.  Go to [dbdiagram.io](https://dbdiagram.io/).
2.  Open the `all_sql_code.sql` file provided.
3.  Copy the SQL code.
4.  In `dbdiagram.io`, click on **Import** -> **Import from PostgreSQL/SQL (Beta)**.
5.  Paste your SQL code and click **Import**.
6.  The tool will automatically generate a visual diagram showing all tables and their foreign key relationships.

### Method B: Using DBeaver (For Database Professionals)
1.  Open **DBeaver** (Free community edition).
2.  Connect to the `database_v2.db` file located in the `backend` folder.
3.  Right-click on the database or specific tables and select **View Diagram**.

### Method C: Automated Script (Python)
If you have `er_alchemy` or `sqlalchemy_schemadisplay` installed, you can generate a PNG directly:
```bash
# Example (requires graphviz)
eralchemy -i sqlite:///backend/database_v2.db -o erd.png
```

---

## 4. Summary of Data Workflow
1.  **Reporting**: A finder posts an `Item`.
2.  **Discovery**: An owner finds the item in the list or the `FastID` system finds a match.
3.  **Claiming**: The owner files a `Claim`, answering a "Secret Quiz" based on the `private_description`.
4.  **Verification**: The finder or staff approves the claim.
5.  **Handover**:
    - **Path A**: Finder generates an `OTP`, Owner provides it to confirm pickup.
    - **Path B**: Staff initiates a `HandoverSession` to log the official return.
6.  **Resolution**: Item state moves to `RESOLVED` and is eventually archived.
