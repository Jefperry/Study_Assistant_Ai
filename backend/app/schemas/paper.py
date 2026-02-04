"""
Paper Schemas

Pydantic models for paper-related request/response validation.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class PaperSource(str, Enum):
    """Source of the paper."""
    UPLOAD = "upload"
    ARXIV = "arxiv"
    DOI = "doi"
    URL = "url"


class ProcessingStatus(str, Enum):
    """Processing status of paper."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# ===========================================
# Request Schemas
# ===========================================

class PaperUploadRequest(BaseModel):
    """Schema for paper upload metadata (file sent separately)."""
    title: Optional[str] = Field(None, max_length=500)
    authors: Optional[List[str]] = None
    tags: Optional[List[str]] = None


class ArxivImportRequest(BaseModel):
    """Schema for importing paper from ArXiv."""
    arxiv_id: str = Field(..., pattern=r"^\d{4}\.\d{4,5}(v\d+)?$")
    

class UrlImportRequest(BaseModel):
    """Schema for importing paper from URL."""
    url: HttpUrl


class PaperUpdateRequest(BaseModel):
    """Schema for updating paper metadata."""
    title: Optional[str] = Field(None, max_length=500)
    authors: Optional[List[str]] = None
    tags: Optional[List[str]] = None


# ===========================================
# Response Schemas
# ===========================================

class PaperResponse(BaseModel):
    """Schema for paper response."""
    id: UUID
    user_id: UUID
    title: Optional[str] = None
    authors: Optional[List[str]] = None
    abstract: Optional[str] = None
    source: str
    source_id: Optional[str] = None
    arxiv_id: Optional[str] = None
    doi: Optional[str] = None
    file_url: Optional[str] = None
    file_hash: Optional[str] = None
    status: str
    page_count: Optional[int] = None
    word_count: Optional[int] = None
    tags: Optional[List[str]] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class PaperListResponse(BaseModel):
    """Schema for paginated paper list."""
    papers: List[PaperResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class PaperContentResponse(BaseModel):
    """Schema for paper content."""
    id: UUID
    paper_id: UUID
    full_text: Optional[str] = None
    sections: Optional[dict] = None
    figures: Optional[List[dict]] = None
    tables: Optional[List[dict]] = None
    references: Optional[List[dict]] = None
    
    model_config = {"from_attributes": True}


class ProcessingJobResponse(BaseModel):
    """Schema for processing job status."""
    id: UUID
    paper_id: UUID
    job_type: str
    status: str
    progress: int
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    """Response after successful upload."""
    paper: PaperResponse
    job: ProcessingJobResponse
    message: str = "Paper uploaded and processing started"
