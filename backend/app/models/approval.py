
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum, CheckConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import enum
import uuid
from ..database import Base

class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    TIMEOUT = "timeout"

class ApprovalRequest(Base):
    __tablename__ = "approval_requests"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING)
    requested_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    decided_at = Column(DateTime, nullable=True)
    decided_by = Column(String, ForeignKey("users.id"), nullable=True)
    approved_role = Column(String, nullable=True)  # 'student' or 'admin'
    rejection_reason = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="approval_request")
    decider = relationship("User", foreign_keys=[decided_by])
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.expires_at and self.requested_at:
            # Default 3-minute expiry
            self.expires_at = self.requested_at + timedelta(minutes=3)
    
    @property
    def is_expired(self):
        return self.status == ApprovalStatus.PENDING and datetime.utcnow() > self.expires_at
    
    @property
    def time_remaining_seconds(self):
        if self.status != ApprovalStatus.PENDING:
            return 0
        remaining = (self.expires_at - datetime.utcnow()).total_seconds()
        return max(0, int(remaining))
