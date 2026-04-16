"""
User Models - User accounts and API keys
"""

from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import String, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    """User account model"""
    
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    # Authentication
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Profile
    username: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Settings
    settings: Mapped[dict] = mapped_column(JSONB, default=dict)
    
    # Timestamps
    last_login: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)


class APIKey(Base):
    """API Key model for external access"""
    
    __tablename__ = "api_keys"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True
    )
    
    # Key info
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(10), nullable=False)  # First 8 chars for identification
    hashed_key: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Permissions
    scopes: Mapped[list] = mapped_column(JSONB, default=["read"])  # read, trade, admin
    
    # Rate limiting
    rate_limit_per_minute: Mapped[int] = mapped_column(default=60)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Expiration
    expires_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    # Usage tracking
    last_used_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    usage_count: Mapped[int] = mapped_column(default=0)
    
    # IP restrictions (optional)
    allowed_ips: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    
    __table_args__ = (
        Index("idx_api_keys_user_active", "user_id", "is_active"),
    )
