from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables
from api import quiz

app = FastAPI(
    title="Find-X: UIU Lost & Found Management System",
    description="Backend API for Find-X",
    version="1.0.0"
)

# CORS configuration
origins = [
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

from api import quiz, items, upload, gatekeeper, browse, claims

app.include_router(quiz.router, prefix="/api/quiz", tags=["quiz"])
app.include_router(items.router, prefix="/api/items", tags=["items"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(gatekeeper.router, prefix="/api/auth", tags=["auth"])
app.include_router(browse.router, prefix="/api/browse", tags=["browse"])
app.include_router(claims.router, prefix="/api/claims", tags=["claims"])

# Mount uploads directory to serve static files
from fastapi.staticfiles import StaticFiles
import os
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Welcome to Find-X API"}
