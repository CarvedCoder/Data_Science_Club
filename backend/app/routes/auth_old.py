from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from ..database import get_db
from ..models.user import User, UserRole
from ..models.approval import ApprovalRequest, ApprovalStatus
from ..utils.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    validate_password_strength,
    validate_email
)
from ..middleware.auth_middleware import get_current_user
from ..services.audit_service import AuditService
from ..services.notification_service import NotificationService
from ..config import get_settings

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: dict

class RefreshTokenRequest(BaseModel):
    refresh_token: str

@router.post("/signup")
def signup(request: SignupRequest, req: Request, db: Session = Depends(get_db)):
    """
    Register a new user. Creates user in inactive state and generates approval request.
    Admins are notified to approve within 3 minutes.
    """
    # Validate email format
    if not validate_email(request.email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Validate password strength
    password_error = validate_password_strength(request.password)
    if password_error:
        raise HTTPException(status_code=400, detail=password_error)
    
    # Check if user already exists
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user in inactive state (no role assigned until approved)
    user = User(
        email=request.email,
        full_name=request.full_name,
        hashed_password=get_password_hash(request.password),
        role=None,  # Will be set upon approval
        is_active=False
    )
    db.add(user)
    db.flush()  # Get user.id before creating approval request
    
    # Create approval request with 3-minute timeout
    approval_request = ApprovalRequest(
        user_id=user.id,
        status=ApprovalStatus.PENDING,
        requested_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(minutes=settings.APPROVAL_TIMEOUT_MINUTES)
    )
    db.add(approval_request)
    db.commit()
    
    # Log signup
    AuditService.log_signup(db, user.id, req)
    
    # Notify all admins
    NotificationService.notify_admins_new_signup(db, user.id, user.email, user.full_name)
    
    return {
        "message": "Signup successful. Awaiting admin approval (must be approved within 3 minutes).",
        "user_id": user.id,
        "approval_request_id": approval_request.id
    }

@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    req: Request = None,
    db: Session = Depends(get_db)
):
    """
    Login with email and password. Returns access token (15 min) and refresh token (7 days).
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        # Check if there's a pending approval request
        pending_approval = db.query(ApprovalRequest).filter(
            ApprovalRequest.user_id == user.id,
            ApprovalRequest.status == ApprovalStatus.PENDING
        ).first()
        
        if pending_approval:
            if pending_approval.is_expired:
                # Mark as timed out
                pending_approval.status = ApprovalStatus.TIMEOUT
                pending_approval.decided_at = datetime.utcnow()
                db.commit()
                raise HTTPException(
                    status_code=403,
                    detail="Your approval request has timed out. Please contact an administrator."
                )
            else:
                time_left = pending_approval.time_remaining_seconds
                raise HTTPException(
                    status_code=403,
                    detail=f"Your account is pending approval. Time remaining: {time_left} seconds."
                )
        
        # Check if approval was rejected
        rejected_approval = db.query(ApprovalRequest).filter(
            ApprovalRequest.user_id == user.id,
            ApprovalRequest.status == ApprovalStatus.REJECTED
        ).order_by(ApprovalRequest.requested_at.desc()).first()
        
        if rejected_approval:
            reason = rejected_approval.rejection_reason or "No reason provided"
            raise HTTPException(
                status_code=403,
                detail=f"Your account was rejected. Reason: {reason}"
            )
        
        # General inactive message
        raise HTTPException(status_code=403, detail="Account is deactivated. Contact an administrator.")
    
    # Check if user has a role (should always be set after approval)
    if not user.role:
        raise HTTPException(
            status_code=403,
            detail="Account is not properly configured. Contact an administrator."
        )
    
    # Update last login
    user.last_login_at = datetime.utcnow()
    db.commit()
    
    # Generate tokens
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    # Log login
    AuditService.log_login(db, user.id, req)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    token_request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token.
    """
    # Verify refresh token
    payload = verify_refresh_token(token_request.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate new tokens
    access_token = create_access_token(data={"sub": user.id})
    new_refresh_token = create_refresh_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get current user profile.
    """
    # Check for approval status if not yet approved
    approval_info = None
    if not current_user.role or not current_user.is_active:
        approval = db.query(ApprovalRequest).filter(
            ApprovalRequest.user_id == current_user.id
        ).order_by(ApprovalRequest.requested_at.desc()).first()
        
        if approval:
            approval_info = {
                "status": approval.status,
                "requested_at": approval.requested_at.isoformat(),
                "time_remaining_seconds": approval.time_remaining_seconds if approval.status == ApprovalStatus.PENDING else 0,
                "decided_at": approval.decided_at.isoformat() if approval.decided_at else None,
                "rejection_reason": approval.rejection_reason
            }
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat(),
        "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
        "approval_status": approval_info
    }
