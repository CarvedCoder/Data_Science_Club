
from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey, Index, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from ..database import Base

class EventStatus(enum.Enum):
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Event(Base):
    __tablename__ = "events"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    status = Column(String(20), default="scheduled", nullable=False)  # scheduled, active, completed, cancelled
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)  # Admin notes/resources/materials
    
    # Relationships
    qr_sessions = relationship("QRSession", back_populates="event")
    attendance_records = relationship("AttendanceRecord", back_populates="event")
    materials = relationship("StudyMaterial", back_populates="event")
    
    __table_args__ = (
        Index('idx_events_scheduled', 'scheduled_at'),
        Index('idx_events_created_by', 'created_by'),
    )
