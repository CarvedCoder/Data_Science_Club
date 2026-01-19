# Production Backend System - Implementation Guide

## Overview

This document describes the production-grade backend implementation for the DS Club Portal, focusing on security, anti-cheat mechanisms, and scalability.

## Key Security Features Implemented

### 1. Authentication & Authorization
- **Bcrypt password hashing** with configurable cost factor (default: 12)
- **JWT-based authentication** with short-lived tokens (15 minutes)
- **Refresh token support** for seamless user experience
- **Password strength validation** enforcing complexity requirements
- **Role-based access control** (Student/Admin roles)

### 2. Approval Workflow
- All new signups enter **PENDING state** and require admin approval
- **3-minute timeout** on approval requests
- **Real-time notifications** to admins on new signups
- **Audit logging** of all approval decisions
- Users cannot login until approved

### 3. QR Code Anti-Cheat System
- **HMAC-SHA256 cryptographic signing** prevents tampering
- **60-second expiry** limits screenshot sharing window
- **Unique nonces** prevent replay attacks
- **Server-side verification** ensures authenticity
- **Used-nonce tracking** prevents QR code reuse

### 4. Audit & Compliance
- Comprehensive audit logging of all critical operations:
  - Signups, logins, approval decisions
  - QR generation and attendance marking
  - Event creation/deletion
- IP address and user agent tracking
- Immutable audit trail for compliance

## Database Schema Changes

### New Tables Added:
1. **approval_requests** - Manages signup approval workflow
2. **qr_sessions** - Stores cryptographically signed QR codes
3. **used_nonces** - Prevents replay attacks
4. **audit_logs** - Comprehensive audit trail
5. **notifications** - Real-time user notifications

### Updated Tables:
1. **users**
   - Changed ID to UUID (String type for SQLite compatibility)
   - Added `full_name` field
   - Made `role` nullable (NULL until approved)
   - Set `is_active` default to FALSE
   - Added `last_login_at` tracking

2. **events**
   - Changed ID to UUID
   - Added `created_by` foreign key
   - Added `is_deleted` soft delete flag
   - Added `notes` field for resources

3. **attendance_records** (renamed from attendance_sessions)
   - Complete restructure for QR-based system
   - Links to `qr_sessions` instead of simple tokens
   - Added IP and user agent tracking
   - Unique constraint: one attendance per user per event

## Configuration Updates

### New Environment Variables Required:

```env
# Existing
DATABASE_URL=sqlite:///./ds_club.db
SECRET_KEY=your-256-bit-key-here
ADMIN_EMAIL=admin@dsclub.com
ADMIN_PASSWORD=Admin@123

# New - CRITICAL for security
QR_SIGNING_SECRET=different-256-bit-key-here  # Must be different from SECRET_KEY
ACCESS_TOKEN_EXPIRE_MINUTES=15  # Reduced from 1440
REFRESH_TOKEN_EXPIRE_DAYS=7
QR_EXPIRY_SECONDS=60
APPROVAL_TIMEOUT_MINUTES=3
BCRYPT_ROUNDS=12

# Optional
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
LOG_LEVEL=INFO
SENTRY_DSN=  # For error tracking
REDIS_URL=  # For caching/rate limiting
```

### Generate Secure Secrets:
```bash
# Generate SECRET_KEY
openssl rand -hex 32

# Generate QR_SIGNING_SECRET (MUST be different)
openssl rand -hex 32
```

## API Endpoints - New/Updated

### Authentication
- `POST /api/auth/signup` - Enhanced with approval workflow
- `POST /api/auth/login` - Checks approval status
- `POST /api/auth/refresh` - NEW: Refresh access token
- `GET /api/auth/me` - Returns current user

### Approval Management (Admin Only)
- `GET /api/admin/approval-requests` - List pending approvals
- `POST /api/admin/approval-requests/:id/decide` - Approve/reject
- `GET /api/admin/approval-requests/:id/status` - Check status

### QR Session Management (Admin Only)
- `POST /api/admin/qr-sessions` - Generate cryptographic QR code
- `GET /api/admin/qr-sessions/active` - List active sessions
- `POST /api/admin/qr-sessions/:id/revoke` - Revoke a QR code

### Attendance (Student)
- `POST /api/attendance/mark` - Mark attendance with QR payload
- `GET /api/attendance/my-history` - View own attendance
- `GET /api/attendance/stats` - Personal statistics

### Events
- `POST /api/admin/events` - Create event
- `GET /api/events` - List events (role-based filtering)
- `DELETE /api/admin/events/:id` - Soft delete event
- `GET /api/admin/events/:id/attendance` - View attendance list

### Notifications
- `GET /api/notifications` - List user's notifications
- `POST /api/notifications/:id/read` - Mark as read
- `GET /api/notifications/unread-count` - Count unread

