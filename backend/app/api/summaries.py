"""
Summaries API Endpoints

Handles AI-powered summarization and flashcard generation.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.paper import Paper
from app.models.summary import Summary, SummaryType
from app.models.user import User
from app.schemas.summary import (
    FlashcardCreate,
    FlashcardGenerateResponse,
    FlashcardListResponse,
    FlashcardResponse,
    GeneratedFlashcard,
    SummaryCreate,
    SummaryListResponse,
    SummaryResponse,
    SummaryTypeEnum,
)
from app.services.summarization_service import summarization_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/summaries", tags=["Summaries"])


@router.post(
    "",
    response_model=SummaryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a summary",
    description="Generate an AI-powered summary for a paper."
)
async def create_summary(
    summary_data: SummaryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SummaryResponse:
    """
    Generate a new summary for a paper.
    
    Available summary types:
    - brief: 2-3 paragraph overview
    - detailed: Comprehensive summary with sections
    - key_points: Bullet-point key findings
    - abstract: Academic abstract format
    - extractive: BART-based sentence extraction
    """
    # Verify paper exists and belongs to user
    result = await db.execute(
        select(Paper).where(
            Paper.id == summary_data.paper_id,
            Paper.user_id == current_user.id
        )
    )
    paper = result.scalar_one_or_none()
    
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper not found"
        )
    
    # Check user's summary limit
    if current_user.summaries_generated >= current_user.summaries_limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Summary limit reached ({current_user.summaries_limit}). Upgrade to continue."
        )
    
    # Map enum to model enum
    summary_type_map = {
        SummaryTypeEnum.BRIEF: SummaryType.BRIEF,
        SummaryTypeEnum.DETAILED: SummaryType.DETAILED,
        SummaryTypeEnum.KEY_POINTS: SummaryType.KEY_POINTS,
        SummaryTypeEnum.ABSTRACT: SummaryType.ABSTRACT,
        SummaryTypeEnum.EXTRACTIVE: SummaryType.EXTRACTIVE,
    }
    
    try:
        summary = await summarization_service.generate_summary(
            paper_id=summary_data.paper_id,
            summary_type=summary_type_map[summary_data.summary_type],
            db=db,
            user_id=current_user.id
        )
        
        # Update user's usage
        current_user.summaries_generated += 1
        await db.commit()
        
        logger.info(f"Summary generated for paper {paper.id} by user {current_user.id}")
        
        return SummaryResponse.model_validate(summary)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate summary"
        )


@router.get(
    "",
    response_model=SummaryListResponse,
    summary="List all summaries",
    description="Get all summaries for the current user with pagination."
)
async def list_summaries(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SummaryListResponse:
    """List all summaries for the current user."""
    offset = (page - 1) * page_size
    
    # Get summaries for user's papers
    result = await db.execute(
        select(Summary)
        .join(Paper)
        .where(Paper.user_id == current_user.id)
        .order_by(Summary.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    summaries = result.scalars().all()
    
    # Get total count
    from sqlalchemy import func
    count_result = await db.execute(
        select(func.count())
        .select_from(Summary)
        .join(Paper)
        .where(Paper.user_id == current_user.id)
    )
    total = count_result.scalar() or 0
    
    return SummaryListResponse(
        items=[SummaryResponse.model_validate(s) for s in summaries],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get(
    "/paper/{paper_id}",
    response_model=SummaryListResponse,
    summary="Get summaries for a paper",
    description="Retrieve all summaries generated for a specific paper."
)
async def get_paper_summaries(
    paper_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SummaryListResponse:
    """Get all summaries for a paper."""
    # Verify paper belongs to user
    result = await db.execute(
        select(Paper).where(
            Paper.id == paper_id,
            Paper.user_id == current_user.id
        )
    )
    paper = result.scalar_one_or_none()
    
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper not found"
        )
    
    # Get summaries
    result = await db.execute(
        select(Summary).where(Summary.paper_id == paper_id)
    )
    summaries = result.scalars().all()
    
    return SummaryListResponse(
        summaries=[SummaryResponse.model_validate(s) for s in summaries],
        total=len(summaries)
    )


@router.get(
    "/{summary_id}",
    response_model=SummaryResponse,
    summary="Get a summary",
    description="Retrieve a specific summary by ID."
)
async def get_summary(
    summary_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SummaryResponse:
    """Get a specific summary."""
    result = await db.execute(
        select(Summary)
        .join(Paper)
        .where(
            Summary.id == summary_id,
            Paper.user_id == current_user.id
        )
    )
    summary = result.scalar_one_or_none()
    
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary not found"
        )
    
    return SummaryResponse.model_validate(summary)


@router.delete(
    "/{summary_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a summary",
    description="Delete a summary."
)
async def delete_summary(
    summary_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a summary."""
    result = await db.execute(
        select(Summary)
        .join(Paper)
        .where(
            Summary.id == summary_id,
            Paper.user_id == current_user.id
        )
    )
    summary = result.scalar_one_or_none()
    
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary not found"
        )
    
    await db.delete(summary)
    await db.commit()


@router.post(
    "/flashcards/generate",
    response_model=FlashcardGenerateResponse,
    summary="Generate flashcards",
    description="Generate study flashcards from a paper using AI."
)
async def generate_flashcards(
    flashcard_data: FlashcardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> FlashcardGenerateResponse:
    """
    Generate flashcards from a paper for studying.
    
    Returns AI-generated question/answer pairs based on the paper content.
    """
    # Verify paper exists and belongs to user
    result = await db.execute(
        select(Paper).where(
            Paper.id == flashcard_data.paper_id,
            Paper.user_id == current_user.id
        )
    )
    paper = result.scalar_one_or_none()
    
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper not found"
        )
    
    try:
        flashcards = await summarization_service.generate_flashcards(
            paper_id=flashcard_data.paper_id,
            db=db,
            count=flashcard_data.count
        )
        
        return FlashcardGenerateResponse(
            paper_id=flashcard_data.paper_id,
            flashcards=[GeneratedFlashcard(**fc) for fc in flashcards],
            count=len(flashcards)
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Flashcard generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate flashcards"
        )
