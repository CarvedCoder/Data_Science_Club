
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..database import Base

class StudyMaterial(Base):
    __tablename__ = "study_materials"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String, ForeignKey("events.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    file_path = Column(String, nullable=False)
    file_name = Column(String, nullable=False)  # Matches database column name
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    event = relationship("Event", back_populates="materials")
    uploader = relationship("User")
    
    __table_args__ = (
        Index('idx_materials_event', 'event_id'),
    )
