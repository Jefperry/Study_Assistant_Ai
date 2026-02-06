"""
Paper Model

Handles research paper metadata, file storage references, and processing status.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.embedding import PaperEmbedding
    from app.models.summary import Summary
    from app.models.user import User


class PaperSource(str, Enum):
    """Source of the paper."""
    UPLOAD = "upload"      # User uploaded PDF
    ARXIV = "arxiv"        # Downloaded from ArXiv
    DOI = "doi"            # Downloaded via DOI
    URL = "url"            # Downloaded from URL


class ProcessingStatus(str, Enum):
    """Paper processing pipeline status."""
    PENDING = "pending"
    EXTRACTING = "extracting"
    EMBEDDING = "embedding"
    SUMMARIZING = "summarizing"
    COMPLETED = "completed"
    FAILED = "failed"


class Paper(BaseModel):
    """
    Research paper model.
    
    Attributes:
        user_id: Owner of the paper.
        title: Paper title (extracted or user-provided).
        authors: List of author names.
        abstract: Paper abstract.
        source: Where the paper came from.
        source_id: External ID (arXiv ID, DOI, etc.).
        file_path: Local storage path for PDF.
        file_size: PDF file size in bytes.
        page_count: Number of pages.
        status: Current processing status.
        metadata: Additional extracted metadata (JSON).
    
    Relationships:
        user: Paper owner.
        content: Extracted text content.
        summaries: AI-generated summaries.
        embeddings: Vector embeddings for semantic search.
    """
    
    __tablename__ = "papers"
    
    # Ownership
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Metadata
    title: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
    )
    authors: Mapped[Optional[list[str]]] = mapped_column(
        ARRAY(String(255)),
        nullable=True,
    )
    abstract: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    publication_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    journal: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    
    # Source Information
    source: Mapped[str] = mapped_column(
        String(20),
        default=PaperSource.UPLOAD.value,
        nullable=False,
    )
    source_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )
    source_url: Mapped[Optional[str]] = mapped_column(
        String(1024),
        nullable=True,
    )
    doi: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )
    arxiv_id: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True,
    )
    
    # File Storage
    file_path: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
    )
    file_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    file_size: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    file_hash: Mapped[Optional[str]] = mapped_column(
        String(64),  # SHA-256 hash
        nullable=True,
        index=True,
    )
    
    # Document Info
    page_count: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    word_count: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    language: Mapped[Optional[str]] = mapped_column(
        String(10),
        default="en",
        nullable=True,
    )
    
    # Tags for organization
    tags: Mapped[Optional[list[str]]] = mapped_column(
        ARRAY(String(100)),
        nullable=True,
    )
    
    # Processing Status
    status: Mapped[str] = mapped_column(
        String(20),
        default=ProcessingStatus.PENDING.value,
        nullable=False,
        index=True,
    )
    processing_error: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    
    # Extended Metadata (JSON) - renamed from 'metadata' as it's reserved in SQLAlchemy
    extra_data: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        default=dict,
    )
    
    # Soft Delete
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    
    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="papers",
    )
    content: Mapped[Optional["PaperContent"]] = relationship(
        "PaperContent",
        back_populates="paper",
        uselist=False,
        cascade="all, delete-orphan",
    )
    summaries: Mapped[list["Summary"]] = relationship(
        "Summary",
        back_populates="paper",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    embeddings: Mapped[list["PaperEmbedding"]] = relationship(
        "PaperEmbedding",
        back_populates="paper",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    
    # Indexes
    __table_args__ = (
        Index("ix_papers_user_status", "user_id", "status"),
        Index("ix_papers_user_created", "user_id", "created_at"),
        Index("ix_papers_source_id", "source", "source_id"),
    )
    
    def __repr__(self) -> str:
        return f"<Paper(id={self.id}, title={self.title[:50]}..., status={self.status})>"
    
    @property
    def is_processed(self) -> bool:
        """Check if paper has been fully processed."""
        return self.status == ProcessingStatus.COMPLETED.value
    
    @property
    def has_error(self) -> bool:
        """Check if processing failed."""
        return self.status == ProcessingStatus.FAILED.value


class PaperContent(BaseModel):
    """
    Extracted text content from a paper.
    
    Stored separately to keep the main Paper table lightweight.
    Contains full text and structured sections if detected.
    """
    
    __tablename__ = "paper_contents"
    
    # Reference to Paper
    paper_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("papers.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    
    # Full Text
    full_text: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    
    # Structured Sections (JSON)
    # Format: {"introduction": "...", "methods": "...", "results": "...", ...}
    sections: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
    )
    
    # Tables extracted from PDF (JSON array)
    tables: Mapped[Optional[list]] = mapped_column(
        JSONB,
        nullable=True,
    )
    
    # Figures/Images metadata (JSON array)
    figures: Mapped[Optional[list]] = mapped_column(
        JSONB,
        nullable=True,
    )
    
    # References/Citations (JSON array)
    references: Mapped[Optional[list]] = mapped_column(
        JSONB,
        nullable=True,
    )
    
    # Relationship
    paper: Mapped["Paper"] = relationship(
        "Paper",
        back_populates="content",
    )
    
    def __repr__(self) -> str:
        text_len = len(self.full_text) if self.full_text else 0
        return f"<PaperContent(paper_id={self.paper_id}, text_length={text_len})>"
