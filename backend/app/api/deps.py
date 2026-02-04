"""
API Dependencies

FastAPI dependency injection for authentication, database sessions, and rate limiting.
"""

from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import decode_token, decode_supabase_token
from app.database import get_db
from app.models.user import User

# Security scheme for JWT Bearer tokens
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Get the current authenticated user from JWT token.
    
    This dependency:
    1. Extracts the Bearer token from Authorization header
    2. Validates the JWT token (supports both local and Supabase tokens)
    3. Fetches the user from database
    4. Raises 401 if token is invalid or user not found
    
    Args:
        credentials: Bearer token from Authorization header
        db: Database session
        
    Returns:
        The authenticated User model instance
        
    Raises:
        HTTPException: 401 if not authenticated
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = credentials.credentials
    
    # Try local JWT first
    payload = decode_token(token)
    
    if payload:
        user_id = payload.sub
        token_type = payload.type
    else:
        # Try Supabase JWT
        supabase_payload = decode_supabase_token(token)
        if supabase_payload:
            user_id = supabase_payload.get("sub")
            token_type = "access"
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"}
            )
    
    # Validate token type
    if token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Fetch user from database
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    result = await db.execute(
        select(User).where(User.id == user_uuid)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Get the current user if authenticated, None otherwise.
    
    Use this for endpoints that work for both authenticated and anonymous users.
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current user and verify they are active.
    
    This is the same as get_current_user but makes the intent clearer.
    """
    return current_user


def require_tier(minimum_tier: str):
    """
    Dependency factory that requires a minimum user tier.
    
    Usage:
        @router.post("/premium-feature", dependencies=[Depends(require_tier("pro"))])
        
    Args:
        minimum_tier: One of "free", "pro", "enterprise"
    """
    tier_levels = {"free": 0, "pro": 1, "enterprise": 2}
    min_level = tier_levels.get(minimum_tier, 0)
    
    async def tier_checker(user: User = Depends(get_current_user)) -> User:
        user_level = tier_levels.get(user.tier, 0)
        if user_level < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature requires {minimum_tier} tier or higher"
            )
        return user
    
    return tier_checker


class RateLimiter:
    """
    Simple in-memory rate limiter.
    
    For production, this should use Redis via Upstash.
    """
    
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self._requests: dict = {}  # user_id -> list of timestamps
    
    async def check_rate_limit(
        self,
        user: User = Depends(get_current_user)
    ) -> User:
        """Check if user is within rate limit."""
        # TODO: Implement Redis-based rate limiting
        # For now, just pass through
        return user


# Default rate limiter instance
rate_limiter = RateLimiter(requests_per_minute=60)
