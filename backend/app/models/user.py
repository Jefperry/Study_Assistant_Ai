"""
User Model

Handles user authentication, profile, and account settings.
Integrates with Supabase Auth for password management.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.paper import Paper
    from app.models.summary import Summary


class UserTier(str, Enum):
    """User subscription tiers."""
    FREE = "free"
    VERIFIED = "verified"
    PREMIUM = "premium"


class User(BaseModel):
    """
    User account model.
    
    Attributes:
        email: Unique email address (used for login).
        hashed_password: Bcrypt hashed password.
        full_name: User's display name.
        tier: Subscription tier (free/verified/premium).
        is_active: Account activation status.
        is_verified: Email verification status.
        last_login_at: Last successful login timestamp.
        daily_upload_count: Papers uploaded today (reset daily).
        daily_upload_reset_at: When to reset upload counter.
    
    Relationships:
        papers: User's uploaded research papers.
        summaries: AI-generated summaries for user's papers.
    """
    
    __tablename__ = "users"
    
    # Authentication
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    
    # Profile
    full_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    avatar_url: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
    )
    
    # Account Status
    tier: Mapped[str] = mapped_column(
        String(20),
        default=UserTier.FREE.value,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    
    # Tracking
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    
    # Rate Limiting (daily upload count)
    daily_upload_count: Mapped[int] = mapped_column(
        default=0,
        nullable=False,
    )
    daily_upload_reset_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    
    # Relationships
    papers: Mapped[list["Paper"]] = relationship(
        "Paper",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    
    # Indexes for common queries
    __table_args__ = (
        Index("ix_users_email_active", "email", "is_active"),
        Index("ix_users_tier", "tier"),
    )
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, tier={self.tier})>"
    
    @property
    def is_premium(self) -> bool:
        """Check if user has premium access."""
        return self.tier == UserTier.PREMIUM.value
    
    @property
    def upload_limit(self) -> int:
        """Get daily upload limit based on tier."""
        limits = {
            UserTier.FREE.value: 3,
            UserTier.VERIFIED.value: 10,
            UserTier.PREMIUM.value: 100,
        }
        return limits.get(self.tier, 3)
    
    def can_upload(self) -> bool:
        """Check if user can upload more papers today."""
        return self.daily_upload_count < self.upload_limit
