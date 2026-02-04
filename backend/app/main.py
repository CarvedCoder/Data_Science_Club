from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import os

from .database import engine, init_db, SessionLocal, check_db_connection
from .models.user import User, UserRole
from .utils.security import get_password_hash
from .config import get_settings

from .routes import auth, events, attendance, admin, resources, member

app = FastAPI(
    title="DS Club Portal",
    description="Data Science Club Portal API",
    version="1.0.0"
)

# CORS - configure for production
origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
app.include_router(member.router)

@app.on_event("startup")
def startup_event():
    init_db()
    
    # Create admin user if not exists
    db = SessionLocal()
    settings = get_settings()
    
    try:
        admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if not admin:
            admin = User(
                email=settings.ADMIN_EMAIL,
                full_name="Admin",
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            db.commit()
            print(f"Admin user created: {settings.ADMIN_EMAIL}")
    except Exception as e:
        print(f"Error during startup: {e}")
        db.rollback()
    finally:
        db.close()

@app.get("/")
def root():
    return {"message": "DS Club Portal API", "status": "running", "version": "1.0.0"}

@app.get("/health")
def health_check():
    """Health check endpoint for container orchestration."""
    db_healthy = check_db_connection()
    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "database": "connected" if db_healthy else "disconnected"
    }