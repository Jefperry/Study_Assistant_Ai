"""
Summary Model

Handles AI-generated summaries (extractive and generative) and flashcards.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.paper import Paper


class SummaryType(str, Enum):
    """Type of AI summary."""
    EXTRACTIVE = "extractive"   # BART-based key sentence extraction
    GENERATIVE = "generative"   # Groq LLM synthesis
    HYBRID = "hybrid"           # Combined approach


class SummaryStatus(str, Enum):
    """Summary generation status."""
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class Summary(BaseModel):
    """
    AI-generated paper summary.
    
    Attributes:
        paper_id: Associated paper.
        summary_type: Type of summarization used.
        content: The generated summary text.
        key_points: Extracted key takeaways (JSON array).
        model_used: AI model identifier.
        tokens_used: Number of tokens consumed.
        generation_time: Time to generate in seconds.
    
    Relationships:
        paper: Source paper.
        flashcards: Generated study flashcards.
    """
    
    __tablename__ = "summaries"
    
    # Reference to Paper
    paper_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("papers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Summary Content
    summary_type: Mapped[str] = mapped_column(
        String(20),
        default=SummaryType.HYBRID.value,
        nullable=False,
    )
    content: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    
    # Structured Outputs
    key_points: Mapped[Optional[list]] = mapped_column(
        JSONB,
        nullable=True,
    )
    methodology_summary: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    findings_summary: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    limitations: Mapped[Optional[list]] = mapped_column(
        JSONB,
        nullable=True,
    )
    
    # Generation Metadata
    status: Mapped[str] = mapped_column(
        String(20),
        default=SummaryStatus.PENDING.value,
        nullable=False,
    )
    model_used: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    tokens_used: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    generation_time_seconds: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    
    # Prompt/Configuration used (for reproducibility)
    prompt_config: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
    )
    
    # Relationships
    paper: Mapped["Paper"] = relationship(
        "Paper",
        back_populates="summaries",
    )
    flashcards: Mapped[list["Flashcard"]] = relationship(
        "Flashcard",
        back_populates="summary",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    
    # Indexes
    __table_args__ = (
        Index("ix_summaries_paper_type", "paper_id", "summary_type"),
        Index("ix_summaries_status", "status"),
    )
    
    def __repr__(self) -> str:
        return f"<Summary(id={self.id}, paper_id={self.paper_id}, type={self.summary_type})>"


class FlashcardDifficulty(str, Enum):
    """Flashcard difficulty levels."""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Flashcard(BaseModel):
    """
    Study flashcard generated from paper summary.
    
    Attributes:
        summary_id: Associated summary.
        question: Front of the flashcard.
        answer: Back of the flashcard.
        difficulty: Difficulty level.
        topic: Topic/category tag.
        source_section: Which paper section this came from.
    """
    
    __tablename__ = "flashcards"
    
    # Reference to Summary
    summary_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("summaries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Flashcard Content
    question: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    answer: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    
    # Categorization
    difficulty: Mapped[str] = mapped_column(
        String(20),
        default=FlashcardDifficulty.MEDIUM.value,
        nullable=False,
    )
    topic: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    source_section: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    
    # Spaced Repetition (for future enhancement)
    times_reviewed: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    times_correct: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    last_reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    next_review_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    
    # Relationship
    summary: Mapped["Summary"] = relationship(
        "Summary",
        back_populates="flashcards",
    )
    
    # Indexes
    __table_args__ = (
        Index("ix_flashcards_summary_difficulty", "summary_id", "difficulty"),
    )
    
    def __repr__(self) -> str:
        return f"<Flashcard(id={self.id}, question={self.question[:30]}...)>"
    
    @property
    def accuracy(self) -> float:
        """Calculate answer accuracy percentage."""
        if self.times_reviewed == 0:
            return 0.0
        return (self.times_correct / self.times_reviewed) * 100
