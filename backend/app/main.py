from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import os

from .database import engine, init_db, SessionLocal
from .models.user import User, UserRole
from .utils.security import get_password_hash
from .config import get_settings

from .routes import auth, events, attendance, admin, resources

app = FastAPI(title="DS Club Portal")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(auth.router)
app.include_router(events.router)
app.include_router(attendance.router)
app.include_router(admin.router)
app.include_router(resources.router)

@app.on_event("startup")
def startup_event():
    init_db()
    
    # Create admin user if not exists
    db = SessionLocal()
    settings = get_settings()
    
    admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
    if not admin:
        admin = User(
            email=settings.ADMIN_EMAIL,
            name="Admin",
            hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        db.commit()
        print(f"Admin user created: {settings.ADMIN_EMAIL}")
    
    db.close()

@app.get("/")
def root():
    return {"message": "DS Club Portal API", "status": "running"}