#!/usr/bin/env python3
"""
Comprehensive API Test Suite for DS Club Portal
Tests ALL endpoints to ensure they work correctly with the new backend structure.
Matches all endpoints defined in frontend/src/services/api.js
"""

import requests
import time
import json
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000/api"

# Test results tracking
results = {"passed": 0, "failed": 0, "tests": []}

# Store data between tests
test_data = {
    "admin_token": None,
    "refresh_token": None,
    "student_token": None,
    "event_id": None,
    "session_id": None,
    "qr_payload": None,
    "approval_request_id": None,
    "test_user_id": None,
    "test_user_email": None,
}

def log_test(name, passed, details=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    results["passed" if passed else "failed"] += 1
    results["tests"].append({"name": name, "passed": passed, "details": details})
    print(f"{status}: {name}")
    if details and not passed:
        print(f"   Details: {details}")

def get_auth_header(token):
    return {"Authorization": f"Bearer {token}"}

# ============================================
# AUTH TESTS
# ============================================

def test_auth_login_admin():
    """Test admin login"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data={"username": "admin@dsclub.com", "password": "SecureAdmin@2026"}
        )
        if response.status_code == 200:
            data = response.json()
            has_tokens = "access_token" in data and "refresh_token" in data
            log_test("Auth: Admin Login", has_tokens, str(data.keys()))
            return data.get("access_token"), data.get("refresh_token")
        else:
            log_test("Auth: Admin Login", False, f"Status: {response.status_code}, {response.text}")
            return None, None
    except Exception as e:
        log_test("Auth: Admin Login", False, str(e))
        return None, None

def test_auth_login_invalid():
    """Test login with invalid credentials"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data={"username": "invalid@test.com", "password": "wrongpassword"}
        )
        log_test("Auth: Invalid Login Rejected", response.status_code == 401)
    except Exception as e:
        log_test("Auth: Invalid Login Rejected", False, str(e))

def test_auth_signup():
    """Test user signup (creates approval request)"""
    try:
        test_email = f"testuser_{int(time.time())}@test.com"
        response = requests.post(
            f"{BASE_URL}/auth/signup",
            json={
                "email": test_email,
                "password": "TestPass123!",
                "full_name": "Test User"
            }
        )
        if response.status_code in [200, 201]:
            data = response.json()
            has_approval = "approval_request_id" in data or "user_id" in data
            log_test("Auth: Signup", has_approval, str(data))
            return data.get("approval_request_id"), test_email
        else:
            log_test("Auth: Signup", False, f"Status: {response.status_code}, {response.text}")
            return None, None
    except Exception as e:
        log_test("Auth: Signup", False, str(e))
        return None, None

