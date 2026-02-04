"""
Models Package

Exports all SQLAlchemy models for the Research Assistant AI application.
"""

from app.models.base import Base, BaseModel, TimestampMixin, UUIDMixin
from app.models.embedding import EMBEDDING_DIMENSION, PaperEmbedding, SearchQuery
from app.models.job import JobStatus, JobType, ProcessingJob
from app.models.paper import Paper, PaperContent, PaperSource, ProcessingStatus
from app.models.summary import (
    Flashcard,
    FlashcardDifficulty,
    Summary,
    SummaryStatus,
    SummaryType,
)
from app.models.user import User, UserTier

__all__ = [
    # Base
    "Base",
    "BaseModel",
    "TimestampMixin",
    "UUIDMixin",
    # User
    "User",
    "UserTier",
    # Paper
    "Paper",
    "PaperContent",
    "PaperSource",
    "ProcessingStatus",
    # Summary
    "Summary",
    "SummaryType",
    "SummaryStatus",
    "Flashcard",
    "FlashcardDifficulty",
    # Embedding
    "PaperEmbedding",
    "SearchQuery",
    "EMBEDDING_DIMENSION",
    # Job
    "ProcessingJob",
    "JobType",
    "JobStatus",
]
