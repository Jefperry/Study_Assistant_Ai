"""
Summary Schemas

Pydantic models for summary-related request/response validation.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SummaryTypeEnum(str, Enum):
    """Types of summaries available."""
    BRIEF = "brief"
    DETAILED = "detailed"
    KEY_POINTS = "key_points"
    ABSTRACT = "abstract"
    EXTRACTIVE = "extractive"


class FlashcardDifficulty(str, Enum):
    """Flashcard difficulty levels."""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


# ===========================================
# Request Schemas
# ===========================================

class SummaryCreate(BaseModel):
    """Schema for creating a summary."""
    paper_id: UUID
    summary_type: SummaryTypeEnum = SummaryTypeEnum.BRIEF


class FlashcardCreate(BaseModel):
    """Schema for generating flashcards."""
    paper_id: UUID
    count: int = Field(default=10, ge=1, le=50)


class FlashcardUpdate(BaseModel):
    """Schema for updating a flashcard."""
    question: Optional[str] = None
    answer: Optional[str] = None
    difficulty: Optional[FlashcardDifficulty] = None


# ===========================================
# Response Schemas
# ===========================================

class SummaryResponse(BaseModel):
    """Schema for summary response."""
    id: UUID
    paper_id: UUID
    summary_type: str
    content: str
    model_used: Optional[str] = None
    status: str
    created_at: datetime
    
    model_config = {"from_attributes": True}


class SummaryListResponse(BaseModel):
    """Schema for list of summaries."""
    summaries: list[SummaryResponse]
    total: int


class FlashcardResponse(BaseModel):
    """Schema for flashcard response."""
    id: UUID
    summary_id: UUID
    question: str
    answer: str
    difficulty: str
    times_reviewed: int = 0
    times_correct: int = 0
    created_at: datetime
    
    model_config = {"from_attributes": True}


class FlashcardListResponse(BaseModel):
    """Schema for list of flashcards."""
    flashcards: list[FlashcardResponse]
    total: int


class GeneratedFlashcard(BaseModel):
    """Schema for AI-generated flashcard (before saving)."""
    question: str
    answer: str
    difficulty: str = "medium"


class FlashcardGenerateResponse(BaseModel):
    """Response for flashcard generation."""
    paper_id: UUID
    flashcards: list[GeneratedFlashcard]
    count: int
