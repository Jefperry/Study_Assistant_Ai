"""
Processing Job Model

Tracks async background jobs for PDF processing and AI tasks.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class JobType(str, Enum):
    """Types of background jobs."""
    PDF_EXTRACTION = "pdf_extraction"
    EMBEDDING_GENERATION = "embedding_generation"
    SUMMARIZATION = "summarization"
    FLASHCARD_GENERATION = "flashcard_generation"
    FULL_PIPELINE = "full_pipeline"
    ARXIV_DOWNLOAD = "arxiv_download"


class JobStatus(str, Enum):
    """Job execution status."""
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"


class ProcessingJob(BaseModel):
    """
    Background job tracking.
    
    Tracks the status of async Celery tasks for real-time
    progress updates via WebSocket.
    
    Attributes:
        user_id: Owner of the job.
        paper_id: Associated paper (if applicable).
        job_type: Type of processing job.
        status: Current execution status.
        progress: Completion percentage (0-100).
        celery_task_id: Celery task UUID for status lookup.
        result: Job output data (JSON).
        error_message: Error details if failed.
    """
    
    __tablename__ = "processing_jobs"
    
    # Ownership
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Association
    paper_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("papers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    # Job Configuration
    job_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    
    # Status Tracking
    status: Mapped[str] = mapped_column(
        String(20),
        default=JobStatus.PENDING.value,
        nullable=False,
        index=True,
    )
    progress: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    progress_message: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    
    # Celery Integration
    celery_task_id: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        unique=True,
        index=True,
    )
    
    # Timing
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    execution_time_seconds: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    
    # Results
    result: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    error_traceback: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    
    # Retry Information
    retry_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    max_retries: Mapped[int] = mapped_column(
        Integer,
        default=3,
        nullable=False,
    )
    
    # Indexes
    __table_args__ = (
        Index("ix_jobs_user_status", "user_id", "status"),
        Index("ix_jobs_user_type", "user_id", "job_type"),
        Index("ix_jobs_paper_type", "paper_id", "job_type"),
    )
    
    def __repr__(self) -> str:
        return f"<ProcessingJob(id={self.id}, type={self.job_type}, status={self.status})>"
    
    @property
    def is_running(self) -> bool:
        """Check if job is currently executing."""
        return self.status in (JobStatus.RUNNING.value, JobStatus.RETRYING.value)
    
    @property
    def is_finished(self) -> bool:
        """Check if job has completed (success or failure)."""
        return self.status in (
            JobStatus.COMPLETED.value,
            JobStatus.FAILED.value,
            JobStatus.CANCELLED.value,
        )
    
    @property
    def can_retry(self) -> bool:
        """Check if job can be retried."""
        return (
            self.status == JobStatus.FAILED.value
            and self.retry_count < self.max_retries
        )
