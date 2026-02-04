"""
Embedding Service

Generates embeddings for text chunks using SentenceTransformers.
Used for semantic search with pgvector.
"""

import logging
from typing import List, Optional

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

# Lazy load the model to avoid startup delays
_model = None


def get_embedding_model():
    """
    Lazy load the SentenceTransformer model.
    
    Uses all-MiniLM-L6-v2 which produces 384-dimensional embeddings.
    This model is fast and produces good quality embeddings for semantic search.
    """
    global _model
    
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            
            logger.info("Loading embedding model: all-MiniLM-L6-v2")
            _model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("Embedding model loaded successfully")
        except ImportError:
            logger.error("sentence-transformers not installed")
            raise ImportError(
                "sentence-transformers is required for embeddings. "
                "Install with: pip install sentence-transformers"
            )
    
    return _model


def generate_embedding(text: str) -> List[float]:
    """
    Generate embedding for a single text.
    
    Args:
        text: The text to embed
        
    Returns:
        384-dimensional embedding as list of floats
    """
    if not text or not text.strip():
        # Return zero vector for empty text
        return [0.0] * 384
    
    model = get_embedding_model()
    
    # Truncate very long texts (model has 256 token limit)
    if len(text) > 8000:
        text = text[:8000]
    
    embedding = model.encode(text, convert_to_numpy=True)
    
    # Ensure it's a flat list of floats
    if isinstance(embedding, np.ndarray):
        embedding = embedding.tolist()
    
    return embedding


def generate_embeddings_batch(texts: List[str], batch_size: int = 32) -> List[List[float]]:
    """
    Generate embeddings for multiple texts efficiently.
    
    Args:
        texts: List of texts to embed
        batch_size: Number of texts to process at once
        
    Returns:
        List of 384-dimensional embeddings
    """
    if not texts:
        return []
    
    model = get_embedding_model()
    
    # Truncate and clean texts
    cleaned_texts = []
    for text in texts:
        if not text or not text.strip():
            cleaned_texts.append("")
        elif len(text) > 8000:
            cleaned_texts.append(text[:8000])
        else:
            cleaned_texts.append(text)
    
    # Generate embeddings in batches
    embeddings = model.encode(
        cleaned_texts,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True
    )
    
    # Convert to list of lists
    return embeddings.tolist()


def chunk_text(
    text: str,
    chunk_size: int = 500,
    overlap: int = 50
) -> List[str]:
    """
    Split text into overlapping chunks for embedding.
    
    Args:
        text: The text to chunk
        chunk_size: Target size of each chunk in words
        overlap: Number of overlapping words between chunks
        
    Returns:
        List of text chunks
    """
    if not text:
        return []
    
    words = text.split()
    
    if len(words) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        
        if end >= len(words):
            break
            
        start = end - overlap
    
    return chunks


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Calculate cosine similarity between two vectors.
    
    Args:
        vec1: First vector
        vec2: Second vector
        
    Returns:
        Cosine similarity score (0-1)
    """
    a = np.array(vec1)
    b = np.array(vec2)
    
    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
    
    return float(dot_product / (norm_a * norm_b))
