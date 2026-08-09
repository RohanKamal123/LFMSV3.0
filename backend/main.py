from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="Find-X: UIU Lost & Found Management System",
    description="Backend API for Find-X",
    version="1.0.0"
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://0.0.0.0:5173",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Use specific origins for credentials support
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

from api import quiz, items, upload, gatekeeper, browse, claims, lost_items, fast_id, handover, admin_crud, admin_stats, handover_session, tickets

app.include_router(quiz.router, prefix="/api/quiz", tags=["quiz"])
app.include_router(items.router, prefix="/api/items", tags=["items"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(gatekeeper.router, prefix="/api/auth", tags=["auth"])
app.include_router(browse.router, prefix="/api/browse", tags=["browse"])
app.include_router(claims.router, prefix="/api/claims", tags=["claims"])
app.include_router(lost_items.router, prefix="/api/lost-items", tags=["lost-items"])
app.include_router(fast_id.router, prefix="/api/fast-id", tags=["fast-id"])
app.include_router(handover.router, prefix="/api/handover", tags=["handover"])
app.include_router(admin_crud.router, prefix="/api/admin", tags=["admin"])
app.include_router(admin_stats.router, prefix="/api/admin-stats", tags=["admin-stats"])
app.include_router(handover_session.router, prefix="/api/handover-session", tags=["handover-session"])
app.include_router(tickets.router, prefix="/api/tickets", tags=["tickets"])


# Mount uploads directory to serve static files
from fastapi.staticfiles import StaticFiles
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Welcome to Find-X API"}
