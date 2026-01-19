
from sqlalchemy import Column, String, DateTime, Boolean, Text, ForeignKey, Index
from datetime import datetime
import uuid
from ..database import Base

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient_id = Column(String, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)  # 'signup_request', 'approval_decision', 'attendance_update'
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    notification_data = Column(Text, nullable=True)  # JSON string for additional data (renamed to avoid conflicts)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    read_at = Column(DateTime, nullable=True)
    
    __table_args__ = (
        Index('idx_notifications_recipient_read', 'recipient_id', 'is_read'),
    )
