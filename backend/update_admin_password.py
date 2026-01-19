#!/usr/bin/env python3
"""
Script to update admin password securely.
Usage: python update_admin_password.py
"""

import sys
import sqlite3
from passlib.context import CryptContext

# Initialize password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def update_admin_password(new_password: str, db_path: str = "ds_club.db"):
    """Update admin password in database."""
    
    # Generate hash
    print(f"Generating bcrypt hash for new password...")
    hashed_password = pwd_context.hash(new_password)
    print(f"Generated hash: {hashed_password[:30]}...")
    
    # Update database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "UPDATE users SET hashed_password = ? WHERE email = ?",
            (hashed_password, "admin@dsclub.com")
        )
        conn.commit()
        
        if cursor.rowcount > 0:
            print(f"✅ Admin password updated successfully!")
            print(f"📧 Email: admin@dsclub.com")
            print(f"🔑 New Password: {new_password}")
            print(f"\n⚠️  Save this password securely!")
        else:
            print("❌ Admin user not found in database")
            
    except Exception as e:
        print(f"❌ Error updating password: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    # Set new secure password
    NEW_PASSWORD = "SecureAdmin@2026"
    
    print("=" * 60)
    print("DS Club Portal - Admin Password Update")
    print("=" * 60)
    
    update_admin_password(NEW_PASSWORD)
    
    print("\n" + "=" * 60)
    print("You can now login with the new credentials!")
    print("=" * 60)
