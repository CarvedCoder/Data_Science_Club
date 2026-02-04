import json
from datetime import datetime
from sqlalchemy.orm import Session
from ..models.notification import Notification
from ..models.user import User, UserRole

class NotificationService:
    """Service for creating and managing real-time notifications."""
    
    @staticmethod
    def create_notification(
        db: Session,
        recipient_id: str,
        type: str,
        title: str,
        message: str = None,
        data: dict = None
    ) -> Notification:
        """Create a new notification."""
        notification = Notification(
            recipient_id=recipient_id,
            type=type,
            title=title,
            message=message,
            notification_data=json.dumps(data) if data else None,
            is_read=False,
            created_at=datetime.utcnow()
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        return notification
    
    @staticmethod
    def notify_admins_new_signup(db: Session, user_id: str, user_email: str, user_name: str, approval_request_id: str):
        """Notify all active admins about a new signup request."""
        admins = db.query(User).filter(
            User.role == UserRole.ADMIN.value,
            User.is_active == True
        ).all()
        
        for admin in admins:
            NotificationService.create_notification(
                db,
                recipient_id=admin.id,
                type='signup_request',
                title='New Signup Request',
                message=f'{user_name} ({user_email}) has requested to join',
                data={
                    'user_id': user_id,
                    'approval_request_id': approval_request_id,
                    'user_email': user_email,
                    'user_name': user_name
                }
            )
    
    @staticmethod
    def notify_user_approval_decision(
        db: Session,
        user_id: str,
        decision: str,
        approved_role: str = None,
        rejection_reason: str = None
    ):
        """Notify user about their approval/rejection."""
        if decision == 'approved':
            title = 'Welcome to DS Club!'
            message = f'Your account has been approved as a {approved_role}. You can now log in.'
        elif decision == 'rejected':
            title = 'Signup Request Rejected'
            message = f'Your signup request was rejected. {rejection_reason or ""}'
        else:  # timeout
            title = 'Signup Request Expired'
            message = 'Your signup request expired after 3 minutes of inactivity.'
        
        NotificationService.create_notification(
            db,
            recipient_id=user_id,
            type='approval_decision',
            title=title,
            message=message,
            data={
                'decision': decision,
                'approved_role': approved_role,
                'rejection_reason': rejection_reason
            }
        )
    
    @staticmethod
    def notify_admins_attendance_update(db: Session, event_id: str, event_title: str, user_name: str, attendance_count: int):
        """Notify admins when someone marks attendance."""
        admins = db.query(User).filter(
            User.role == UserRole.ADMIN.value,
            User.is_active == True
        ).all()
        
        for admin in admins:
            NotificationService.create_notification(
                db,
                recipient_id=admin.id,
                type='attendance_update',
                title='Attendance Marked',
                message=f'{user_name} marked attendance for {event_title}',
                data={
                    'event_id': event_id,
                    'event_title': event_title,
                    'user_name': user_name,
                    'current_count': attendance_count
                }
            )
    
    @staticmethod
    def mark_as_read(db: Session, notification_id: str, user_id: str):
        """Mark a notification as read."""
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.recipient_id == user_id
        ).first()
        
        if notification and not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            db.commit()
    
    @staticmethod
    def get_user_notifications(db: Session, user_id: str, unread_only: bool = False, limit: int = 50):
        """Get notifications for a user."""
        query = db.query(Notification).filter(Notification.recipient_id == user_id)
        
        if unread_only:
            query = query.filter(Notification.is_read == False)
        
        return query.order_by(Notification.created_at.desc()).limit(limit).all()
    
    @staticmethod
    def get_unread_count(db: Session, user_id: str) -> int:
        """Get count of unread notifications."""
        return db.query(Notification).filter(
            Notification.recipient_id == user_id,
            Notification.is_read == False
        ).count()
