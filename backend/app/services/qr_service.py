
import secrets
import hmac
import hashlib
import json
import base64
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..models.attendance import QRSession
from ..config import get_settings
from ..utils import utc_now

class QRService:
    """
    Service for generating and verifying cryptographically signed QR codes.
    
    Security features:
    - HMAC-SHA256 signing prevents tampering
    - Short expiry (60 seconds) limits screenshot sharing window
    - Unique nonce per QR prevents replay attacks
    - Server-side verification ensures authenticity
    """
    
    @staticmethod
    def generate_nonce() -> str:
        """Generate a cryptographically secure 64-character nonce."""
        return secrets.token_urlsafe(48)  # 48 bytes = 64 base64 characters
    
    @staticmethod
    def sign_payload(payload: dict) -> tuple[str, str]:
        """
        Sign a QR payload using HMAC-SHA256.
        
        Returns:
            tuple: (qr_payload, signature)
        """
        settings = get_settings()
        
        # Convert payload to canonical JSON (no whitespace, sorted keys)
        payload_json = json.dumps(payload, separators=(',', ':'), sort_keys=True)
        
        # Sign with HMAC-SHA256
        signature = hmac.new(
            settings.QR_SIGNING_SECRET.encode('utf-8'),
            payload_json.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Combine payload + signature and encode
        combined = f"{payload_json}.{signature}"
        qr_payload = base64.urlsafe_b64encode(combined.encode('utf-8')).decode('utf-8')
        
        return qr_payload, signature
    
    @staticmethod
    def verify_payload(qr_payload: str) -> dict:
        """
        Verify and decode a QR payload.
        
        Raises:
            ValueError: If payload is invalid or signature doesn't match
        
        Returns:
            dict: Decoded payload
        """
        settings = get_settings()
        
        try:
            # Decode base64
            decoded = base64.urlsafe_b64decode(qr_payload).decode('utf-8')
            payload_json, provided_signature = decoded.rsplit('.', 1)
            
            # Verify signature
            expected_signature = hmac.new(
                settings.QR_SIGNING_SECRET.encode('utf-8'),
                payload_json.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            # Constant-time comparison to prevent timing attacks
            if not hmac.compare_digest(provided_signature, expected_signature):
                raise ValueError("Invalid signature")
            
            # Parse payload
            payload = json.loads(payload_json)
            
            # Verify expiry
            if payload.get('exp', 0) < int(utc_now().timestamp()):
                raise ValueError("QR code expired")
            
            return payload
            
        except Exception as e:
            raise ValueError(f"Invalid QR payload: {str(e)}")
    
    @staticmethod
    def create_qr_session(db: Session, event_id: str, admin_id: str) -> dict:
        """
        Create a new QR session for an event.
        
        Returns:
            dict: {
                'session_id': str,
                'qr_payload': str,
                'expires_at': datetime,
                'expires_in_seconds': int
            }
        """
        settings = get_settings()
        
        # Generate unique nonce
        nonce = QRService.generate_nonce()
        
        # Calculate expiry
        created_at = utc_now()
        expires_at = created_at + timedelta(seconds=settings.QR_EXPIRY_SECONDS)
        
        # Create cryptographically strong session ID (URL-safe base64)
        session_id = secrets.token_urlsafe(32)
        
        # Build payload
        payload = {
            's': session_id,        # session ID
            'n': nonce,             # nonce for replay prevention
            'e': event_id,          # event ID
            'exp': int(expires_at.timestamp())  # expiry timestamp
        }
        
        # Sign payload
        qr_payload, signature = QRService.sign_payload(payload)
        
        # Store in database
        qr_session = QRSession(
            id=session_id,
            event_id=event_id,
            session_token=qr_payload,
            token_signature=signature,
            created_by=admin_id,
            created_at=created_at,
            expires_at=expires_at,
            nonce=nonce,
            is_revoked=False
        )
        
        db.add(qr_session)
        db.commit()
        db.refresh(qr_session)
        
        return {
            'session_id': session_id,
            'qr_payload': qr_payload,
            'expires_at': expires_at,
            'expires_in_seconds': settings.QR_EXPIRY_SECONDS
        }
    
    @staticmethod
    def revoke_session(db: Session, session_id: str):
        """Revoke a QR session (makes it unusable)."""
        session = db.query(QRSession).filter(QRSession.id == session_id).first()
        if session:
            session.is_revoked = True
            session.revoked_at = utc_now()
            db.commit()
