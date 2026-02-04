"""
Papers API Endpoints

Handles paper upload, retrieval, and management.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.paper import (
    PaperContentResponse,
    PaperListResponse,
    PaperResponse,
    PaperUpdateRequest,
    ProcessingJobResponse,
    UploadResponse,
)
from app.services.paper_service import PaperService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/papers", tags=["Papers"])

# Maximum file size: 50MB
MAX_FILE_SIZE = 50 * 1024 * 1024


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a PDF paper",
    description="Upload a PDF research paper for processing and summarization."
)
async def upload_paper(
    file: UploadFile = File(..., description="PDF file to upload"),
    title: Optional[str] = Form(None, description="Optional title override"),
    tags: Optional[str] = Form(None, description="Comma-separated tags"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> UploadResponse:
    """
    Upload a PDF paper for processing.
    
    - Validates file type (PDF only)
    - Checks file size limit (50MB)
    - Checks user upload quota
    - Extracts text and metadata
    - Queues for AI processing
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )
    
    if file.content_type and file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF files are supported"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file"
        )
    
    # Check user quota
    service = PaperService(db)
    if not await service.check_usage_limit(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Upload limit reached ({current_user.papers_limit} papers). Upgrade your plan for more."
        )
    
    # Parse tags
    tag_list = None
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    
    try:
        # Create paper and start processing
        paper, job = await service.create_paper_from_upload(
            user_id=current_user.id,
            file_content=content,
            filename=file.filename,
            title=title,
            tags=tag_list
        )
        
        logger.info(f"Paper uploaded: {paper.id} by user {current_user.id}")
        
        # TODO: Queue background processing task
        # from app.tasks.paper_tasks import process_paper
        # process_paper.delay(str(paper.id))
        
        return UploadResponse(
            paper=PaperResponse.model_validate(paper),
            job=ProcessingJobResponse.model_validate(job),
            message="Paper uploaded and processing started"
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process upload"
        )


@router.get(
    "",
    response_model=PaperListResponse,
    summary="List user's papers",
    description="Get a paginated list of the current user's papers."
)
async def list_papers(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> PaperListResponse:
    """Get paginated list of user's papers."""
    service = PaperService(db)
    papers, total = await service.get_user_papers(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        status=status
    )
    
    return PaperListResponse(
        papers=[PaperResponse.model_validate(p) for p in papers],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total
    )


@router.get(
    "/{paper_id}",
    response_model=PaperResponse,
    summary="Get paper details",
    description="Get details of a specific paper."
)
async def get_paper(
    paper_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> PaperResponse:
    """Get a specific paper by ID."""
    service = PaperService(db)
    paper = await service.get_paper_by_id(paper_id, current_user.id)
    
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper not found"
        )
    
    return PaperResponse.model_validate(paper)


@router.get(
    "/{paper_id}/content",
    response_model=PaperContentResponse,
    summary="Get paper content",
    description="Get the extracted content of a paper."
)
async def get_paper_content(
    paper_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> PaperContentResponse:
    """Get the extracted content of a paper."""
    service = PaperService(db)
    content = await service.get_paper_content(paper_id, current_user.id)
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper content not found"
        )
    
    return PaperContentResponse.model_validate(content)


@router.patch(
    "/{paper_id}",
    response_model=PaperResponse,
    summary="Update paper",
    description="Update paper metadata."
)
async def update_paper(
    paper_id: UUID,
    update_data: PaperUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> PaperResponse:
    """Update paper metadata."""
    service = PaperService(db)
    paper = await service.get_paper_by_id(paper_id, current_user.id)
    
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper not found"
        )
    
    # Update fields
    if update_data.title is not None:
        paper.title = update_data.title
    if update_data.authors is not None:
        paper.authors = update_data.authors
    if update_data.tags is not None:
        paper.tags = update_data.tags
    
    await db.commit()
    await db.refresh(paper)
    
    return PaperResponse.model_validate(paper)


@router.delete(
    "/{paper_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete paper",
    description="Delete a paper and all associated data."
)
async def delete_paper(
    paper_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a paper."""
    service = PaperService(db)
    deleted = await service.delete_paper(paper_id, current_user.id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper not found"
        )
    
    return None
