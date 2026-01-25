#!/usr/bin/env python3
"""
Add profile fields to users table
Run this script to add section, branch, year, bio, and skills columns
"""

import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(__file__), 'ds_club.db')
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get existing columns
    cursor.execute("PRAGMA table_info(users)")
    existing_columns = {row[1] for row in cursor.fetchall()}
    
    # Columns to add
    new_columns = [
        ("section", "TEXT"),
        ("branch", "TEXT"),
        ("year", "TEXT"),
        ("bio", "TEXT"),
        ("skills", "TEXT"),
    ]
    
    for col_name, col_type in new_columns:
        if col_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
                print(f"Added column: {col_name}")
            except sqlite3.OperationalError as e:
                print(f"Column {col_name} might already exist: {e}")
        else:
            print(f"Column {col_name} already exists")
    
    conn.commit()
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
