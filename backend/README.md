# DS Club Portal - Production Backend

A secure, production-grade backend system for managing Data Science Club operations with anti-cheat attendance tracking, approval workflows, and comprehensive audit logging.

## 🔒 Security Features

- **Cryptographically signed QR codes** with HMAC-SHA256
- **60-second QR expiry** to prevent screenshot sharing
- **Nonce-based replay prevention** for attendance anti-cheat
- **Bcrypt password hashing** with configurable cost factor
- **JWT authentication** with refresh token support
- **Role-based access control** (Student/Admin)
- **Comprehensive audit logging** for compliance
- **Rate limiting** to prevent abuse

## 🏗️ Architecture

### Database

**PostgreSQL (Supabase)** - Production-grade cloud database

### Core Tables
- `users` - User accounts with role-based access
- `approval_requests` - Signup approval workflow (3-minute timeout)
- `events` - Class sessions and events
- `qr_sessions` - Cryptographically signed QR codes
- `attendance_records` - Attendance tracking with anti-cheat
- `used_nonces` - Replay attack prevention
- `audit_logs` - Comprehensive audit trail
- `notifications` - Real-time user notifications

### Key Workflows

**1. Signup Approval (3-minute timeout)**
```
User Signup → Pending State → Admin Notification → 
  → Admin Approves (within 3 min) → User Activated
  → Timeout → User Denied
```

**2. QR-Based Attendance (Anti-Cheat)**
```
Admin Generates QR (60s expiry) → 
Student Scans QR →
Server Verifies (signature, expiry, nonce, duplicate) →
Attendance Marked →
Real-time Admin Notification
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Docker (recommended)
- Supabase project

### Docker Deployment (Recommended)

See [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment instructions.

```bash
# Build
docker build -t ds-club-backend .

# Run
docker run -d -p 8000:8000 --env-file .env ds-club-backend
```

### Local Development

1. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

**CRITICAL**: Generate secure secrets:
```bash
# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"

# Generate QR_SIGNING_SECRET (MUST be different)
python -c "import secrets; print(secrets.token_hex(32))"
```

4. **Initialize database:**
```bash
# Option 1: Auto-initialize (recommended for development)
uvicorn app.main:app --reload

# Option 2: Manual initialization (production)
sqlite3 ds_club.db < schema.sql
```

5. **Run the server:**
```bash
uvicorn app.main:app --reload --port 8000
```

API will be available at: `http://localhost:8000`

## 📋 Environment Variables

### Required

```env
# Database
DATABASE_URL=sqlite:///./ds_club.db

# JWT Authentication
SECRET_KEY=your-256-bit-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=15

# QR Security (MUST be different from SECRET_KEY)
QR_SIGNING_SECRET=different-256-bit-key-here
QR_EXPIRY_SECONDS=60

# Admin Credentials
ADMIN_EMAIL=admin@dsclub.com
ADMIN_PASSWORD=Admin@123

# Approval Workflow
APPROVAL_TIMEOUT_MINUTES=3

# Security
BCRYPT_ROUNDS=12
```

### Optional

```env
# Performance
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60

# Monitoring
LOG_LEVEL=INFO
SENTRY_DSN=your-sentry-dsn
REDIS_URL=redis://localhost:6379

# Refresh Tokens
REFRESH_TOKEN_EXPIRE_DAYS=7
```

## 📡 API Endpoints

### Authentication

#### POST /api/auth/signup
Create new user account (requires admin approval).

**Request:**
```json
{
  "email": "student@college.edu",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

**Response:**
```json
{
  "approval_request_id": "uuid",
  "status": "pending",
  "expires_at": "2026-01-18T10:03:00Z",
  "message": "Signup request submitted. Awaiting admin approval."
}
```

#### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "username": "student@college.edu",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "student@college.edu",
    "full_name": "John Doe",
    "role": "student"
  }
}
```

