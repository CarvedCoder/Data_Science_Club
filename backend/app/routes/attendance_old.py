from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import List
from ..database import get_db
from ..models.attendance import AttendanceSession, AttendanceRecord, AttendanceStatus
from ..models.event import Event
from ..models.user import User
from ..middleware.auth_middleware import get_current_user, require_admin, require_active_member
from ..services.qr_service import QRService

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

class MarkAttendanceRequest(BaseModel):
    token: str

class StartSessionRequest(BaseModel):
    event_id: int

@router.post("/start-session")
def start_attendance_session(
    request: StartSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    event = db.query(Event).filter(Event.id == request.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    session = QRService.create_attendance_session(db, request.event_id)
    
    return {
        "session_id": session.id,
        "token": session.session_token,
        "event_id": event.id,
        "event_title": event.title,
        "started_at": session.started_at
    }

@router.post("/stop-session/{session_id}")
def stop_attendance_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.is_active = False
    session.ended_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Session ended successfully"}

@router.get("/active-session")
def get_active_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(AttendanceSession).filter(
        AttendanceSession.is_active == True
    ).first()
    
    if not session:
        return {"active": False}
    
    return {
        "active": True,
        "session_id": session.id,
        "token": session.session_token,
        "event": {
            "id": session.event.id,
            "title": session.event.title,
            "date": session.event.date
        },
        "started_at": session.started_at
    }

@router.post("/mark")
def mark_attendance(
    request: MarkAttendanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_member)
):
    # Validate token
    session = QRService.validate_token(db, request.token)
    if not session:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    # Check if already marked
    existing = db.query(AttendanceRecord).filter(
        AttendanceRecord.user_id == current_user.id,
        AttendanceRecord.session_id == session.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Attendance already marked for this session")
    
    # Mark attendance
    record = AttendanceRecord(
        user_id=current_user.id,
        session_id=session.id,
        status=AttendanceStatus.PRESENT
    )
    db.add(record)
    db.commit()
    
    return {
        "message": "Attendance marked successfully",
        "event": session.event.title,
        "marked_at": record.marked_at
    }

@router.get("/my-attendance")
def get_my_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_member)
):
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.user_id == current_user.id
    ).all()
    
    result = []
    for record in records:
        event = record.session.event
        result.append({
            "id": record.id,
            "event_id": event.id,
            "event_title": event.title,
            "event_date": event.date,
            "status": record.status,
            "marked_at": record.marked_at
        })
    
    return result

@router.get("/event/{event_id}")
def get_event_attendance(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get all sessions for this event
    sessions = db.query(AttendanceSession).filter(
        AttendanceSession.event_id == event_id
    ).all()
    
    if not sessions:
        return {"present": [], "absent": [], "total": 0, "percentage": 0}
    
    # Get all records
    session_ids = [s.id for s in sessions]
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id.in_(session_ids)
    ).all()
    
    # Get all active members
    all_members = db.query(User).filter(
        User.role == "member",
        User.is_active == True
    ).all()
    
    present_users = [r.user for r in records if r.status == AttendanceStatus.PRESENT]
    present_ids = [u.id for u in present_users]
    absent_users = [m for m in all_members if m.id not in present_ids]
    
    return {
        "present": [{"id": u.id, "name": u.name, "email": u.email} for u in present_users],
        "absent": [{"id": u.id, "name": u.name, "email": u.email} for u in absent_users],
        "total": len(all_members),
        "percentage": round((len(present_users) / len(all_members) * 100) if all_members else 0, 1)
    }

@router.get("/stats")
def get_attendance_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_member)
):
    total_events = db.query(Event).filter(Event.status == "completed").count()
    attended = db.query(AttendanceRecord).filter(
        AttendanceRecord.user_id == current_user.id,
        AttendanceRecord.status == AttendanceStatus.PRESENT
    ).count()
    
    return {
        "total_events": total_events,
        "attended": attended,
        "percentage": round((attended / total_events * 100) if total_events > 0 else 0, 1)
    }