
from sqlalchemy import Column, String, DateTime, Text, Index
from sqlalchemy.dialects.postgresql import JSONB, INET
from datetime import datetime
import uuid
from ..database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=True)  # Nullable for system actions
    action = Column(String(50), nullable=False)  # e.g., 'signup', 'login', 'attendance_marked'
    resource_type = Column(String(50), nullable=True)  # e.g., 'event', 'user', 'approval'
    resource_id = Column(String, nullable=True)
    meta_data = Column(Text, nullable=True)  # JSON string for SQLite compatibility (renamed from 'metadata' to avoid SQLAlchemy conflict)
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    __table_args__ = (
        Index('idx_audit_user_action', 'user_id', 'action'),
        Index('idx_audit_action_created', 'action', 'created_at'),
    )
