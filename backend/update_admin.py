"""
Script to update or create admin user with credentials from .env
Run this on Render console or locally connected to Supabase
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, init_db
from app.models.user import User, UserRole
from app.utils.security import get_password_hash
from app.config import get_settings

def update_admin():
    init_db()
    db = SessionLocal()
    settings = get_settings()
    
    try:
        # Check if admin with this email exists
        admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        
        if admin:
            # Update existing admin's password
            admin.hashed_password = get_password_hash(settings.ADMIN_PASSWORD)
            admin.role = UserRole.ADMIN.value
            admin.is_active = True
            db.commit()
            print(f"✅ Updated password for existing admin: {settings.ADMIN_EMAIL}")
        else:
            # Check if there's any other admin
            existing_admin = db.query(User).filter(User.role == UserRole.ADMIN.value).first()
            if existing_admin:
                print(f"⚠️  Found existing admin: {existing_admin.email}")
                print(f"   Updating to new email: {settings.ADMIN_EMAIL}")
                existing_admin.email = settings.ADMIN_EMAIL
                existing_admin.hashed_password = get_password_hash(settings.ADMIN_PASSWORD)
                existing_admin.is_active = True
                db.commit()
                print(f"✅ Updated admin credentials")
            else:
                # Create new admin
                new_admin = User(
                    email=settings.ADMIN_EMAIL,
                    full_name="Admin",
                    hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                    role=UserRole.ADMIN.value,
                    is_active=True
                )
                db.add(new_admin)
                db.commit()
                print(f"✅ Created new admin: {settings.ADMIN_EMAIL}")
        
        # Verify
        admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if admin:
            print(f"\n📧 Admin Email: {admin.email}")
            print(f"👤 Role: {admin.role}")
            print(f"✓ Active: {admin.is_active}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    update_admin()
