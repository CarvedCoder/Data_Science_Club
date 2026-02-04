
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from ..database import get_db
from ..models.attendance import QRSession, AttendanceRecord, UsedNonce
from ..models.event import Event
from ..models.user import User, UserRole
from ..middleware.auth_middleware import get_current_user, require_admin, require_active_member
from ..services.qr_service import QRService
from ..services.audit_service import AuditService
from ..services.notification_service import NotificationService
from ..utils import utc_now, ensure_utc

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

class StartSessionRequest(BaseModel):
    event_id: str

class MarkAttendanceRequest(BaseModel):
    qr_payload: str

@router.post("/start-session")
def start_attendance_session(
    request_body: StartSessionRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Generate a cryptographically signed QR code for an event (admin only).
    QR codes expire in 60 seconds and contain unique nonce for replay prevention.
    """
    # Verify event exists
    event = db.query(Event).filter(
        Event.id == request_body.event_id,
        Event.is_deleted == False
    ).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Generate QR session
    qr_data = QRService.create_qr_session(db, request_body.event_id, current_user.id)
    
    # Log audit event
    AuditService.log_qr_generated(
        db, current_user.id, request_body.event_id, qr_data['session_id'], request
    )
    
    return {
        "session_id": qr_data['session_id'],
        "qr_payload": qr_data['qr_payload'],
        "event_id": request_body.event_id,
        "event_title": event.title,
        "expires_at": qr_data['expires_at'].isoformat(),
        "expires_in_seconds": qr_data['expires_in_seconds']
    }

@router.post("/stop-session/{session_id}")
def stop_attendance_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Revoke a QR session (admin only)."""
    QRService.revoke_session(db, session_id)
    return {"message": "Session revoked successfully"}

@router.post("/refresh-qr/{session_id}")
def refresh_qr_code(
    session_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Generate a new QR code for an existing session (admin only).
    This creates a new QR session for the same event with a fresh expiry.
    """
    # Get the existing session to find the event
    old_session = db.query(QRSession).filter(QRSession.id == session_id).first()
    
    if not old_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Revoke old session
    QRService.revoke_session(db, session_id)
    
    # Get event info
    event = db.query(Event).filter(Event.id == old_session.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Generate new QR session
    qr_data = QRService.create_qr_session(db, old_session.event_id, current_user.id)
    
    # Log audit event
    AuditService.log_qr_generated(
        db, current_user.id, old_session.event_id, qr_data['session_id'], request
    )
    
    return {
        "session_id": qr_data['session_id'],
        "qr_payload": qr_data['qr_payload'],
        "event_id": old_session.event_id,
        "event_title": event.title,
        "expires_at": qr_data['expires_at'].isoformat(),
        "expires_in_seconds": qr_data['expires_in_seconds']
    }

@router.get("/active-session")
def get_active_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check if there's an active QR session for attendance.
    Returns the most recent non-expired, non-revoked session.
    """
    session = db.query(QRSession).filter(
        QRSession.is_revoked == False,
        QRSession.expires_at > utc_now()
    ).order_by(QRSession.created_at.desc()).first()
    
    if not session:
        return {"active": False}
    
    event = db.query(Event).filter(Event.id == session.event_id).first()
    
    return {
        "active": True,
        "session_id": session.id,
        "event": {
            "id": event.id,
            "title": event.title,
            "scheduled_at": event.scheduled_at.isoformat()
        },
        "expires_at": session.expires_at.isoformat(),
        "expires_in_seconds": max(0, int((ensure_utc(session.expires_at) - utc_now()).total_seconds()))
    }

@router.post("/mark")
def mark_attendance(
    request_body: MarkAttendanceRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_member)
):
    """
    Mark attendance using a QR code payload (active students only).
    
    Security checks:
    1. Verify QR signature (HMAC-SHA256)
    2. Check expiry timestamp
    3. Verify session exists and not revoked
    4. Check nonce not previously used by this user
    5. Prevent duplicate attendance for same event
    """
    # Start transaction with serializable isolation
    try:
        # Step 1: Verify and decode QR payload
        try:
            payload = QRService.verify_payload(request_body.qr_payload)
        except ValueError as e:
            AuditService.log_attendance_failed(
                db, current_user.id, "invalid_qr_payload",
                {"error": str(e)}, request
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        session_id = payload.get('s')
        nonce = payload.get('n')
        event_id = payload.get('e')
        
        # Step 2: Query QR session with row lock
        qr_session = db.query(QRSession).filter(
            QRSession.id == session_id
        ).with_for_update().first()
        
        if not qr_session:
            AuditService.log_attendance_failed(
                db, current_user.id, "session_not_found",
                {"session_id": session_id}, request
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="QR session not found"
            )
        
        # Step 3: Check if session is revoked
        if qr_session.is_revoked:
            AuditService.log_attendance_failed(
                db, current_user.id, "session_revoked",
                {"session_id": session_id}, request
            )
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="QR session has been revoked"
            )
        
        # Step 4: Double-check expiry from database
        if qr_session.expires_at < utc_now():
            AuditService.log_attendance_failed(
                db, current_user.id, "qr_expired",
                {"session_id": session_id}, request
            )
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="QR code has expired"
            )
        
        # Step 5: Verify nonce matches
        if qr_session.nonce != nonce:
            AuditService.log_attendance_failed(
                db, current_user.id, "nonce_mismatch",
                {"session_id": session_id}, request
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid QR code (nonce mismatch)"
            )
        
        # Step 6: Check if nonce already used by this user
        nonce_used = db.query(UsedNonce).filter(
            UsedNonce.nonce == nonce,
            UsedNonce.user_id == current_user.id
        ).first()
        
        if nonce_used:
            AuditService.log_attendance_failed(
                db, current_user.id, "nonce_already_used",
                {"session_id": session_id, "nonce": nonce}, request
            )
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="This QR code has already been used by you"
            )
        
        # Step 7: Check for duplicate attendance
        existing_attendance = db.query(AttendanceRecord).filter(
            AttendanceRecord.event_id == event_id,
            AttendanceRecord.user_id == current_user.id
        ).first()
        
        if existing_attendance:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already marked attendance for this event"
            )
        
        # Step 8: Mark attendance
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get('user-agent')
        
        attendance = AttendanceRecord(
            event_id=event_id,
            user_id=current_user.id,
            qr_session_id=session_id,
            marked_at=utc_now(),
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(attendance)
        
        # Step 9: Track used nonce
        used_nonce = UsedNonce(
            nonce=nonce,
            user_id=current_user.id,
            used_at=utc_now()
        )
        db.add(used_nonce)
        
        # Commit transaction
        db.commit()
        db.refresh(attendance)
        
        # Step 10: Log audit event
        AuditService.log_attendance_marked(
            db, current_user.id, event_id, attendance.id, session_id, request
        )
        
        # Step 11: Notify admins
        event = db.query(Event).filter(Event.id == event_id).first()
        attendance_count = db.query(AttendanceRecord).filter(
            AttendanceRecord.event_id == event_id
        ).count()
        
        NotificationService.notify_admins_attendance_update(
            db, event.id, event.title, current_user.full_name, attendance_count
        )
        
        return {
            "attendance_id": attendance.id,
            "event": {
                "id": event.id,
                "title": event.title,
                "scheduled_at": event.scheduled_at.isoformat()
            },
            "marked_at": attendance.marked_at.isoformat(),
            "message": "Attendance marked successfully"
        }
        
    except IntegrityError as e:
        db.rollback()
        # Likely unique constraint violation (duplicate attendance)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance already marked or duplicate nonce"
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        AuditService.log_attendance_failed(
            db, current_user.id, "unexpected_error",
            {"error": str(e)}, request
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark attendance"
        )

@router.get("/my-attendance")
def get_my_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_member)
):
    """Get attendance history for the current user."""
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.user_id == current_user.id
    ).order_by(AttendanceRecord.marked_at.desc()).all()
    
    attendance_list = []
    for record in records:
        event = db.query(Event).filter(Event.id == record.event_id).first()
        attendance_list.append({
            "event": {
                "id": event.id,
                "title": event.title,
                "scheduled_at": event.scheduled_at.isoformat(),
                "notes": event.notes
            },
            "marked_at": record.marked_at.isoformat()
        })
    
    return {"attendance": attendance_list}