#### GET /api/auth/me
Get current user profile.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "id": "uuid",
  "email": "student@college.edu",
  "full_name": "John Doe",
  "role": "student",
  "is_active": true
}
```

### Approval Management (Admin Only)

#### GET /api/admin/approval-requests
List pending approval requests.

**Query Params:**
- `status`: pending | approved | rejected | timeout (default: pending)
- `page`: 1
- `limit`: 20

**Response:**
```json
{
  "requests": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "email": "student@college.edu",
        "full_name": "John Doe"
      },
      "status": "pending",
      "requested_at": "2026-01-18T10:00:00Z",
      "expires_at": "2026-01-18T10:03:00Z",
      "time_remaining_seconds": 120
    }
  ]
}
```

#### POST /api/admin/approval-requests/:id/decide
Approve or reject a signup request.

**Request:**
```json
{
  "decision": "approved",
  "approved_role": "student",
  "rejection_reason": "Optional reason if rejected"
}
```

### QR Sessions (Admin Only)

#### POST /api/admin/qr-sessions
Generate cryptographic QR code for event.

**Request:**
```json
{
  "event_id": "uuid"
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "qr_payload": "eyJzIjoid...base64-encoded-signed-token",
  "expires_at": "2026-01-18T10:06:00Z",
  "expires_in_seconds": 60
}
```

### Attendance (Student)

#### POST /api/attendance/mark
Mark attendance by scanning QR code.

**Request:**
```json
{
  "qr_payload": "eyJzIjoid...scanned-qr-code"
}
```

**Response (Success):**
```json
{
  "attendance_id": "uuid",
  "event": {
    "id": "uuid",
    "title": "Machine Learning Basics",
    "scheduled_at": "2026-01-25T14:00:00Z"
  },
  "marked_at": "2026-01-18T10:05:30Z",
  "message": "Attendance marked successfully"
}
```

**Response (Error - Expired QR):**
```json
{
  "error": "token_expired",
  "message": "QR code has expired"
}
```

**Response (Error - Duplicate):**
```json
{
  "error": "duplicate_attendance",
  "message": "You have already marked attendance for this event"
}
```

### Events

#### POST /api/admin/events
Create new event (admin only).

**Request:**
```json
{
  "title": "Machine Learning Basics",
  "description": "Introduction to ML algorithms",
  "scheduled_at": "2026-01-25T14:00:00Z",
  "notes": "Bring laptops. Materials: [link]"
}
```

#### GET /api/events
List events (students see own attendance status).

**Query Params:**
- `from`: ISO date (default: 30 days ago)
- `to`: ISO date (default: 90 days future)

**Response:**
```json
{
  "events": [
    {
      "id": "uuid",
      "title": "Machine Learning Basics",
      "scheduled_at": "2026-01-25T14:00:00Z",
      "user_attended": true,
      "attendance_count": 45
    }
  ]
}
```

### Admin Analytics

#### GET /api/admin/stats
Dashboard statistics.

**Response:**
```json
{
  "users": {
    "total": 150,
    "students": 140,
    "admins": 10,
    "pending_approvals": 5
  },
  "events": {
    "total": 25,
    "upcoming": 5
  },
  "attendance": {
    "total_records": 1800,
    "average_attendance_rate": 85.5
  }
}
```

## 🔐 Security Best Practices

### QR Code Security
- **Never reuse QR codes** - Each QR is single-use per student
- **60-second expiry** prevents screenshot sharing
- **HMAC-SHA256 signing** prevents tampering
- **Unique nonce** prevents replay attacks
- **Server-side verification** ensures authenticity

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character

### Token Management
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Tokens include issued-at timestamp
- Constant-time signature comparison

### Rate Limiting
- Login: 10 attempts per 5 minutes per IP
- Signup: 3 attempts per hour per IP
- Attendance marking: 5 attempts per minute per user
- QR generation: 10 per minute per admin

## 🔍 Monitoring & Audit

### Audit Logs
All critical operations are logged:
- User signups and logins
- Approval decisions
- QR code generation
- Attendance marking (including failures)
- Event creation/deletion

### Querying Audit Logs

```python
# Find failed attendance attempts
SELECT * FROM audit_logs 
WHERE action = 'attendance_failed' 
ORDER BY created_at DESC 
LIMIT 100;

# Find suspicious activity from same IP
SELECT ip_address, COUNT(*) as attempts
FROM audit_logs
WHERE action = 'login_failed'
AND created_at > datetime('now', '-1 hour')
GROUP BY ip_address
HAVING attempts > 10;
```

### Background Jobs

**Required:**
1. **Timeout expired approvals** (every 30 seconds)
```python
# Check for expired approval requests and mark as timeout
```

2. **Cleanup old nonces** (every hour)
```python
# Delete nonces older than 1 hour
```

**Optional:**
3. **Archive old audit logs** (monthly)
4. **Send email notifications** (real-time)
5. **Database backups** (daily)

## 🧪 Testing

### Run Tests
```bash
pytest tests/ -v
```

### Security Tests
```bash
# Test password validation
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"weak","full_name":"Test"}'

# Test QR tampering (should fail)
curl -X POST http://localhost:8000/api/attendance/mark \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"qr_payload":"tampered-payload"}'
```

## 📊 Performance

### Database Indexes
All high-traffic queries are optimized with indexes:
- User email lookups: `idx_users_email`
- QR token verification: `idx_qr_sessions_token`
- Attendance queries: `idx_attendance_event_user`

### Expected Performance (1000+ users)
- QR verification: <200ms
- Attendance marking: <500ms
- Login: <300ms
- Dashboard stats: <1s

## 🚨 Troubleshooting

### QR Code Not Working
1. Check `QR_SIGNING_SECRET` is set correctly
2. Verify QR hasn't expired (60s limit)
3. Check system time is synchronized
4. Review audit logs for failure reason

### Approval Timeout Issues
1. Verify `APPROVAL_TIMEOUT_MINUTES` is set
2. Check background job is running
3. Review notification delivery

### Database Errors
1. Check database file permissions
2. Verify SQLite version >= 3.8
3. Check disk space
4. Review connection pool settings

## 📚 Documentation

- **API Documentation:** `http://localhost:8000/docs` (Swagger UI)
- **Database Schema:** `schema.sql`
- **Audit Log Reference:** See documentation in audit_service.py

## 🤝 Contributing

### Code Style
- Follow PEP 8 for Python code
- Use type hints for all functions
- Add docstrings to all public APIs
- Write tests for new features

### Security
- Never commit secrets to git
- Always use parameterized queries
- Validate all user inputs
- Log security events

## 📝 License

This project is part of the DS Club Portal system.

## 👥 Support

For technical support or security issues:

- Create an issue in the repository
- Contact the development team

---

**Version:** 2.0 (Production-Grade)  
**Last Updated:** January 18, 2026  
**Status:** Production Ready
