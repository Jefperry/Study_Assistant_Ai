"""
Search API Endpoints

Semantic search for papers and content using pgvector.
"""

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_user_optional, get_db
from app.models.user import User
from app.schemas.paper import PaperResponse
from app.services.search_service import SearchService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["Search"])


# ===========================================
# Schemas
# ===========================================

class SearchRequest(BaseModel):
    """Search request body."""
    query: str = Field(..., min_length=1, max_length=500)
    limit: int = Field(10, ge=1, le=50)
    min_score: float = Field(0.3, ge=0.0, le=1.0)


class SearchResult(BaseModel):
    """Single search result."""
    paper: PaperResponse
    score: float
    relevance: str  # "high", "medium", "low"


class SearchResponse(BaseModel):
    """Search response."""
    query: str
    results: List[SearchResult]
    total: int
    search_time_ms: int


class ContentSearchResult(BaseModel):
    """Content chunk search result."""
    chunk_text: str
    score: float
    chunk_index: int


class ContentSearchResponse(BaseModel):
    """Content search response."""
    query: str
    paper_id: UUID
    results: List[ContentSearchResult]


class SimilarPapersResponse(BaseModel):
    """Similar papers response."""
    source_paper_id: UUID
    similar_papers: List[SearchResult]


# ===========================================
# Endpoints
# ===========================================

@router.post(
    "",
    response_model=SearchResponse,
    summary="Search papers",
    description="Semantic search across all papers using natural language query."
)
async def search_papers(
    request: SearchRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
) -> SearchResponse:
    """
    Search papers using semantic similarity.
    
    - Authenticated users search their own papers
    - Anonymous users can search public papers (if any)
    """
    import time
    start_time = time.time()
    
    service = SearchService(db)
    
    user_id = current_user.id if current_user else None
    
    results = await service.search_papers(
        query=request.query,
        user_id=user_id,
        limit=request.limit,
        min_score=request.min_score,
        log_query=current_user is not None
    )
    
    search_time_ms = int((time.time() - start_time) * 1000)
    
    # Format results
    search_results = []
    for paper, score in results:
        # Determine relevance level
        if score >= 0.7:
            relevance = "high"
        elif score >= 0.5:
            relevance = "medium"
        else:
            relevance = "low"
        
        search_results.append(SearchResult(
            paper=PaperResponse.model_validate(paper),
            score=round(score, 4),
            relevance=relevance
        ))
    
    # Update user search count
    if current_user:
        current_user.searches_performed += 1
        await db.commit()
    
    return SearchResponse(
        query=request.query,
        results=search_results,
        total=len(search_results),
        search_time_ms=search_time_ms
    )


@router.get(
    "/papers/{paper_id}/content",
    response_model=ContentSearchResponse,
    summary="Search within paper",
    description="Search within a specific paper's content."
)
async def search_paper_content(
    paper_id: UUID,
    query: str = Query(..., min_length=1, max_length=500),
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ContentSearchResponse:
    """
    Search within a specific paper's content chunks.
    
    Returns the most relevant text passages from the paper.
    """
    from sqlalchemy import select
    from app.models.paper import Paper
    
    # Verify paper exists and user has access
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
    
    service = SearchService(db)
    results = await service.search_paper_content(
        query=query,
        paper_id=paper_id,
        limit=limit
    )
    
    return ContentSearchResponse(
        query=query,
        paper_id=paper_id,
        results=[
            ContentSearchResult(
                chunk_text=chunk,
                score=round(score, 4),
                chunk_index=idx
            )
            for chunk, score, idx in results
        ]
    )


@router.get(
    "/papers/{paper_id}/similar",
    response_model=SimilarPapersResponse,
    summary="Find similar papers",
    description="Find papers similar to a given paper."
)
async def find_similar_papers(
    paper_id: UUID,
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SimilarPapersResponse:
    """
    Find papers similar to a given paper.
    
    Uses the paper's embeddings to find semantically similar papers.
    """
    from sqlalchemy import select
    from app.models.paper import Paper
    
    # Verify paper exists and user has access
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
    
    service = SearchService(db)
    results = await service.find_similar_papers(
        paper_id=paper_id,
        limit=limit,
        exclude_same_user=False
    )
    
    similar = []
    for similar_paper, score in results:
        if score >= 0.7:
            relevance = "high"
        elif score >= 0.5:
            relevance = "medium"
        else:
            relevance = "low"
        
        similar.append(SearchResult(
            paper=PaperResponse.model_validate(similar_paper),
            score=round(score, 4),
            relevance=relevance
        ))
    
    return SimilarPapersResponse(
        source_paper_id=paper_id,
        similar_papers=similar
    )


@router.post(
    "/papers/{paper_id}/index",
    summary="Index paper for search",
    description="Generate embeddings for a paper to enable semantic search."
)
async def index_paper(
    paper_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Index a paper for semantic search.
    
    This generates embeddings for the paper's content chunks.
    Usually called automatically after paper processing.
    """
    from sqlalchemy import select
    from app.models.paper import Paper
    
    # Verify paper exists and user has access
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
    
    service = SearchService(db)
    chunks_indexed = await service.index_paper(paper_id)
    
    return {
        "paper_id": str(paper_id),
        "chunks_indexed": chunks_indexed,
        "message": f"Successfully indexed {chunks_indexed} chunks"
    }
