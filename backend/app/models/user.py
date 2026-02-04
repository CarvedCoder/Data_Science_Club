
from sqlalchemy import Column, String, Boolean, DateTime, Enum, Index, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid
from ..database import Base

class UserRole(str, enum.Enum):
    STUDENT = "student"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=True)  # NULL until approved
    is_active = Column(Boolean, default=False, nullable=False)  # False until approved
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    
    # Profile fields
    section = Column(String(50), nullable=True)
    branch = Column(String(100), nullable=True)
    year = Column(String(20), nullable=True)
    bio = Column(Text, nullable=True)
    skills = Column(Text, nullable=True)  # Stored as comma-separated values
    
    # Alias for name (backwards compatibility)
    @property
    def name(self):
        return self.full_name
    
    @name.setter
    def name(self, value):
        self.full_name = value
    
    # Relationships
    attendance_records = relationship("AttendanceRecord", back_populates="user", foreign_keys="AttendanceRecord.user_id")
    approval_request = relationship("ApprovalRequest", back_populates="user", foreign_keys="ApprovalRequest.user_id", uselist=False)
    
    __table_args__ = (
        Index('idx_users_email', 'email'),
        Index('idx_users_role_active', 'role', 'is_active'),
    )