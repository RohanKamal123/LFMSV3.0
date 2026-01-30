# Find-X: UIU Lost & Found Management System

## Project Structure
- `backend/`: FastAPI Backend with SQLModel (SQLite)
- `frontend/`: React + Vite + Tailwind CSS Frontend

## How to Run

### 1. Backend
```bash
cd backend
# Create virtual environment (optional but recommended)
# python -m venv venv
# .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run Server
uvicorn main:app --reload
```
API Documentation: http://localhost:8000/docs

### 2. Seed Demo Data (Optional)
To populate the database with realistic UIU datasets (Students, Items, Locations):
```bash
cd backend
python seed_db.py
```
*Note: This will reset the database and create fresh records.*

### 3. Frontend
```bash
cd frontend
# Install dependencies
npm install

# Run Dev Server
npm run dev
```
Frontend URL: http://localhost:5173

## Features
- **Finder**: Report items with photo and details (Public & Private).
- **Owner**: Verify ownership via AI-generated Quiz (Mocked/Gemini).
- **Staff**: Scan QR codes and manage handovers.
- **Admin**: Dashboard with stats and item tracking.
