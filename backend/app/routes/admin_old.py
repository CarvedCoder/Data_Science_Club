
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List
from ..database import get_db
from ..models.user import User, UserRole
from ..models.event import Event
from ..models.attendance import AttendanceRecord, AttendanceStatus
from ..middleware.auth_middleware import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])

class ApproveUserRequest(BaseModel):
    user_id: int
    approve: bool

@router.get("/pending-users")
def get_pending_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    users = db.query(User).filter(User.role == UserRole.PENDING).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "created_at": u.created_at
        }
        for u in users
    ]

@router.post("/approve-user")
def approve_user(
    request: ApproveUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if request.approve:
        user.role = UserRole.MEMBER
        message = f"User {user.email} approved"
    else:
        db.delete(user)
        message = f"User registration rejected"
    
    db.commit()
    return {"message": message}

@router.get("/members")
def get_all_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    members = db.query(User).filter(User.role == UserRole.MEMBER).all()
    
    result = []
    for member in members:
        total_events = db.query(Event).filter(Event.status == "completed").count()
        attended = db.query(AttendanceRecord).filter(
            AttendanceRecord.user_id == member.id,
            AttendanceRecord.status == AttendanceStatus.PRESENT
        ).count()
        
        result.append({
            "id": member.id,
            "email": member.email,
            "name": member.name,
            "is_active": member.is_active,
            "attended": attended,
            "total_events": total_events,
            "attendance_rate": round((attended / total_events * 100) if total_events > 0 else 0, 1)
        })
    
    return result

@router.post("/toggle-member/{user_id}")
def toggle_member_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = not user.is_active
    db.commit()
    
    return {
        "message": f"User {'activated' if user.is_active else 'deactivated'}",
        "is_active": user.is_active
    }

@router.delete("/remove-member/{user_id}")
def remove_member(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Cannot remove admin user")
    
    db.delete(user)
    db.commit()
    
    return {"message": "User removed successfully"}

@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    total_members = db.query(User).filter(User.role == UserRole.MEMBER).count()
    pending_users = db.query(User).filter(User.role == UserRole.PENDING).count()
    total_events = db.query(Event).count()
    
    return {
        "total_members": total_members,
        "pending_users": pending_users,
        "total_events": total_events
    }
