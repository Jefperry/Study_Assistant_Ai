"""
Database Connection Module

Provides async SQLAlchemy engine, session factory, and FastAPI dependency.
Configured for PostgreSQL with pgvector support via Supabase.
"""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings
from app.models.base import Base

# 
# Async Engine Configuration
# 
# Convert sync URL to async psycopg URL
database_url = settings.DATABASE_URL
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_async_engine(
    database_url,
    echo=settings.DB_ECHO,
    future=True,
    pool_pre_ping=True,  # Verify connections before use
    pool_size=10,        # Base pool size
    max_overflow=20,     # Additional connections allowed
    pool_recycle=3600,   # Recycle connections after 1 hour
)

# 
# Session Factory
# 
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base is imported from app.models.base

# 
# FastAPI Dependency
# 
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a database session.
    
    Yields an async session and handles commit/rollback/close automatically.
    
    Usage:
        @router.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
