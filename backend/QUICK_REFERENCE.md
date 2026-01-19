# Production Backend - Quick Reference

## 🔑 Key Security Concepts

### QR Code Anti-Cheat
```
Admin Generates QR → 60s expiry + HMAC signature + unique nonce
Student Scans → Server verifies signature + expiry + nonce not used
Success → Mark attendance + track nonce to prevent reuse
```

### Signup Approval Flow
```
Student Signs Up → Pending State (3 min timeout)
Admin Approves → User activated as Student/Admin
Timeout/Reject → User cannot login
```

### Token Management
```
Access Token: 15 minutes (for API calls)
Refresh Token: 7 days (to get new access token)
Password: Bcrypt with 12 rounds
```

## 📋 Critical Environment Variables

```bash
# MUST BE DIFFERENT - Generate with: openssl rand -hex 32
SECRET_KEY=your-jwt-signing-key-here
QR_SIGNING_SECRET=different-key-for-qr-signing

# Security Settings
ACCESS_TOKEN_EXPIRE_MINUTES=15
QR_EXPIRY_SECONDS=60
APPROVAL_TIMEOUT_MINUTES=3
BCRYPT_ROUNDS=12
```

## 🔒 Password Requirements

- Minimum 8 characters
- 1+ uppercase letter (A-Z)
- 1+ lowercase letter (a-z)
- 1+ digit (0-9)
- 1+ special character (!@#$%^&*...)

## 🚀 Quick Start Commands

```bash
# Setup
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Generate secrets
python -c "import secrets; print('SECRET_KEY:', secrets.token_hex(32))"
python -c "import secrets; print('QR_SIGNING_SECRET:', secrets.token_hex(32))"

# Run server
uvicorn app.main:app --reload --port 8000

# View API docs
open http://localhost:8000/docs
```

## 🎯 Common API Calls

### Student Signup
```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@college.edu",
    "password": "Secure123!",
    "full_name": "John Doe"
  }'
```

### Admin Approve Signup
```bash
curl -X POST http://localhost:8000/api/admin/approval-requests/{id}/decide \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "approved",
    "approved_role": "student"
  }'
```

### Generate QR Code
```bash
curl -X POST http://localhost:8000/api/admin/qr-sessions \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"event_id": "{event_uuid}"}'
```

### Mark Attendance
```bash
curl -X POST http://localhost:8000/api/attendance/mark \
  -H "Authorization: Bearer {student_token}" \
  -H "Content-Type: application/json" \
  -d '{"qr_payload": "{scanned_qr_payload}"}'
```

## 🗄️ Database Quick Queries

### Check Pending Approvals
```sql
SELECT * FROM approval_requests 
WHERE status = 'pending' 
ORDER BY requested_at DESC;
```

### View Recent Attendance
```sql
SELECT u.full_name, e.title, ar.marked_at
FROM attendance_records ar
JOIN users u ON ar.user_id = u.id
JOIN events e ON ar.event_id = e.id
ORDER BY ar.marked_at DESC
LIMIT 20;
```

### Find Suspicious Activity
```sql
SELECT ip_address, COUNT(*) as attempts
FROM audit_logs
WHERE action = 'login_failed'
AND created_at > datetime('now', '-1 hour')
GROUP BY ip_address
HAVING attempts > 5;
```

### Active QR Sessions
```sql
SELECT qs.id, e.title, qs.expires_at
FROM qr_sessions qs
JOIN events e ON qs.event_id = e.id
WHERE qs.is_revoked = 0 
AND qs.expires_at > datetime('now', 'utc');
```

## 🛠️ Troubleshooting

### QR Not Working
1. Check QR_SIGNING_SECRET matches between generation & verification
2. Verify QR hasn't expired (60s max)
3. Check audit_logs for failure reason:
   ```sql
   SELECT * FROM audit_logs 
   WHERE action = 'attendance_failed' 
   ORDER BY created_at DESC LIMIT 10;
   ```

### Approval Stuck
1. Check if request expired:
   ```sql
   SELECT * FROM approval_requests 
   WHERE id = '{request_id}';
   ```
2. Manually approve (admin panel or SQL):
   ```sql
   UPDATE users SET role = 'student', is_active = 1 WHERE id = '{user_id}';
   UPDATE approval_requests SET status = 'approved' WHERE user_id = '{user_id}';
   ```

### Token Expired
- Use refresh token to get new access token
- If refresh expired, user must re-login

## 📊 Key Performance Metrics

| Metric | Target | Critical |
|--------|--------|----------|
| QR Verification | <200ms | >500ms |
| Login | <300ms | >1s |
| Attendance Mark | <500ms | >1s |
| Failed QR Rate | <5% | >10% |
| Login Failures | <10/5min/IP | >20/5min/IP |

## 🔐 Security Checklist

- [ ] SECRET_KEY is 256-bit random (64 hex chars)
- [ ] QR_SIGNING_SECRET is different from SECRET_KEY
- [ ] ACCESS_TOKEN_EXPIRE_MINUTES set to 15 or less
- [ ] BCRYPT_ROUNDS is 12 or higher
- [ ] Database backups configured (daily)
- [ ] HTTPS enabled in production
- [ ] CORS restricted to frontend domain only
- [ ] Rate limiting enabled
- [ ] Audit logs monitored

## 📁 File Structure

```
backend/
├── app/
│   ├── config.py                 # Configuration
│   ├── database.py               # DB connection
│   ├── main.py                   # FastAPI app
│   ├── models/                   # Database models
│   │   ├── user.py
│   │   ├── event.py
│   │   ├── attendance.py         # QR sessions & records
│   │   ├── approval.py           # Approval workflow
│   │   ├── audit_log.py          # Audit trail
│   │   └── notification.py       # Notifications
│   ├── routes/                   # API endpoints
│   │   ├── auth.py               # Signup/login
│   │   ├── admin.py              # Approval management
│   │   ├── events.py             # Event CRUD
│   │   └── attendance.py         # QR & attendance
│   ├── services/                 # Business logic
│   │   ├── qr_service.py         # QR generation/verification
│   │   ├── audit_service.py      # Audit logging
│   │   └── notification_service.py
│   └── utils/
│       └── security.py           # Password/JWT utilities
├── .env                          # Environment variables
├── schema.sql                    # Database schema
└── README.md                     # Documentation
```

## 🆘 Emergency Contacts

- **Security Issue**: Stop server, review audit logs, contact team
- **Data Loss**: Restore from backup, verify integrity
- **Performance Issue**: Check database indexes, connection pool
- **QR Compromise**: Revoke all sessions, rotate QR_SIGNING_SECRET

## 📚 Documentation Links

- API Docs: http://localhost:8000/docs
- Implementation Guide: `../IMPLEMENTATION_GUIDE.md`
- Full README: `README.md`
- Upgrade Summary: `../UPGRADE_SUMMARY.md`

---

**Keep this handy for daily operations!**
