import json
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import Request
from ..models.audit_log import AuditLog
from ..utils import utc_now

def serialize_for_json(obj):
    """Convert UUIDs and other non-serializable objects to strings."""
    if isinstance(obj, dict):
        return {k: serialize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_for_json(v) for v in obj]
    elif hasattr(obj, 'hex'):  # UUID objects have a hex attribute
        return str(obj)
    return obj

class AuditService:
    """Service for logging all critical operations for security and compliance."""
    
    @staticmethod
    def log(
        db: Session,
        user_id: str | None,
        action: str,
        resource_type: str | None = None,
        resource_id: str | None = None,
        metadata: dict | None = None,
        request: Request | None = None
    ):
        """
        Log an audit event.
        
        Args:
            db: Database session
            user_id: ID of user performing action (None for system actions)
            action: Action being performed (e.g., 'signup', 'login', 'attendance_marked')
            resource_type: Type of resource (e.g., 'event', 'user', 'approval')
            resource_id: ID of affected resource
            metadata: Additional data as dict (will be JSON serialized)
            request: FastAPI request object (for IP and user agent)
        """
        try:
            ip_address = None
            user_agent = None
            
            if request:
                ip_address = request.client.host if request.client else None
                user_agent = request.headers.get('user-agent')
            
            audit_log = AuditLog(
                user_id=str(user_id) if user_id else None,
                action=action,
                resource_type=resource_type,
                resource_id=str(resource_id) if resource_id else None,
                meta_data=json.dumps(serialize_for_json(metadata)) if metadata else None,
                ip_address=ip_address,
                user_agent=user_agent,
                created_at=utc_now()
            )
            
            db.add(audit_log)
            db.commit()
            
        except Exception as e:
            # Don't fail the main operation if audit logging fails
            print(f"Audit logging failed: {str(e)}")
            db.rollback()
    
    @staticmethod
    def log_signup(db: Session, user_id: str, email: str, request: Request = None):
        """Log user signup event."""
        AuditService.log(
            db, user_id, 'signup', 'user', user_id,
            {'email': email},
            request
        )
    
    @staticmethod
    def log_login(db: Session, user_id: str, email: str, success: bool, request: Request = None):
        """Log login attempt."""
        AuditService.log(
            db, user_id if success else None, 
            'login_success' if success else 'login_failed',
            'user', user_id,
            {'email': email, 'success': success},
            request
        )
    
    @staticmethod
    def log_approval_decision(
        db: Session, 
        decider_id: str, 
        approval_request_id: str,
        user_id: str,
        decision: str,
        approved_role: str | None = None,
        request: Request = None
    ):
        """Log approval/rejection decision."""
        AuditService.log(
            db, decider_id, 'approval_decision', 'approval', approval_request_id,
            {
                'target_user_id': user_id,
                'decision': decision,
                'approved_role': approved_role
            },
            request
        )
    
    @staticmethod
    def log_qr_generated(db: Session, admin_id: str, event_id: str, session_id: str, request: Request = None):
        """Log QR code generation."""
        AuditService.log(
            db, admin_id, 'qr_generated', 'qr_session', session_id,
            {'event_id': event_id},
            request
        )
    
    @staticmethod
    def log_attendance_marked(
        db: Session, 
        user_id: str, 
        event_id: str,
        attendance_id: str,
        qr_session_id: str,
        request: Request = None
    ):
        """Log attendance marking."""
        AuditService.log(
            db, user_id, 'attendance_marked', 'attendance_record', attendance_id,
            {
                'event_id': event_id,
                'qr_session_id': qr_session_id
            },
            request
        )
    
    @staticmethod
    def log_attendance_failed(
        db: Session,
        user_id: str,
        reason: str,
        metadata: dict = None,
        request: Request = None
    ):
        """Log failed attendance attempt (for security monitoring)."""
        AuditService.log(
            db, user_id, 'attendance_failed', None, None,
            {'reason': reason, **(metadata or {})},
            request
        )
    
    @staticmethod
    def log_event_created(db: Session, admin_id: str, event_id: str, title: str, request: Request = None):
        """Log event creation."""
        AuditService.log(
            db, admin_id, 'event_created', 'event', event_id,
            {'title': title},
            request
        )
    
    @staticmethod
    def log_event_deleted(db: Session, admin_id: str, event_id: str, request: Request = None):
        """Log event deletion."""
        AuditService.log(
            db, admin_id, 'event_deleted', 'event', event_id,
            {},
            request
        )
