from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    
    # JWT Authentication
    SECRET_KEY: str  # 256-bit key for JWT signing
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # Short-lived access tokens
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # QR Security (Critical for anti-cheat)
    QR_SIGNING_SECRET: str  # Separate 256-bit key for QR code signing
    QR_EXPIRY_SECONDS: int = 60  # QR codes expire in 60 seconds
    
    # Admin Credentials
    ADMIN_EMAIL: str
    ADMIN_PASSWORD: str
    
    # Approval Workflow
    APPROVAL_TIMEOUT_MINUTES: int = 3  # Signup approval timeout
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Monitoring & Logging
    SENTRY_DSN: str | None = None
    LOG_LEVEL: str = "INFO"
    
    # Redis (for caching and rate limiting)
    REDIS_URL: str | None = None
    
    # Security
    BCRYPT_ROUNDS: int = 12  # Password hashing cost factor
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
