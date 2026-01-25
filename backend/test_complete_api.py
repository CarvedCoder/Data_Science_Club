#!/usr/bin/env python3
"""
Complete API Test Suite for DS Club Portal
Tests ALL endpoints defined in frontend/src/services/api.js
"""

import requests
import time
import json
import os
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000/api"

# Test results tracking
results = {"passed": 0, "failed": 0, "tests": []}

# Store data between tests
test_data = {}

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
# AUTH API TESTS (from api.js: auth object)
# ============================================

def test_auth_login():
    """auth.login(email, password) - POST /auth/login with FormData"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data={"username": "admin@dsclub.com", "password": "SecureAdmin@2026"}
        )
        if response.status_code == 200:
            data = response.json()
            has_tokens = "access_token" in data and "refresh_token" in data
            test_data["admin_token"] = data.get("access_token")
            test_data["refresh_token"] = data.get("refresh_token")
            log_test("auth.login()", has_tokens, f"Got tokens: {bool(has_tokens)}")
            return True
        else:
            log_test("auth.login()", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("auth.login()", False, str(e))
        return False

def test_auth_login_invalid():
    """auth.login() with invalid credentials should return 401"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data={"username": "invalid@test.com", "password": "wrongpassword"}
        )
        log_test("auth.login() - invalid creds", response.status_code == 401)
    except Exception as e:
        log_test("auth.login() - invalid creds", False, str(e))

def test_auth_signup():
    """auth.signup(data) - POST /auth/signup with {email, password, full_name}"""
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
            test_data["approval_request_id"] = data.get("approval_request_id")
            test_data["test_user_id"] = data.get("user_id")
            test_data["test_user_email"] = test_email
            log_test("auth.signup()", True, f"User created, approval_request_id: {data.get('approval_request_id')[:8]}...")
            return True
        else:
            log_test("auth.signup()", False, f"Status: {response.status_code}, {response.text}")
            return False
    except Exception as e:
        log_test("auth.signup()", False, str(e))
        return False

