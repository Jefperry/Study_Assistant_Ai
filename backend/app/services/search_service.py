"""
Search Service

Semantic search using pgvector for finding similar papers and content.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.paper import Paper, PaperContent
from app.models.embedding import PaperEmbedding, SearchQuery
from app.services.embedding_service import generate_embedding

logger = logging.getLogger(__name__)


class SearchService:
    """Service for semantic search operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def search_papers(
        self,
        query: str,
        user_id: Optional[UUID] = None,
        limit: int = 10,
        min_score: float = 0.3,
        log_query: bool = True
    ) -> List[Tuple[Paper, float]]:
        """
        Search papers using semantic similarity.
        
        Args:
            query: The search query text
            user_id: Optional user ID to filter papers
            limit: Maximum number of results
            min_score: Minimum similarity score (0-1)
            log_query: Whether to log the search query
            
        Returns:
            List of (Paper, similarity_score) tuples
        """
        import time
        start_time = time.time()
        
        # Generate embedding for query
        query_embedding = generate_embedding(query)
        
        # Build the search query using pgvector's cosine distance
        # Note: pgvector uses <=> for cosine distance (1 - similarity)
        # So we use 1 - distance to get similarity
        
        if user_id:
            # Search only user's papers
            sql = text("""
                SELECT 
                    pe.paper_id,
                    1 - (pe.embedding <=> :query_embedding::vector) as similarity
                FROM paper_embeddings pe
                JOIN papers p ON pe.paper_id = p.id
                WHERE p.user_id = :user_id
                    AND 1 - (pe.embedding <=> :query_embedding::vector) >= :min_score
                ORDER BY pe.embedding <=> :query_embedding::vector
                LIMIT :limit
            """)
            result = await self.db.execute(
                sql,
                {
                    "query_embedding": str(query_embedding),
                    "user_id": str(user_id),
                    "min_score": min_score,
                    "limit": limit * 2  # Get more to dedupe
                }
            )
        else:
            # Search all papers
            sql = text("""
                SELECT 
                    pe.paper_id,
                    1 - (pe.embedding <=> :query_embedding::vector) as similarity
                FROM paper_embeddings pe
                WHERE 1 - (pe.embedding <=> :query_embedding::vector) >= :min_score
                ORDER BY pe.embedding <=> :query_embedding::vector
                LIMIT :limit
            """)
            result = await self.db.execute(
                sql,
                {
                    "query_embedding": str(query_embedding),
                    "min_score": min_score,
                    "limit": limit * 2
                }
            )
        
        rows = result.fetchall()
        
        # Deduplicate by paper_id (keep highest score per paper)
        paper_scores = {}
        for paper_id, score in rows:
            if paper_id not in paper_scores or score > paper_scores[paper_id]:
                paper_scores[paper_id] = score
        
        # Sort by score and limit
        sorted_papers = sorted(
            paper_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )[:limit]
        
        # Fetch full paper objects
        results = []
        for paper_id, score in sorted_papers:
            paper_result = await self.db.execute(
                select(Paper).where(Paper.id == paper_id)
            )
            paper = paper_result.scalar_one_or_none()
            if paper:
                results.append((paper, float(score)))
        
        # Calculate search time
        search_time_ms = int((time.time() - start_time) * 1000)
        
        # Log the search query
        if log_query and user_id:
            top_paper_id = results[0][0].id if results else None
            top_score = results[0][1] if results else None
            
            search_log = SearchQuery(
                user_id=user_id,
                query_text=query,
                query_embedding=query_embedding,
                result_count=len(results),
                top_result_paper_id=top_paper_id,
                top_result_score=top_score,
                search_time_ms=search_time_ms,
                cache_hit=False
            )
            self.db.add(search_log)
            await self.db.commit()
        
        logger.info(
            f"Search completed: query='{query[:50]}...' "
            f"results={len(results)} time={search_time_ms}ms"
        )
        
        return results
    
    async def search_paper_content(
        self,
        query: str,
        paper_id: UUID,
        limit: int = 5
    ) -> List[Tuple[str, float, int]]:
        """
        Search within a specific paper's content chunks.
        
        Args:
            query: The search query text
            paper_id: The paper ID to search within
            limit: Maximum number of chunk results
            
        Returns:
            List of (chunk_text, similarity_score, chunk_index) tuples
        """
        query_embedding = generate_embedding(query)
        
        sql = text("""
            SELECT 
                pe.chunk_text,
                1 - (pe.embedding <=> :query_embedding::vector) as similarity,
                pe.chunk_index
            FROM paper_embeddings pe
            WHERE pe.paper_id = :paper_id
            ORDER BY pe.embedding <=> :query_embedding::vector
            LIMIT :limit
        """)
        
        result = await self.db.execute(
            sql,
            {
                "query_embedding": str(query_embedding),
                "paper_id": str(paper_id),
                "limit": limit
            }
        )
        
        rows = result.fetchall()
        
        return [(row[0], float(row[1]), row[2]) for row in rows]
    
    async def find_similar_papers(
        self,
        paper_id: UUID,
        limit: int = 5,
        exclude_same_user: bool = False
    ) -> List[Tuple[Paper, float]]:
        """
        Find papers similar to a given paper.
        
        Args:
            paper_id: The source paper ID
            limit: Maximum number of similar papers
            exclude_same_user: Whether to exclude papers from the same user
            
        Returns:
            List of (Paper, similarity_score) tuples
        """
        # Get the source paper's embeddings (average them)
        source_result = await self.db.execute(
            select(PaperEmbedding).where(PaperEmbedding.paper_id == paper_id)
        )
        source_embeddings = source_result.scalars().all()
        
        if not source_embeddings:
            return []
        
        # Average the embeddings
        import numpy as np
        avg_embedding = np.mean(
            [e.embedding for e in source_embeddings],
            axis=0
        ).tolist()
        
        # Get the source paper for user filtering
        source_paper_result = await self.db.execute(
            select(Paper).where(Paper.id == paper_id)
        )
        source_paper = source_paper_result.scalar_one_or_none()
        
        if not source_paper:
            return []
        
        # Find similar papers
        if exclude_same_user:
            sql = text("""
                SELECT 
                    pe.paper_id,
                    1 - (pe.embedding <=> :query_embedding::vector) as similarity
                FROM paper_embeddings pe
                JOIN papers p ON pe.paper_id = p.id
                WHERE pe.paper_id != :paper_id
                    AND p.user_id != :user_id
                ORDER BY pe.embedding <=> :query_embedding::vector
                LIMIT :limit
            """)
            result = await self.db.execute(
                sql,
                {
                    "query_embedding": str(avg_embedding),
                    "paper_id": str(paper_id),
                    "user_id": str(source_paper.user_id),
                    "limit": limit * 2
                }
            )
        else:
            sql = text("""
                SELECT 
                    pe.paper_id,
                    1 - (pe.embedding <=> :query_embedding::vector) as similarity
                FROM paper_embeddings pe
                WHERE pe.paper_id != :paper_id
                ORDER BY pe.embedding <=> :query_embedding::vector
                LIMIT :limit
            """)
            result = await self.db.execute(
                sql,
                {
                    "query_embedding": str(avg_embedding),
                    "paper_id": str(paper_id),
                    "limit": limit * 2
                }
            )
        
        rows = result.fetchall()
        
        # Deduplicate
        paper_scores = {}
        for pid, score in rows:
            if pid not in paper_scores or score > paper_scores[pid]:
                paper_scores[pid] = score
        
        sorted_papers = sorted(
            paper_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )[:limit]
        
        # Fetch papers
        results = []
        for pid, score in sorted_papers:
            paper_result = await self.db.execute(
                select(Paper).where(Paper.id == pid)
            )
            paper = paper_result.scalar_one_or_none()
            if paper:
                results.append((paper, float(score)))
        
        return results
    
    async def index_paper(
        self,
        paper_id: UUID,
        chunk_size: int = 500,
        overlap: int = 50
    ) -> int:
        """
        Index a paper's content for semantic search.
        
        Args:
            paper_id: The paper ID to index
            chunk_size: Words per chunk
            overlap: Overlapping words between chunks
            
        Returns:
            Number of chunks indexed
        """
        from app.services.embedding_service import chunk_text, generate_embeddings_batch
        
        # Get paper content
        content_result = await self.db.execute(
            select(PaperContent).where(PaperContent.paper_id == paper_id)
        )
        content = content_result.scalar_one_or_none()
        
        if not content or not content.full_text:
            logger.warning(f"No content found for paper {paper_id}")
            return 0
        
        # Delete existing embeddings
        await self.db.execute(
            text("DELETE FROM paper_embeddings WHERE paper_id = :paper_id"),
            {"paper_id": str(paper_id)}
        )
        
        # Chunk the text
        chunks = chunk_text(content.full_text, chunk_size, overlap)
        
        if not chunks:
            return 0
        
        # Generate embeddings
        embeddings = generate_embeddings_batch(chunks)
        
        # Store embeddings
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            paper_embedding = PaperEmbedding(
                paper_id=paper_id,
                chunk_index=i,
                chunk_text=chunk[:2000],  # Limit stored text
                embedding=embedding
            )
            self.db.add(paper_embedding)
        
        await self.db.commit()
        
        logger.info(f"Indexed {len(chunks)} chunks for paper {paper_id}")
        
        return len(chunks)
