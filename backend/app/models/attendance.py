
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Index, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from ..database import Base

class QRSession(Base):
    """
    Cryptographically signed QR sessions for anti-cheat attendance.
    Each QR code is short-lived (30-60 seconds) and contains a unique nonce.
    """
    __tablename__ = "qr_sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String, ForeignKey("events.id"), nullable=False)
    session_token = Column(String(512), unique=True, nullable=False)  # Base64-encoded signed payload
    token_signature = Column(String(512), nullable=False)  # HMAC-SHA256 signature
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)  # 30-60 seconds from creation
    is_revoked = Column(Boolean, default=False, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    nonce = Column(String(64), unique=True, nullable=False)  # Cryptographic nonce for replay prevention
    
    # Relationships
    event = relationship("Event", back_populates="qr_sessions")
    attendance_records = relationship("AttendanceRecord", back_populates="qr_session")
    
    __table_args__ = (
        Index('idx_qr_sessions_token', 'session_token'),
        Index('idx_qr_sessions_expiry', 'expires_at'),
        Index('idx_qr_sessions_event', 'event_id'),
        Index('idx_qr_sessions_nonce', 'nonce'),
        CheckConstraint('expires_at > created_at', name='valid_expiry'),
    )
    
    @property
    def is_expired(self):
        now = datetime.now(timezone.utc)
        expires = self.expires_at if self.expires_at.tzinfo else self.expires_at.replace(tzinfo=timezone.utc)
        return now > expires
    
    @property
    def is_valid(self):
        return not self.is_revoked and not self.is_expired


class AttendanceRecord(Base):
    """
    Records when a student marks attendance for an event.
    Unique constraint prevents duplicate attendance.
    """
    __tablename__ = "attendance_records"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String, ForeignKey("events.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    qr_session_id = Column(String, ForeignKey("qr_sessions.id"), nullable=False)
    marked_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ip_address = Column(String, nullable=True)  # For audit trail
    user_agent = Column(String, nullable=True)  # For detecting suspicious patterns
    
    # Relationships
    user = relationship("User", back_populates="attendance_records", foreign_keys=[user_id])
    qr_session = relationship("QRSession", back_populates="attendance_records")
    event = relationship("Event", back_populates="attendance_records")
    
    __table_args__ = (
        UniqueConstraint('event_id', 'user_id', name='one_attendance_per_user_per_event'),
        Index('idx_attendance_event', 'event_id'),
        Index('idx_attendance_user', 'user_id'),
        Index('idx_attendance_marked_at', 'marked_at'),
    )


class UsedNonce(Base):
    """
    Tracks used nonces to prevent replay attacks.
    Cleanup job should delete nonces older than 1 hour.
    """
    __tablename__ = "used_nonces"
    
    nonce = Column(String(64), primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    used_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        Index('idx_used_nonces_expiry', 'used_at'),
        UniqueConstraint('nonce', 'user_id', name='one_nonce_per_user'),
    )
