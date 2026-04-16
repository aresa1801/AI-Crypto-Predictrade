"""
Security Module

Handles JWT tokens, password hashing, API key validation,
and other security-related functionality.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import secrets

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core.config import settings


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenData(BaseModel):
    """JWT Token data model"""
    sub: str
    exp: datetime
    type: str = "access"
    scopes: list[str] = []


class Token(BaseModel):
    """Token response model"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(
    data: dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token
    
    Args:
        data: Data to encode in the token
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key.get_secret_value(),
        algorithm="HS256"
    )
    
    return encoded_jwt


def decode_token(token: str) -> Optional[TokenData]:
    """
    Decode and validate a JWT token
    
    Args:
        token: JWT token string
        
    Returns:
        TokenData if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token,
            settings.secret_key.get_secret_value(),
            algorithms=["HS256"]
        )
        
        return TokenData(
            sub=payload.get("sub", ""),
            exp=datetime.fromtimestamp(payload.get("exp", 0), tz=timezone.utc),
            type=payload.get("type", "access"),
            scopes=payload.get("scopes", [])
        )
    except JWTError:
        return None


def generate_api_key() -> str:
    """
    Generate a secure API key
    
    Returns:
        Secure random API key string
    """
    return f"pt_{secrets.token_urlsafe(32)}"


def hash_api_key(api_key: str) -> str:
    """
    Hash an API key for storage
    
    Args:
        api_key: Plain API key
        
    Returns:
        Hashed API key
    """
    return pwd_context.hash(api_key)


def verify_api_key(plain_key: str, hashed_key: str) -> bool:
    """
    Verify an API key against its hash
    
    Args:
        plain_key: Plain API key
        hashed_key: Hashed API key from database
        
    Returns:
        True if valid, False otherwise
    """
    return pwd_context.verify(plain_key, hashed_key)


class APIKeyManager:
    """
    Manages API key lifecycle including rotation and validation
    """
    
    def __init__(self):
        self._cached_keys: dict[str, datetime] = {}
        self._rotation_days = 90  # Rotate keys every 90 days
    
    def create_key(self) -> tuple[str, str]:
        """
        Create a new API key
        
        Returns:
            Tuple of (plain_key, hashed_key)
        """
        plain_key = generate_api_key()
        hashed_key = hash_api_key(plain_key)
        self._cached_keys[hashed_key] = datetime.now(timezone.utc)
        return plain_key, hashed_key
    
    def should_rotate(self, created_at: datetime) -> bool:
        """
        Check if a key should be rotated
        
        Args:
            created_at: When the key was created
            
        Returns:
            True if key should be rotated
        """
        age = datetime.now(timezone.utc) - created_at
        return age.days >= self._rotation_days
    
    def validate_key(self, plain_key: str, hashed_key: str) -> bool:
        """
        Validate an API key
        
        Args:
            plain_key: Plain API key from request
            hashed_key: Hashed key from database
            
        Returns:
            True if valid
        """
        return verify_api_key(plain_key, hashed_key)


# Singleton instance
api_key_manager = APIKeyManager()
