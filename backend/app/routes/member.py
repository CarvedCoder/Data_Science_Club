from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from ..database import get_db
from ..models.user import User
from ..models.event import Event
from ..models.attendance import AttendanceRecord
from ..middleware.auth_middleware import get_current_user, require_active_member
from ..utils import utc_now

router = APIRouter(prefix="/api/member", tags=["member"])


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    section: Optional[str] = None
    branch: Optional[str] = None
    year: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None


class ProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    section: Optional[str] = None
    branch: Optional[str] = None
    year: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AttendanceHistoryItem(BaseModel):
    id: str
    event_id: str
    event_title: str
    event_date: str
    event_type: Optional[str] = None
    check_in_time: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


class EventItem(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    date: str
    time: Optional[str] = None
    location: Optional[str] = None
    event_type: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/profile", response_model=ProfileResponse)
def get_profile(
    current_user: User = Depends(require_active_member),
    db: Session = Depends(get_db)
):
    """Get the current member's profile"""
    # Convert skills from comma-separated string to list if needed
    skills = []
    if hasattr(current_user, 'skills') and current_user.skills:
        if isinstance(current_user.skills, str):
            skills = [s.strip() for s in current_user.skills.split(',') if s.strip()]
        else:
            skills = current_user.skills

    return ProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.name or current_user.full_name or '',
        section=getattr(current_user, 'section', None),
        branch=getattr(current_user, 'branch', None),
        year=getattr(current_user, 'year', None),
        bio=getattr(current_user, 'bio', None),
        skills=skills,
        created_at=getattr(current_user, 'created_at', None)
    )


@router.put("/profile", response_model=ProfileResponse)
def update_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(require_active_member),
    db: Session = Depends(get_db)
):
    """Update the current member's profile"""
    # Update fields if provided
    if profile_data.full_name is not None:
        current_user.name = profile_data.full_name
        if hasattr(current_user, 'full_name'):
            current_user.full_name = profile_data.full_name
    
    if profile_data.section is not None:
        if hasattr(current_user, 'section'):
            current_user.section = profile_data.section
    
    if profile_data.branch is not None:
        if hasattr(current_user, 'branch'):
            current_user.branch = profile_data.branch
    
    if profile_data.year is not None:
        if hasattr(current_user, 'year'):
            current_user.year = profile_data.year
    
    if profile_data.bio is not None:
        if hasattr(current_user, 'bio'):
            current_user.bio = profile_data.bio
    
    if profile_data.skills is not None:
        if hasattr(current_user, 'skills'):
            # Store as comma-separated string
            current_user.skills = ','.join(profile_data.skills)
    
    db.commit()
    db.refresh(current_user)
    
    # Convert skills for response
    skills = []
    if hasattr(current_user, 'skills') and current_user.skills:
        if isinstance(current_user.skills, str):
            skills = [s.strip() for s in current_user.skills.split(',') if s.strip()]
        else:
            skills = current_user.skills

    return ProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.name or getattr(current_user, 'full_name', '') or '',
        section=getattr(current_user, 'section', None),
        branch=getattr(current_user, 'branch', None),
        year=getattr(current_user, 'year', None),
        bio=getattr(current_user, 'bio', None),
        skills=skills,
        created_at=getattr(current_user, 'created_at', None)
    )


@router.get("/events", response_model=List[EventItem])
def get_member_events(
    current_user: User = Depends(require_active_member),
    db: Session = Depends(get_db)
):
    """Get all events for the current member"""
    events = db.query(Event).filter(Event.is_deleted == False).order_by(Event.scheduled_at.desc()).all()
    
    return [
        EventItem(
            id=str(event.id),
            title=event.title,
            description=event.description,
            date=str(event.scheduled_at) if event.scheduled_at else '',
            time=None,
            location=getattr(event, 'location', None),
            event_type=getattr(event, 'event_type', 'Other')
        )
        for event in events
    ]


@router.get("/attendance-history", response_model=List[AttendanceHistoryItem])
def get_attendance_history(
    current_user: User = Depends(require_active_member),
    db: Session = Depends(get_db)
):
    """Get attendance history for the current member"""
    # Get all attendance records for this user
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.user_id == current_user.id
    ).all()
    
    # Get event details for each record
    result = []
    for record in records:
        event = db.query(Event).filter(Event.id == record.event_id).first()
        if event:
            result.append(AttendanceHistoryItem(
                id=record.id,
                event_id=event.id,
                event_title=event.title,
                event_date=str(event.scheduled_at) if event.scheduled_at else '',
                event_type=getattr(event, 'event_type', 'Other'),
                check_in_time=str(record.marked_at) if record.marked_at else None,
                status='present'
            ))
    
    # Also get events where user was absent (no attendance record)
    all_events = db.query(Event).filter(Event.is_deleted == False).all()
    attended_event_ids = {r.event_id for r in records}
    
    for event in all_events:
        if event.id not in attended_event_ids:
            # Check if event has passed (basic check using scheduled_at)
            if event.scheduled_at and event.scheduled_at < utc_now():
                result.append(AttendanceHistoryItem(
                    id="",  # No record ID for absent
                    event_id=event.id,
                    event_title=event.title,
                    event_date=str(event.scheduled_at),
                    event_type=getattr(event, 'event_type', 'Other'),
                    check_in_time=None,
                    status='absent'
                ))
    
    # Sort by date descending
    result.sort(key=lambda x: x.event_date, reverse=True)
    
    return result