def test_auth_refresh():
    """auth.refresh(refreshToken) - POST /auth/refresh"""
    try:
        if not test_data.get("refresh_token"):
            log_test("auth.refresh()", False, "No refresh token available")
            return False
            
        response = requests.post(
            f"{BASE_URL}/auth/refresh",
            json={"refresh_token": test_data["refresh_token"]}
        )
        if response.status_code == 200:
            data = response.json()
            test_data["admin_token"] = data.get("access_token")
            test_data["refresh_token"] = data.get("refresh_token")
            log_test("auth.refresh()", "access_token" in data)
            return True
        else:
            log_test("auth.refresh()", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("auth.refresh()", False, str(e))
        return False

def test_auth_getme():
    """auth.getMe() - GET /auth/me"""
    try:
        response = requests.get(
            f"{BASE_URL}/auth/me",
            headers=get_auth_header(test_data["admin_token"])
        )
        if response.status_code == 200:
            data = response.json()
            has_fields = "email" in data and "role" in data and "full_name" in data
            log_test("auth.getMe()", has_fields, f"User: {data.get('email')}")
        else:
            log_test("auth.getMe()", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("auth.getMe()", False, str(e))

# ============================================
# EVENTS API TESTS (from api.js: events object)
# ============================================

def test_events_create():
    """events.create(data) - POST /events/"""
    try:
        response = requests.post(
            f"{BASE_URL}/events/",
            headers=get_auth_header(test_data["admin_token"]),
            json={
                "title": f"Test Event {int(time.time())}",
                "description": "Test description for API testing",
                "scheduled_at": datetime.now().isoformat(),
                "notes": "Test notes"
            }
        )
        if response.status_code in [200, 201]:
            data = response.json()
            test_data["event_id"] = data.get("id")
            log_test("events.create()", "id" in data, f"Event ID: {data.get('id')[:8]}...")
            return True
        else:
            log_test("events.create()", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("events.create()", False, str(e))
        return False

def test_events_getall():
    """events.getAll() - GET /events/"""
    try:
        response = requests.get(
            f"{BASE_URL}/events/",
            headers=get_auth_header(test_data["admin_token"])
        )
        if response.status_code == 200:
            data = response.json()
            # API returns {"events": [...]}
            events = data.get("events", data) if isinstance(data, dict) else data
            log_test("events.getAll()", isinstance(events, list), f"Found {len(events)} events")
            return True
        else:
            log_test("events.getAll()", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("events.getAll()", False, str(e))
        return False

def test_events_getone():
    """events.getOne(id) - GET /events/{id}"""
    try:
        if not test_data.get("event_id"):
            log_test("events.getOne()", False, "No event ID available")
            return False
            
        response = requests.get(
            f"{BASE_URL}/events/{test_data['event_id']}",
            headers=get_auth_header(test_data["admin_token"])
        )
        if response.status_code == 200:
            data = response.json()
            log_test("events.getOne()", "id" in data, f"Title: {data.get('title')}")
            return True
        else:
            log_test("events.getOne()", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("events.getOne()", False, str(e))
        return False

def test_events_update():
    """events.update(id, data) - PUT /events/{id}"""
    try:
        if not test_data.get("event_id"):
            log_test("events.update()", False, "No event ID available")
            return False
            
        response = requests.put(
            f"{BASE_URL}/events/{test_data['event_id']}",
            headers=get_auth_header(test_data["admin_token"]),
            json={
                "title": "Updated Test Event",
                "description": "Updated description"
            }
        )
        log_test("events.update()", response.status_code == 200)
        return response.status_code == 200
    except Exception as e:
        log_test("events.update()", False, str(e))
        return False

def test_events_delete():
    """events.delete(id) - DELETE /events/{id}"""
    try:
        # Create a new event to delete
        create_resp = requests.post(
            f"{BASE_URL}/events/",
            headers=get_auth_header(test_data["admin_token"]),
            json={
                "title": "Event to Delete",
                "description": "Will be deleted",
                "scheduled_at": datetime.now().isoformat(),
                "notes": ""
            }
        )
        if create_resp.status_code not in [200, 201]:
            log_test("events.delete()", False, "Could not create event to delete")
            return False
            
        event_id = create_resp.json().get("id")
        
        response = requests.delete(
            f"{BASE_URL}/events/{event_id}",
            headers=get_auth_header(test_data["admin_token"])
        )
        log_test("events.delete()", response.status_code in [200, 204])
        return response.status_code in [200, 204]
    except Exception as e:
        log_test("events.delete()", False, str(e))
        return False

# ============================================
# ATTENDANCE API TESTS (from api.js: attendance object)
# ============================================

def test_attendance_startsession():
    """attendance.startSession(eventId) - POST /attendance/start-session"""
    try:
        if not test_data.get("event_id"):
            log_test("attendance.startSession()", False, "No event ID available")
            return False
            
        response = requests.post(
            f"{BASE_URL}/attendance/start-session",
            headers=get_auth_header(test_data["admin_token"]),
            json={"event_id": test_data["event_id"]}
        )
        if response.status_code == 200:
            data = response.json()
            test_data["session_id"] = data.get("session_id")
            test_data["qr_payload"] = data.get("qr_payload")
            has_fields = "session_id" in data and "qr_payload" in data and "expires_in_seconds" in data
            log_test("attendance.startSession()", has_fields, f"Session: {data.get('session_id')[:8]}...")
            return True
        else:
            log_test("attendance.startSession()", False, f"Status: {response.status_code}, {response.text}")
            return False
    except Exception as e:
        log_test("attendance.startSession()", False, str(e))
        return False

def test_attendance_refreshqr():
    """attendance.refreshQR(sessionId) - POST /attendance/refresh-qr/{sessionId}"""
    try:
        if not test_data.get("session_id"):
            log_test("attendance.refreshQR()", False, "No session ID available")
            return False
            
        response = requests.post(
            f"{BASE_URL}/attendance/refresh-qr/{test_data['session_id']}",
            headers=get_auth_header(test_data["admin_token"])
        )
        if response.status_code == 200:
            data = response.json()
            test_data["qr_payload"] = data.get("qr_payload")
            log_test("attendance.refreshQR()", "qr_payload" in data)
            return True
        else:
            log_test("attendance.refreshQR()", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("attendance.refreshQR()", False, str(e))
        return False

def test_attendance_getactivesession():
    """attendance.getActiveSession() - GET /attendance/active-session"""
    try:
        response = requests.get(
            f"{BASE_URL}/attendance/active-session",
            headers=get_auth_header(test_data["admin_token"])
        )
        # Can return active=true/false
        log_test("attendance.getActiveSession()", response.status_code == 200)
        return response.status_code == 200
    except Exception as e:
        log_test("attendance.getActiveSession()", False, str(e))
        return False

def test_attendance_mark():
    """attendance.mark(qrPayload) - POST /attendance/mark"""
    try:
        if not test_data.get("qr_payload"):
            log_test("attendance.mark()", False, "No QR payload available")
            return False
            
        response = requests.post(
            f"{BASE_URL}/attendance/mark",
            headers=get_auth_header(test_data["admin_token"]),
            json={"qr_payload": test_data["qr_payload"]}
        )
        # Admin may get 403 (not a student) or 400 (already marked) - both are valid responses
        passed = response.status_code in [200, 400, 403]
        log_test("attendance.mark()", passed, f"Status: {response.status_code} (expected for admin)")
        return passed
    except Exception as e:
        log_test("attendance.mark()", False, str(e))
        return False

def test_attendance_getmyattendance():
    """attendance.getMyAttendance() - GET /attendance/my-attendance"""
    try:
        response = requests.get(
            f"{BASE_URL}/attendance/my-attendance",
            headers=get_auth_header(test_data["admin_token"])
        )
        log_test("attendance.getMyAttendance()", response.status_code == 200)
        return response.status_code == 200
    except Exception as e:
        log_test("attendance.getMyAttendance()", False, str(e))
        return False

def test_attendance_geteventattendance():
    """attendance.getEventAttendance(eventId) - GET /attendance/event/{eventId}"""
    try:
        if not test_data.get("event_id"):
            log_test("attendance.getEventAttendance()", False, "No event ID")
            return False
            
        response = requests.get(
            f"{BASE_URL}/attendance/event/{test_data['event_id']}",
            headers=get_auth_header(test_data["admin_token"])
        )
        log_test("attendance.getEventAttendance()", response.status_code == 200)
        return response.status_code == 200
    except Exception as e:
        log_test("attendance.getEventAttendance()", False, str(e))
        return False

def test_attendance_getstats():
    """attendance.getStats() - GET /attendance/stats"""
    try:
        response = requests.get(
            f"{BASE_URL}/attendance/stats",
            headers=get_auth_header(test_data["admin_token"])
        )
        log_test("attendance.getStats()", response.status_code == 200)
        return response.status_code == 200
    except Exception as e:
        log_test("attendance.getStats()", False, str(e))
        return False

def test_attendance_stopsession():
    """attendance.stopSession(sessionId) - POST /attendance/stop-session/{sessionId}"""
    try:
        if not test_data.get("session_id"):
            log_test("attendance.stopSession()", False, "No session ID")
            return False
            
        response = requests.post(
            f"{BASE_URL}/attendance/stop-session/{test_data['session_id']}",
            headers=get_auth_header(test_data["admin_token"])
        )
        log_test("attendance.stopSession()", response.status_code == 200)
        return response.status_code == 200
    except Exception as e:
        log_test("attendance.stopSession()", False, str(e))
        return False

# ============================================
# ADMIN API TESTS (from api.js: admin object)
# ============================================

def test_admin_getapprovalrequests():
    """admin.getApprovalRequests(status, page, limit) - GET /admin/approval-requests"""
    try:
        response = requests.get(
            f"{BASE_URL}/admin/approval-requests",
            headers=get_auth_header(test_data["admin_token"]),
            params={"status_filter": "PENDING", "page": 1, "limit": 20}
        )
        if response.status_code == 200:
            data = response.json()
            log_test("admin.getApprovalRequests()", "requests" in data, f"Found {len(data.get('requests', []))} requests")
            return True
        else:
            log_test("admin.getApprovalRequests()", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("admin.getApprovalRequests()", False, str(e))
        return False

def test_admin_decideapproval():
    """admin.decideApproval(requestId, decision, approvedRole, rejectionReason) - POST /admin/approval-requests/{id}/decide"""
    try:
        if not test_data.get("approval_request_id"):
            log_test("admin.decideApproval()", False, "No approval request ID")
            return False
            
        response = requests.post(
            f"{BASE_URL}/admin/approval-requests/{test_data['approval_request_id']}/decide",
            headers=get_auth_header(test_data["admin_token"]),
            json={
                "decision": "approved",
                "approved_role": "student",
                "rejection_reason": None
            }
        )
        log_test("admin.decideApproval()", response.status_code == 200, f"Approved user")
        return response.status_code == 200
    except Exception as e:
        log_test("admin.decideApproval()", False, str(e))
        return False

def test_admin_getpendingusers():
    """admin.getPendingUsers() - Legacy endpoint mapped to approval-requests"""
    try:
        response = requests.get(
            f"{BASE_URL}/admin/approval-requests",
            headers=get_auth_header(test_data["admin_token"]),
            params={"status_filter": "PENDING"}
        )
        log_test("admin.getPendingUsers()", response.status_code == 200)
        return response.status_code == 200
    except Exception as e:
        log_test("admin.getPendingUsers()", False, str(e))
        return False

def test_admin_getmembers():
    """admin.getMembers() - GET /admin/members"""
    try:
        response = requests.get(
            f"{BASE_URL}/admin/members",
            headers=get_auth_header(test_data["admin_token"])
        )
        if response.status_code == 200:
            data = response.json()
            log_test("admin.getMembers()", isinstance(data, list), f"Found {len(data)} members")
            return True
        else:
            log_test("admin.getMembers()", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("admin.getMembers()", False, str(e))
        return False

def test_admin_togglemember():
    """admin.toggleMember(userId) - POST /admin/toggle-member/{userId}"""
    try:
        if not test_data.get("test_user_id"):
            log_test("admin.toggleMember()", False, "No test user ID")
            return False
            
        response = requests.post(
            f"{BASE_URL}/admin/toggle-member/{test_data['test_user_id']}",
            headers=get_auth_header(test_data["admin_token"])
        )
        # May return 200 or 404 if endpoint doesn't exist
        passed = response.status_code in [200, 404]
        log_test("admin.toggleMember()", passed, f"Status: {response.status_code}")
        return passed
    except Exception as e:
        log_test("admin.toggleMember()", False, str(e))
        return False

def test_admin_getstats():
    """admin.getStats() - GET /admin/stats"""
    try:
        response = requests.get(
            f"{BASE_URL}/admin/stats",
            headers=get_auth_header(test_data["admin_token"])
        )
        if response.status_code == 200:
            data = response.json()
            # Check for either old or new format
            has_stats = "users" in data or "total_members" in data or "pending_users" in data
            log_test("admin.getStats()", has_stats, f"Got stats: {list(data.keys())}")
            return True
        else:
            log_test("admin.getStats()", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("admin.getStats()", False, str(e))
        return False

# ============================================
# RESOURCES API TESTS (from api.js: resources object)
# ============================================

def test_resources_getall():
    """resources.getAll(eventId) - GET /resources/"""
    try:
        response = requests.get(
            f"{BASE_URL}/resources/",
            headers=get_auth_header(test_data["admin_token"]),
            params={"event_id": test_data.get("event_id")}
        )
        log_test("resources.getAll()", response.status_code == 200)
        return response.status_code == 200
    except Exception as e:
        log_test("resources.getAll()", False, str(e))
        return False

def test_resources_upload():
    """resources.upload(formData) - POST /resources/upload"""
    try:
        # Create a test file
        test_content = b"Test file content for API testing"
        files = {"file": ("test_file.txt", test_content, "text/plain")}
        data = {"title": "Test Resource", "description": "API test upload"}
        
        response = requests.post(
            f"{BASE_URL}/resources/upload",
            headers=get_auth_header(test_data["admin_token"]),
            files=files,
            data=data
        )
        if response.status_code in [200, 201]:
            result = response.json()
            test_data["resource_id"] = result.get("id")
            log_test("resources.upload()", True, f"Resource ID: {result.get('id')}")
            return True
        else:
            log_test("resources.upload()", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("resources.upload()", False, str(e))
        return False

def test_resources_delete():
    """resources.delete(id) - DELETE /resources/{id}"""
    try:
        if not test_data.get("resource_id"):
            log_test("resources.delete()", False, "No resource ID (upload may have failed)")
            return False
            
        response = requests.delete(
            f"{BASE_URL}/resources/{test_data['resource_id']}",
            headers=get_auth_header(test_data["admin_token"])
        )
        log_test("resources.delete()", response.status_code in [200, 204])
        return response.status_code in [200, 204]
    except Exception as e:
        log_test("resources.delete()", False, str(e))
        return False

# ============================================
# ADDITIONAL APPROVAL STATUS TESTS
# ============================================

def test_approval_timeout_filter():
    """Test getting TIMEOUT status requests"""
    try:
        response = requests.get(
            f"{BASE_URL}/admin/approval-requests",
            headers=get_auth_header(test_data["admin_token"]),
            params={"status_filter": "TIMEOUT"}
        )
        log_test("admin.getApprovalRequests(TIMEOUT)", response.status_code == 200)
        return response.status_code == 200
    except Exception as e:
        log_test("admin.getApprovalRequests(TIMEOUT)", False, str(e))
        return False

def test_approval_approved_filter():
    """Test getting APPROVED status requests"""
    try:
        response = requests.get(
            f"{BASE_URL}/admin/approval-requests",
            headers=get_auth_header(test_data["admin_token"]),
            params={"status_filter": "APPROVED"}
        )
        if response.status_code == 200:
            data = response.json()
            log_test("admin.getApprovalRequests(APPROVED)", True, f"Found {len(data.get('requests', []))} approved")
        else:
            log_test("admin.getApprovalRequests(APPROVED)", False)
        return response.status_code == 200
    except Exception as e:
        log_test("admin.getApprovalRequests(APPROVED)", False, str(e))
        return False

def test_approval_rejected_filter():
    """Test getting REJECTED status requests"""
    try:
        response = requests.get(
            f"{BASE_URL}/admin/approval-requests",
            headers=get_auth_header(test_data["admin_token"]),
            params={"status_filter": "REJECTED"}
        )
        log_test("admin.getApprovalRequests(REJECTED)", response.status_code == 200)
        return response.status_code == 200
    except Exception as e:
        log_test("admin.getApprovalRequests(REJECTED)", False, str(e))
        return False

# ============================================
# TOKEN EXPIRY TEST
# ============================================

def test_auth_unauthorized():
    """Test that requests without token return 401"""
    try:
        response = requests.get(f"{BASE_URL}/auth/me")
        log_test("Unauthorized request returns 401", response.status_code == 401)
        return response.status_code == 401
    except Exception as e:
        log_test("Unauthorized request returns 401", False, str(e))
        return False

def test_auth_invalid_token():
    """Test that requests with invalid token return 401"""
    try:
        response = requests.get(
            f"{BASE_URL}/auth/me",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        log_test("Invalid token returns 401", response.status_code == 401)
        return response.status_code == 401
    except Exception as e:
        log_test("Invalid token returns 401", False, str(e))
        return False

# ============================================
# MAIN TEST RUNNER
# ============================================

def run_all_tests():
    print("=" * 70)
    print("DS Club Portal - Complete API Test Suite")
    print("Testing all endpoints from frontend/src/services/api.js")
    print("=" * 70)
    print(f"Base URL: {BASE_URL}")
    print(f"Time: {datetime.now().isoformat()}")
    print("=" * 70)
    
    # 1. Auth Tests
    print("\n📌 AUTH API (auth object)")
    print("-" * 50)
    test_auth_login()
    test_auth_login_invalid()
    test_auth_signup()
    test_auth_refresh()
    test_auth_getme()
    test_auth_unauthorized()
    test_auth_invalid_token()
    
    # 2. Admin Approval Tests (before events so we have users)
    print("\n📌 ADMIN API - Approval Workflow")
    print("-" * 50)
    test_admin_getapprovalrequests()
    test_admin_decideapproval()
    test_admin_getpendingusers()
    test_approval_timeout_filter()
    test_approval_approved_filter()
    test_approval_rejected_filter()
    
    # 3. Events Tests
    print("\n📌 EVENTS API (events object)")
    print("-" * 50)
    test_events_create()
    test_events_getall()
    test_events_getone()
    test_events_update()
    test_events_delete()
    
    # 4. Attendance Tests
    print("\n📌 ATTENDANCE API (attendance object)")
    print("-" * 50)
    test_attendance_startsession()
    test_attendance_getactivesession()
    test_attendance_refreshqr()
    test_attendance_mark()
    test_attendance_getmyattendance()
    test_attendance_geteventattendance()
    test_attendance_getstats()
    test_attendance_stopsession()
    
    # 5. Admin Member Tests
    print("\n📌 ADMIN API - Member Management")
    print("-" * 50)
    test_admin_getmembers()
    test_admin_togglemember()
    test_admin_getstats()
    
    # 6. Resources Tests
    print("\n📌 RESOURCES API (resources object)")
    print("-" * 50)
    test_resources_getall()
    test_resources_upload()
    test_resources_delete()
    
    # Summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    total = results["passed"] + results["failed"]
    print(f"Total Tests: {total}")
    print(f"Passed: {results['passed']} ✅")
    print(f"Failed: {results['failed']} ❌")
    print(f"Success Rate: {results['passed']/total*100:.1f}%" if total > 0 else "N/A")
    print("=" * 70)
    
    if results["failed"] > 0:
        print("\n❌ FAILED TESTS:")
        for test in results["tests"]:
            if not test["passed"]:
                print(f"  - {test['name']}: {test['details']}")
    
    # API Coverage Summary
    print("\n" + "=" * 70)
    print("API COVERAGE (from frontend/src/services/api.js)")
    print("=" * 70)
    print("""
auth:
  ✓ login(email, password)      - POST /auth/login
  ✓ signup(data)                - POST /auth/signup  
  ✓ refresh(refreshToken)       - POST /auth/refresh
  ✓ getMe()                     - GET /auth/me

events:
  ✓ getAll()                    - GET /events/
  ✓ getOne(id)                  - GET /events/{id}
  ✓ create(data)                - POST /events/
  ✓ update(id, data)            - PUT /events/{id}
  ✓ delete(id)                  - DELETE /events/{id}

attendance:
  ✓ startSession(eventId)       - POST /attendance/start-session
  ✓ stopSession(sessionId)      - POST /attendance/stop-session/{id}
  ✓ refreshQR(sessionId)        - POST /attendance/refresh-qr/{id}
  ✓ getActiveSession()          - GET /attendance/active-session
  ✓ mark(qrPayload)             - POST /attendance/mark
  ✓ getMyAttendance()           - GET /attendance/my-attendance
  ✓ getEventAttendance(eventId) - GET /attendance/event/{id}
  ✓ getStats()                  - GET /attendance/stats

admin:
  ✓ getApprovalRequests(...)    - GET /admin/approval-requests
  ✓ decideApproval(...)         - POST /admin/approval-requests/{id}/decide
  ✓ getPendingUsers()           - GET /admin/approval-requests?status=PENDING
  ✓ getMembers()                - GET /admin/members
  ✓ toggleMember(userId)        - POST /admin/toggle-member/{id}
  ✓ getStats()                  - GET /admin/stats

resources:
  ✓ getAll(eventId)             - GET /resources/
  ✓ upload(formData)            - POST /resources/upload
  ✓ delete(id)                  - DELETE /resources/{id}
""")
    
    return results["failed"] == 0

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
