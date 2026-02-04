
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models.user import User, UserRole
from ..models.event import Event
from ..models.attendance import AttendanceRecord
from ..models.approval import ApprovalRequest, ApprovalStatus
from ..middleware.auth_middleware import require_admin
from ..services.audit_service import AuditService
from ..services.notification_service import NotificationService
from ..utils import utc_now

router = APIRouter(prefix="/api/admin", tags=["admin"])

class ApprovalDecisionRequest(BaseModel):
    decision: str  # 'approved' or 'rejected'
    approved_role: Optional[str] = 'student'  # 'student' or 'admin'
    rejection_reason: Optional[str] = None

@router.get("/approval-requests")
def get_approval_requests(
    status_filter: str = 'pending',
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get approval requests filtered by status.
    Status can be: pending, approved, rejected, timeout
    """
    query = db.query(ApprovalRequest)
    
    if status_filter:
        # Convert to lowercase for case-insensitive matching
        query = query.filter(ApprovalRequest.status == status_filter.lower())
    
    total = query.count()
    requests = query.order_by(ApprovalRequest.requested_at.desc()).offset(
        (page - 1) * limit
    ).limit(limit).all()
    
    result = []
    for req in requests:
        user = db.query(User).filter(User.id == req.user_id).first()
        result.append({
            "id": req.id,
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at.isoformat()
            },
            "status": req.status,
            "requested_at": req.requested_at.isoformat(),
            "expires_at": req.expires_at.isoformat(),
            "time_remaining_seconds": req.time_remaining_seconds if req.status == ApprovalStatus.PENDING.value else 0,
            "decided_at": req.decided_at.isoformat() if req.decided_at else None,
            "approved_role": req.approved_role,
            "rejection_reason": req.rejection_reason
        })
    
    return {
        "requests": result,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.post("/approval-requests/{request_id}/decide")
def decide_approval(
    request_id: str,
    decision: ApprovalDecisionRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Approve or reject a signup request.
    Must be done within 3 minutes of signup.
    """
    approval_req = db.query(ApprovalRequest).filter(
        ApprovalRequest.id == request_id
    ).first()
    
    if not approval_req:
        raise HTTPException(status_code=404, detail="Approval request not found")
    
    if approval_req.status != ApprovalStatus.PENDING.value:
        raise HTTPException(
            status_code=409,
            detail=f"Request already {approval_req.status}"
        )
    
    # Check if expired
    if approval_req.is_expired:
        approval_req.status = ApprovalStatus.TIMEOUT.value
        approval_req.decided_at = utc_now()
        db.commit()
        raise HTTPException(
            status_code=410,
            detail="This request has timed out (3 minutes elapsed)"
        )
    
    # Get user
    user = db.query(User).filter(User.id == approval_req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Process decision
    if decision.decision == 'approved':
        # Validate role
        if decision.approved_role not in ['student', 'admin']:
            raise HTTPException(
                status_code=400,
                detail="approved_role must be 'student' or 'admin'"
            )
        
        # Update approval request
        approval_req.status = ApprovalStatus.APPROVED.value
        approval_req.decided_at = utc_now()
        approval_req.decided_by = current_user.id
        approval_req.approved_role = decision.approved_role  # Already lowercase
        
        # Activate user
        user.role = decision.approved_role  # Use string directly ('student' or 'admin')
        user.is_active = True
        
        db.commit()
        
        # Send notification to user
        NotificationService.notify_user_approval_decision(
            db, user.id, 'approved', decision.approved_role
        )
        
        # Log audit event
        AuditService.log_approval_decision(
            db, current_user.id, approval_req.id, user.id,
            'approved', decision.approved_role, request
        )
        
        return {
            "approval_request": {
                "id": approval_req.id,
                "user_id": user.id,
                "status": "approved",
                "approved_role": decision.approved_role,
                "decided_at": approval_req.decided_at.isoformat(),
                "decided_by": current_user.id
            },
            "message": f"User approved as {decision.approved_role}"
        }
        
    elif decision.decision == 'rejected':
        # Update approval request
        approval_req.status = ApprovalStatus.REJECTED.value
        approval_req.decided_at = utc_now()
        approval_req.decided_by = current_user.id
        approval_req.rejection_reason = decision.rejection_reason
        
        # Optionally soft-delete user (keep for audit)
        user.is_active = False
        
        db.commit()
        
        # Send notification to user
        NotificationService.notify_user_approval_decision(
            db, user.id, 'rejected', None, decision.rejection_reason
        )
        
        # Log audit event
        AuditService.log_approval_decision(
            db, current_user.id, approval_req.id, user.id,
            'rejected', None, request
        )
        
        return {
            "approval_request": {
                "id": approval_req.id,
                "user_id": user.id,
                "status": "rejected",
                "rejection_reason": decision.rejection_reason,
                "decided_at": approval_req.decided_at.isoformat(),
                "decided_by": current_user.id
            },
            "message": "User rejected"
        }
    
    else:
        raise HTTPException(
            status_code=400,
            detail="decision must be 'approved' or 'rejected'"
        )

@router.get("/members")
def get_all_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get list of all active members with attendance statistics."""
    members = db.query(User).filter(
        User.role == UserRole.STUDENT,
        User.is_active == True
    ).all()
    
    result = []
    for member in members:
        total_events = db.query(Event).filter(Event.is_deleted == False).count()
        attended = db.query(AttendanceRecord).filter(
            AttendanceRecord.user_id == member.id
        ).count()
        
        result.append({
            "id": member.id,
            "email": member.email,
            "full_name": member.full_name,
            "is_active": member.is_active,
            "attended": attended,
            "total_events": total_events,
            "attendance_rate": round((attended / total_events * 100) if total_events > 0 else 0, 1)
        })
    
    return result

@router.post("/toggle-member/{user_id}")
def toggle_member_status(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Activate or deactivate a member."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = not user.is_active
    db.commit()
    
    return {
        "user_id": user.id,
        "is_active": user.is_active,
        "message": f"User {'activated' if user.is_active else 'deactivated'}"
    }

@router.delete("/remove-member/{user_id}")
def remove_member(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Soft delete a member (preserves attendance records)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Cannot remove admin users")
    
    # Soft delete
    user.is_active = False
    db.commit()
    
    return {"message": "Member removed successfully"}

@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get dashboard statistics for admin."""
    total_users = db.query(User).count()
    students = db.query(User).filter(User.role == UserRole.STUDENT.value).count()
    admins = db.query(User).filter(User.role == UserRole.ADMIN.value).count()
    pending_approvals = db.query(ApprovalRequest).filter(
        ApprovalRequest.status == ApprovalStatus.PENDING.value
    ).count()
    inactive_users = db.query(User).filter(User.is_active == False).count()
    
    total_events = db.query(Event).count()
    upcoming_events = db.query(Event).filter(
        Event.scheduled_at > utc_now(),
        Event.is_deleted == False
    ).count()
    past_events = db.query(Event).filter(
        Event.scheduled_at <= utc_now(),
        Event.is_deleted == False
    ).count()
    
    total_attendance = db.query(AttendanceRecord).count()
    
    # Calculate average attendance rate
    events_with_attendance = db.query(
        Event.id,
        func.count(AttendanceRecord.id).label('count')
    ).outerjoin(AttendanceRecord).filter(
        Event.is_deleted == False
    ).group_by(Event.id).all()
    
    if events_with_attendance and students > 0:
        avg_rate = sum(count / students * 100 for _, count in events_with_attendance) / len(events_with_attendance)
    else:
        avg_rate = 0
    
    return {
        "users": {
            "total": total_users,
            "students": students,
            "admins": admins,
            "pending_approvals": pending_approvals,
            "inactive": inactive_users
        },
        "events": {
            "total": total_events,
            "upcoming": upcoming_events,
            "past": past_events
        },
        "attendance": {
            "total_records": total_attendance,
            "average_attendance_rate": round(avg_rate, 1)
        }
    }
