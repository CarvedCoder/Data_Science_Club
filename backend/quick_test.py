#!/usr/bin/env python3
"""Quick test of attendance marking"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

# Login as admin
admin_login = {"username": "admin@dsclub.com", "password": "SecureAdmin@2026"}
response = requests.post(f"{BASE_URL}/api/auth/login", data=admin_login)
admin_token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {admin_token}"}

# Get first event
response = requests.get(f"{BASE_URL}/api/events", headers=headers)
events = response.json()
if not events:
    print("No events found!")
    exit(1)

event_id = events[0]["id"]
print(f"Testing with event: {events[0]['title']} ({event_id})")

# Generate QR
response = requests.post(
    f"{BASE_URL}/api/attendance/start-session",
    headers=headers,
    json={"event_id": event_id}
)
if response.status_code != 200:
    print(f"Failed to generate QR: {response.text}")
    exit(1)

qr_data = response.json()
qr_payload = qr_data["qr_payload"]
print(f"QR generated: {qr_payload[:50]}...")

# Get a student token (use existing approved user)
response = requests.get(f"{BASE_URL}/api/admin/members", headers=headers)
members = response.json()
if not members:
    print("No students found!")
    exit(1)

# For testing, we'll use the admin token but the issue is we need a student
# Let me just test with the existing approved user from previous tests

# Try to get login for existing user
print("\nAttempting to mark attendance...")
print(f"This will fail if we don't have a valid student token.")
print("\nNote: Run test_qr_attendance.py instead for full workflow test")