@router.get("/event/{event_id}")
def get_event_attendance(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get attendance list for a specific event (admin only)."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.event_id == event_id
    ).order_by(AttendanceRecord.marked_at).all()
    
    attendance_list = []
    for record in records:
        user = db.query(User).filter(User.id == record.user_id).first()
        attendance_list.append({
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name
            },
            "marked_at": record.marked_at.isoformat(),
            "ip_address": record.ip_address
        })
    
    total_students = db.query(User).filter(
        User.role == UserRole.STUDENT,
        User.is_active == True
    ).count()
    
    return {
        "event": {
            "id": event.id,
            "title": event.title,
            "scheduled_at": event.scheduled_at.isoformat()
        },
        "attendance": attendance_list,
        "total_attended": len(attendance_list),
        "total_students": total_students,
        "attendance_rate": round((len(attendance_list) / total_students * 100) if total_students > 0 else 0, 2)
    }

@router.get("/stats")
def get_attendance_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_member)
):
    """Get attendance statistics for the current user."""
    total_events = db.query(Event).filter(Event.is_deleted == False).count()
    attended = db.query(AttendanceRecord).filter(
        AttendanceRecord.user_id == current_user.id
    ).count()
    
    return {
        "total_events": total_events,
        "attended": attended,
        "attendance_rate": round((attended / total_events * 100) if total_events > 0 else 0, 1)
    }
