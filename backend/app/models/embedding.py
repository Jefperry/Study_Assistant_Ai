"""
Embedding Model

Handles vector embeddings for semantic search using pgvector.
"""

import uuid
from typing import TYPE_CHECKING, Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.paper import Paper


# Default embedding dimension (all-MiniLM-L6-v2 produces 384-dim vectors)
EMBEDDING_DIMENSION = 384


class PaperEmbedding(BaseModel):
    """
    Vector embedding for paper text chunks.
    
    Enables semantic similarity search across all papers using pgvector.
    Papers are chunked into ~500 token segments with overlap for better
    retrieval accuracy.
    
    Attributes:
        paper_id: Associated paper.
        chunk_index: Position of this chunk in the paper.
        chunk_text: The actual text content of this chunk.
        embedding: 384-dimensional vector from SentenceTransformer.
        section: Which section this chunk belongs to (if detected).
        token_count: Approximate number of tokens in the chunk.
    """
    
    __tablename__ = "paper_embeddings"
    
    # Reference to Paper
    paper_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("papers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Chunk Information
    chunk_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    chunk_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    
    # Vector Embedding (384 dimensions for all-MiniLM-L6-v2)
    embedding: Mapped[list[float]] = mapped_column(
        Vector(EMBEDDING_DIMENSION),
        nullable=False,
    )
    
    # Metadata
    section: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    token_count: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    char_start: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    char_end: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    
    # Model Information
    model_name: Mapped[str] = mapped_column(
        String(100),
        default="all-MiniLM-L6-v2",
        nullable=False,
    )
    
    # Relationship
    paper: Mapped["Paper"] = relationship(
        "Paper",
        back_populates="embeddings",
    )
    
    # Indexes
    # Note: IVFFlat index will be created via Alembic migration
    __table_args__ = (
        Index("ix_embeddings_paper_chunk", "paper_id", "chunk_index"),
    )
    
    def __repr__(self) -> str:
        return f"<PaperEmbedding(paper_id={self.paper_id}, chunk={self.chunk_index})>"


class SearchQuery(BaseModel):
    """
    Logged search queries for analytics and caching.
    
    Stores user searches to improve search quality and enable
    result caching.
    """
    
    __tablename__ = "search_queries"
    
    # User who made the query (optional for anonymous searches)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    # Query Information
    query_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    query_embedding: Mapped[Optional[list[float]]] = mapped_column(
        Vector(EMBEDDING_DIMENSION),
        nullable=True,
    )
    
    # Results
    result_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    top_result_paper_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    top_result_score: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    
    # Performance
    search_time_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    cache_hit: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
    )
    
    def __repr__(self) -> str:
        return f"<SearchQuery(id={self.id}, query={self.query_text[:30]}...)>"