def test_auth_me(token):
    """Test get current user"""
    try:
        response = requests.get(
            f"{BASE_URL}/auth/me",
            headers=get_auth_header(token)
        )
        if response.status_code == 200:
            data = response.json()
            log_test("Auth: Get Me", "email" in data and "role" in data, str(data))
        else:
            log_test("Auth: Get Me", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Auth: Get Me", False, str(e))

def test_auth_refresh(refresh_token):
    """Test token refresh"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        if response.status_code == 200:
            data = response.json()
            log_test("Auth: Token Refresh", "access_token" in data)
            return data.get("access_token")
        else:
            log_test("Auth: Token Refresh", False, f"Status: {response.status_code}")
            return None
    except Exception as e:
        log_test("Auth: Token Refresh", False, str(e))
        return None

# ============================================
# APPROVAL WORKFLOW TESTS
# ============================================

def test_get_approval_requests(token):
    """Test getting approval requests"""
    try:
        response = requests.get(
            f"{BASE_URL}/admin/approval-requests",
            headers=get_auth_header(token),
            params={"status_filter": "PENDING"}
        )
        if response.status_code == 200:
            data = response.json()
            log_test("Approval: Get Pending Requests", "requests" in data, f"Found {len(data.get('requests', []))} requests")
            return data.get("requests", [])
        else:
            log_test("Approval: Get Pending Requests", False, f"Status: {response.status_code}")
            return []
    except Exception as e:
        log_test("Approval: Get Pending Requests", False, str(e))
        return []

def test_decide_approval(token, request_id, decision="approved"):
    """Test approving/rejecting a request"""
    try:
        response = requests.post(
            f"{BASE_URL}/admin/approval-requests/{request_id}/decide",
            headers=get_auth_header(token),
            json={
                "decision": decision,
                "approved_role": "student" if decision == "approved" else None,
                "rejection_reason": "Test rejection" if decision == "rejected" else None
            }
        )
        log_test(f"Approval: Decide ({decision})", response.status_code == 200, response.text[:100] if response.text else "")
        return response.status_code == 200
    except Exception as e:
        log_test(f"Approval: Decide ({decision})", False, str(e))
        return False

# ============================================
# EVENT TESTS
# ============================================

def test_create_event(token):
    """Test creating an event"""
    try:
        response = requests.post(
            f"{BASE_URL}/events/",
            headers=get_auth_header(token),
            json={
                "title": f"Test Event {int(time.time())}",
                "description": "Test description",
                "scheduled_at": datetime.now().isoformat(),
                "notes": "Test notes"
            }
        )
        if response.status_code in [200, 201]:
            data = response.json()
            log_test("Events: Create Event", "id" in data, str(data))
            return data.get("id")
        else:
            log_test("Events: Create Event", False, f"Status: {response.status_code}, {response.text}")
            return None
    except Exception as e:
        log_test("Events: Create Event", False, str(e))
        return None

def test_get_events(token):
    """Test getting all events"""
    try:
        response = requests.get(
            f"{BASE_URL}/events/",
            headers=get_auth_header(token)
        )
        if response.status_code == 200:
            data = response.json()
            # Response can be a list or dict with 'events' key
            if isinstance(data, dict) and 'events' in data:
                events = data['events']
            elif isinstance(data, list):
                events = data
            else:
                events = []
            log_test("Events: Get All", len(events) >= 0, f"Found {len(events)} events")
            return events
        else:
            log_test("Events: Get All", False, f"Status: {response.status_code}")
            return []
    except Exception as e:
        log_test("Events: Get All", False, str(e))
        return []

def test_get_event(token, event_id):
    """Test getting a single event"""
    try:
        response = requests.get(
            f"{BASE_URL}/events/{event_id}",
            headers=get_auth_header(token)
        )
        log_test("Events: Get One", response.status_code == 200)
    except Exception as e:
        log_test("Events: Get One", False, str(e))

def test_update_event(token, event_id):
    """Test updating an event"""
    try:
        response = requests.put(
            f"{BASE_URL}/events/{event_id}",
            headers=get_auth_header(token),
            json={
                "title": "Updated Test Event",
                "description": "Updated description"
            }
        )
        log_test("Events: Update", response.status_code == 200)
    except Exception as e:
        log_test("Events: Update", False, str(e))

# ============================================
# ATTENDANCE TESTS
# ============================================

def test_start_attendance_session(token, event_id):
    """Test starting an attendance session"""
    try:
        response = requests.post(
            f"{BASE_URL}/attendance/start-session",
            headers=get_auth_header(token),
            json={"event_id": event_id}
        )
        if response.status_code == 200:
            data = response.json()
            has_qr = "qr_payload" in data and "session_id" in data
            log_test("Attendance: Start Session", has_qr, f"Session: {data.get('session_id', 'N/A')[:20]}...")
            return data.get("session_id"), data.get("qr_payload")
        else:
            log_test("Attendance: Start Session", False, f"Status: {response.status_code}, {response.text}")
            return None, None
    except Exception as e:
        log_test("Attendance: Start Session", False, str(e))
        return None, None

def test_refresh_qr(token, session_id):
    """Test refreshing QR code"""
    try:
        response = requests.post(
            f"{BASE_URL}/attendance/refresh-qr/{session_id}",
            headers=get_auth_header(token)
        )
        if response.status_code == 200:
            data = response.json()
            log_test("Attendance: Refresh QR", "qr_payload" in data)
            return data.get("qr_payload")
        else:
            log_test("Attendance: Refresh QR", False, f"Status: {response.status_code}")
            return None
    except Exception as e:
        log_test("Attendance: Refresh QR", False, str(e))
        return None

def test_get_active_session(token):
    """Test getting active session"""
    try:
        response = requests.get(
            f"{BASE_URL}/attendance/active-session",
            headers=get_auth_header(token)
        )
        log_test("Attendance: Get Active Session", response.status_code == 200)
        return response.json() if response.status_code == 200 else None
    except Exception as e:
        log_test("Attendance: Get Active Session", False, str(e))
        return None

def test_mark_attendance(token, qr_payload):
    """Test marking attendance with QR payload"""
    try:
        response = requests.post(
            f"{BASE_URL}/attendance/mark",
            headers=get_auth_header(token),
            json={"qr_payload": qr_payload}
        )
        # Note: This may fail for admin since they're not a student
        # 400 with "already marked" or 403 is expected for admin
        passed = response.status_code in [200, 400, 403]
        log_test("Attendance: Mark (admin attempt)", passed, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Attendance: Mark (admin attempt)", False, str(e))

def test_get_event_attendance(token, event_id):
    """Test getting event attendance"""
    try:
        response = requests.get(
            f"{BASE_URL}/attendance/event/{event_id}",
            headers=get_auth_header(token)
        )
        log_test("Attendance: Get Event Attendance", response.status_code == 200)
    except Exception as e:
        log_test("Attendance: Get Event Attendance", False, str(e))

def test_stop_session(token, session_id):
    """Test stopping an attendance session"""
    try:
        response = requests.post(
            f"{BASE_URL}/attendance/stop-session/{session_id}",
            headers=get_auth_header(token)
        )
        log_test("Attendance: Stop Session", response.status_code == 200)
    except Exception as e:
        log_test("Attendance: Stop Session", False, str(e))

def test_attendance_stats(token):
    """Test getting attendance stats"""
    try:
        response = requests.get(
            f"{BASE_URL}/attendance/stats",
            headers=get_auth_header(token)
        )
        log_test("Attendance: Get Stats", response.status_code == 200)
    except Exception as e:
        log_test("Attendance: Get Stats", False, str(e))

# ============================================
# ADMIN TESTS
# ============================================

def test_admin_stats(token):
    """Test getting admin stats"""
    try:
        response = requests.get(
            f"{BASE_URL}/admin/stats",
            headers=get_auth_header(token)
        )
        if response.status_code == 200:
            data = response.json()
            log_test("Admin: Get Stats", True, str(data))
        else:
            log_test("Admin: Get Stats", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Admin: Get Stats", False, str(e))

def test_admin_get_members(token):
    """Test getting all members"""
    try:
        response = requests.get(
            f"{BASE_URL}/admin/members",
            headers=get_auth_header(token)
        )
        if response.status_code == 200:
            data = response.json()
            log_test("Admin: Get Members", isinstance(data, list), f"Found {len(data)} members")
        else:
            log_test("Admin: Get Members", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Admin: Get Members", False, str(e))

# ============================================
# RESOURCES TESTS
# ============================================

def test_get_resources(token):
    """Test getting resources"""
    try:
        response = requests.get(
            f"{BASE_URL}/resources/",
            headers=get_auth_header(token)
        )
        log_test("Resources: Get All", response.status_code == 200)
    except Exception as e:
        log_test("Resources: Get All", False, str(e))

# ============================================
# MAIN TEST RUNNER
# ============================================

def run_all_tests():
    print("=" * 60)
    print("DS Club Portal - Comprehensive API Test Suite")
    print("=" * 60)
    print(f"Base URL: {BASE_URL}")
    print(f"Time: {datetime.now().isoformat()}")
    print("=" * 60)
    
    # 1. Auth Tests
    print("\n📌 AUTH TESTS")
    print("-" * 40)
    admin_token, refresh_token = test_auth_login_admin()
    test_auth_login_invalid()
    
    if admin_token:
        test_auth_me(admin_token)
        new_token = test_auth_refresh(refresh_token)
        if new_token:
            admin_token = new_token  # Use refreshed token
    
    # 2. Signup and Approval Tests
    print("\n📌 SIGNUP & APPROVAL TESTS")
    print("-" * 40)
    approval_id, test_email = test_auth_signup()
    
    if admin_token:
        requests_list = test_get_approval_requests(admin_token)
        
        # If we have a new signup request, test approval
        if approval_id:
            test_decide_approval(admin_token, approval_id, "approved")
    
    # 3. Event Tests
    print("\n📌 EVENT TESTS")
    print("-" * 40)
    if admin_token:
        event_id = test_create_event(admin_token)
        test_get_events(admin_token)
        
        if event_id:
            test_get_event(admin_token, event_id)
            test_update_event(admin_token, event_id)
    
    # 4. Attendance Tests
    print("\n📌 ATTENDANCE TESTS")
    print("-" * 40)
    if admin_token and event_id:
        session_id, qr_payload = test_start_attendance_session(admin_token, event_id)
        
        if session_id:
            test_get_active_session(admin_token)
            new_qr = test_refresh_qr(admin_token, session_id)
            
            if new_qr:
                test_mark_attendance(admin_token, new_qr)
            
            test_get_event_attendance(admin_token, event_id)
            test_stop_session(admin_token, session_id)
    
    test_attendance_stats(admin_token)
    
    # 5. Admin Tests
    print("\n📌 ADMIN TESTS")
    print("-" * 40)
    if admin_token:
        test_admin_stats(admin_token)
        test_admin_get_members(admin_token)
    
    # 6. Resources Tests
    print("\n📌 RESOURCES TESTS")
    print("-" * 40)
    if admin_token:
        test_get_resources(admin_token)
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    total = results["passed"] + results["failed"]
    print(f"Total Tests: {total}")
    print(f"Passed: {results['passed']} ✅")
    print(f"Failed: {results['failed']} ❌")
    print(f"Success Rate: {results['passed']/total*100:.1f}%" if total > 0 else "N/A")
    print("=" * 60)
    
    if results["failed"] > 0:
        print("\n❌ FAILED TESTS:")
        for test in results["tests"]:
            if not test["passed"]:
                print(f"  - {test['name']}: {test['details']}")
    
    return results["failed"] == 0

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
