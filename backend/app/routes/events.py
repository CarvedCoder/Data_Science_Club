
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from ..database import get_db
from ..models.event import Event
from ..models.attendance import AttendanceRecord
from ..models.user import User, UserRole
from ..middleware.auth_middleware import get_current_user, require_admin
from ..services.audit_service import AuditService

router = APIRouter(prefix="/api/events", tags=["events"])

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    notes: Optional[str] = None

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[str] = None  # scheduled, active, completed, cancelled

@router.post("/")
def create_event(
    event: EventCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new event (admin only)."""
    new_event = Event(
        title=event.title,
        description=event.description,
        scheduled_at=event.scheduled_at,
        notes=event.notes,
        created_by=current_user.id,
        is_deleted=False
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    
    # Log audit event
    AuditService.log_event_created(
        db, current_user.id, new_event.id, new_event.title, request
    )
    
    return {
        "id": new_event.id,
        "title": new_event.title,
        "description": new_event.description,
        "scheduled_at": new_event.scheduled_at,
        "notes": new_event.notes,
        "created_by": new_event.created_by,
        "is_deleted": new_event.is_deleted
    }

@router.get("/")
def get_events(
    include_deleted: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all events. Students see own attendance status, admins see attendance counts."""
    query = db.query(Event)
    
    # Only admins can see deleted events
    if not include_deleted or current_user.role != UserRole.ADMIN:
        query = query.filter(Event.is_deleted == False)
    
    events = query.order_by(Event.scheduled_at.desc()).all()
    
    result = []
    for event in events:
        event_data = {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "scheduled_at": event.scheduled_at,
            "notes": event.notes,
            "status": event.status or "scheduled",
            "is_deleted": event.is_deleted
        }
        
        # Add attendance info based on role
        if current_user.role == UserRole.STUDENT:
            # Check if user attended this event
            attendance = db.query(AttendanceRecord).filter(
                AttendanceRecord.user_id == current_user.id,
                AttendanceRecord.event_id == event.id
            ).first()
            event_data["user_attended"] = attendance is not None
            
        elif current_user.role == UserRole.ADMIN:
            # Show attendance count for admins
            attendance_count = db.query(AttendanceRecord).filter(
                AttendanceRecord.event_id == event.id
            ).count()
            event_data["attendance_count"] = attendance_count
        
        result.append(event_data)
    
    return {"events": result}

@router.get("/{event_id}")
def get_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event_data = {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "scheduled_at": event.scheduled_at,
        "notes": event.notes,
        "status": event.status or "scheduled",
        "is_deleted": event.is_deleted,
        "created_by": event.created_by
    }
    
    # Add attendance status
    if current_user.role == UserRole.STUDENT:
        attendance = db.query(AttendanceRecord).filter(
            AttendanceRecord.user_id == current_user.id,
            AttendanceRecord.event_id == event.id
        ).first()
        event_data["user_attended"] = attendance is not None
    elif current_user.role == UserRole.ADMIN:
        attendance_count = db.query(AttendanceRecord).filter(
            AttendanceRecord.event_id == event.id
        ).count()
        event_data["attendance_count"] = attendance_count
    
    return event_data

@router.put("/{event_id}")
def update_event(
    event_id: str,
    event_update: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update an event (admin only)."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    for key, value in event_update.dict(exclude_unset=True).items():
        setattr(event, key, value)
    
    db.commit()
    db.refresh(event)
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "scheduled_at": event.scheduled_at,
        "notes": event.notes,
        "status": event.status,
        "is_deleted": event.is_deleted
    }

@router.delete("/{event_id}")
def delete_event(
    event_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Soft delete an event (admin only). Attendance records are preserved."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get attendance count before deletion
    attendance_count = db.query(AttendanceRecord).filter(
        AttendanceRecord.event_id == event.id
    ).count()
    
    # Soft delete
    event.is_deleted = True
    event.deleted_at = datetime.utcnow()
    db.commit()
    
    # Log audit event
    AuditService.log_event_deleted(db, current_user.id, event.id, request)
    
    return {
        "message": "Event soft-deleted successfully",
        "attendance_records_preserved": attendance_count
    }