### Analytics (Admin Only)
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/attendance/export` - Export attendance data
- `GET /api/admin/audit-logs` - View audit trail

## Security Implementation Details

### QR Code Generation Flow:
```python
1. Admin requests QR for event_id
2. Generate cryptographic nonce (48 bytes)
3. Create session record with expiry (created_at + 60s)
4. Build payload: {session_id, nonce, event_id, expiry}
5. Sign payload with HMAC-SHA256 using QR_SIGNING_SECRET
6. Base64 encode (payload + signature)
7. Return QR code to admin
8. Store session in database with signature
```

### QR Code Verification Flow:
```python
1. Student submits QR payload
2. Base64 decode payload
3. Split into (payload_json, signature)
4. Recompute HMAC signature
5. Constant-time comparison of signatures
6. Check expiry timestamp
7. Query database for session (with row lock)
8. Verify session not revoked
9. Check nonce not previously used by this user
10. Check no duplicate attendance for event
11. Insert attendance record
12. Add nonce to used_nonces table
13. Commit transaction
14. Send real-time notification to admins
```

### Approval Workflow:
```python
1. User signs up → creates User (is_active=FALSE, role=NULL)
2. Create ApprovalRequest (status=PENDING, expires_in=3min)
3. Trigger notification to all active admins
4. Background job checks for expired requests every 30s
5. Admin approves/rejects within 3 minutes:
   - Update ApprovalRequest status
   - Update User (role=student/admin, is_active=TRUE)
   - Send notification to user
   - Log audit event
6. If timeout:
   - Background job sets status=TIMEOUT
   - User cannot login
   - Admin can still manually approve later (optional)
```

## Edge Cases Handled

### 1. Duplicate Attendance
- Database constraint prevents duplicate records
- Returns 409 Conflict with clear message
- Idempotent operation (safe to retry)

### 2. QR Code Expiry
- Server checks both payload.exp and database.expires_at
- Returns 410 Gone if expired
- Frontend prompts admin to generate new QR

### 3. Screenshot Reuse
- Used-nonce tracking per user
- Returns 410 Gone if nonce already used
- Cleanup job removes nonces after 1 hour

### 4. Network Failures
- All critical operations use database transactions
- Idempotency support via request IDs
- Automatic rollback on failure

### 5. Race Conditions
- SERIALIZABLE isolation level for attendance marking
- Row-level locks (SELECT ... FOR UPDATE)
- Unique constraints as last line of defense

### 6. Event Deletion
- Soft delete (is_deleted=TRUE)
- Attendance records preserved
- Can be restored by admin if needed

## Performance & Scalability

### Indexing Strategy:
```sql
-- High-traffic queries
CREATE INDEX idx_qr_sessions_token ON qr_sessions(session_token);
CREATE INDEX idx_attendance_event_user ON attendance_records(event_id, user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_approval_requests_expires ON approval_requests(expires_at);

-- Analytics queries
CREATE INDEX idx_audit_logs_action_created ON audit_logs(action, created_at DESC);
CREATE INDEX idx_attendance_marked_at ON attendance_records(marked_at);
```

### Recommended Optimizations for 1000+ Users:
1. **Connection Pooling**: Set DATABASE_POOL_SIZE=20
2. **Caching**: Use Redis for:
   - User profiles (5 min TTL)
   - Event lists (1 min TTL)
   - Attendance stats (10 min TTL)
3. **Read Replicas**: Route analytics to replica
4. **Background Jobs**:
   - Timeout expired approvals (every 30s)
   - Cleanup used_nonces (every hour)
   - Archive old audit logs (daily)

### Rate Limiting:
```python
/api/attendance/mark: 5 per minute per user
/api/admin/qr-sessions: 10 per minute per admin
/api/auth/login: 10 per 5 minutes per IP
/api/auth/signup: 3 per hour per IP
```

## Migration Path

### Step 1: Update Environment Variables
Add all new configuration variables to `.env`

### Step 2: Backup Database
```bash
cp backend/ds_club.db backend/ds_club.db.backup
```

### Step 3: Run Database Migrations
The new models will be created automatically on first run via `init_db()`

### Step 4: Migrate Existing Data
If you have existing users:
```python
# Create approval requests for existing PENDING users
# Update user IDs from Integer to String (UUID)
# Migrate attendance_sessions to qr_sessions format
```

### Step 5: Update Frontend
Frontend will need updates to:
- Handle approval workflow UI
- Implement QR scanning
- Show real-time notifications
- Handle refresh tokens

## Monitoring & Alerts

### Critical Metrics to Track:
1. **Security**:
   - Failed login attempts per IP
   - Invalid QR submissions
   - Approval request timeout rate

2. **Performance**:
   - API response times (p50, p95, p99)
   - Database query latency
   - QR verification time (<200ms target)

3. **Business**:
   - Daily signups
   - Approval rate
   - Average attendance rate
   - Event creation frequency

### Set Up Alerts For:
- More than 10 failed logins from same IP in 5 minutes
- QR verification failures >5% of attempts
- Database connection pool exhaustion
- API response time >1 second

## Testing Checklist

### Security Testing:
- [ ] Tampered QR codes are rejected
- [ ] Expired QR codes cannot mark attendance
- [ ] Screenshot QR codes are detected (nonce tracking)
- [ ] Students cannot access admin endpoints
- [ ] Password strength validation works
- [ ] JWT tokens expire correctly

### Functional Testing:
- [ ] Signup → approval → login flow works
- [ ] Approval timeout triggers after 3 minutes
- [ ] QR code generates and scans successfully
- [ ] Duplicate attendance is prevented
- [ ] Soft delete preserves attendance records
- [ ] Notifications are delivered to admins
- [ ] Audit logs capture all actions

### Performance Testing:
- [ ] 100 concurrent QR scans complete in <5 seconds
- [ ] Database handles 1000 users without degradation
- [ ] API endpoints respond in <500ms under load

## Deployment Checklist

### Before Production:
- [ ] Generate new SECRET_KEY (256-bit)
- [ ] Generate new QR_SIGNING_SECRET (different from SECRET_KEY)
- [ ] Set ACCESS_TOKEN_EXPIRE_MINUTES=15
- [ ] Enable HTTPS (TLS 1.2+)
- [ ] Set up database backups (daily)
- [ ] Configure log aggregation (ELK/Datadog)
- [ ] Set up error tracking (Sentry)
- [ ] Enable rate limiting
- [ ] Review CORS settings (whitelist only frontend domain)
- [ ] Set secure cookie flags (HTTP-only, Secure, SameSite)

### After Deployment:
- [ ] Test approval workflow end-to-end
- [ ] Verify QR code generation and scanning
- [ ] Check audit logs are being written
- [ ] Confirm notifications are sent
- [ ] Monitor error rates for 24 hours
- [ ] Review security headers (HSTS, CSP, etc.)

## Troubleshooting

### QR Code Not Working:
1. Check QR_SIGNING_SECRET is set correctly
2. Verify system clock is synchronized
3. Check QR has not expired (60s limit)
4. Review audit logs for verification failures

### Approval Not Working:
1. Check APPROVAL_TIMEOUT_MINUTES is set
2. Verify background job is running (timeout check)
3. Check admin users exist and are active
4. Review notification delivery

### Performance Issues:
1. Check database connection pool is not exhausted
2. Review slow query logs
3. Verify indexes are being used (EXPLAIN QUERY PLAN)
4. Check if caching is enabled

## Future Enhancements

### Phase 2 (Optional):
1. **Email Notifications**: Send emails on approval decisions
2. **SMS Alerts**: Alert admins of new signups via SMS
3. **Geofencing**: Require GPS location for attendance
4. **Multi-factor Authentication**: Add 2FA for admins
5. **Attendance Analytics Dashboard**: Advanced visualizations
6. **Bulk Operations**: Batch approve/reject users
7. **API Rate Limiting**: Implement Redis-based rate limiting
8. **Websocket Support**: Real-time updates via WebSockets

### Database Migrations (if moving to PostgreSQL):
```sql
-- Use native UUID type
ALTER TABLE users ALTER COLUMN id TYPE UUID USING id::UUID;

-- Use native INET type for IP addresses
ALTER TABLE audit_logs ALTER COLUMN ip_address TYPE INET USING ip_address::INET;

-- Use native JSONB for metadata
ALTER TABLE audit_logs ALTER COLUMN metadata TYPE JSONB USING metadata::JSONB;
```

## Support & Maintenance

### Regular Maintenance Tasks:
1. **Weekly**: Review audit logs for suspicious activity
2. **Weekly**: Check database performance metrics
3. **Monthly**: Archive old audit logs (>6 months)
4. **Monthly**: Review and update rate limits
5. **Quarterly**: Rotate JWT signing keys
6. **Quarterly**: Security audit and penetration testing

### Backup Strategy:
- **Daily**: Full database backup (retained 30 days)
- **Weekly**: Full backup archived to cold storage (retained 1 year)
- **Before deployments**: Always backup database

## Contact & Support

For issues or questions about this implementation, refer to:
- Backend System Design document
- Database Schema ERD
- API Documentation (Swagger/ReDoc)
- Audit Log Reference

---

**Version**: 1.0  
**Last Updated**: January 18, 2026  
**Author**: DS Club Portal Development Team
