"""
PDF Processing Service

Extracts text, metadata, and sections from PDF research papers.
"""

import hashlib
import io
import logging
import re
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


class PDFProcessor:
    """
    PDF processing service for extracting content from research papers.
    
    Uses PyMuPDF (fitz) for PDF parsing - fast and reliable.
    """
    
    def __init__(self):
        self._fitz = None
    
    @property
    def fitz(self):
        """Lazy load PyMuPDF."""
        if self._fitz is None:
            try:
                import fitz
                self._fitz = fitz
            except ImportError:
                raise ImportError(
                    "PyMuPDF is required for PDF processing. "
                    "Install with: pip install pymupdf"
                )
        return self._fitz
    
    def compute_file_hash(self, file_content: bytes) -> str:
        """Compute SHA-256 hash of file content for deduplication."""
        return hashlib.sha256(file_content).hexdigest()
    
    def extract_text(self, file_content: bytes) -> Tuple[str, int, int]:
        """
        Extract full text from PDF.
        
        Args:
            file_content: PDF file bytes
            
        Returns:
            Tuple of (full_text, page_count, word_count)
        """
        try:
            doc = self.fitz.open(stream=file_content, filetype="pdf")
            
            full_text = []
            for page in doc:
                text = page.get_text()
                full_text.append(text)
            
            doc.close()
            
            combined_text = "\n\n".join(full_text)
            page_count = len(full_text)
            word_count = len(combined_text.split())
            
            return combined_text, page_count, word_count
            
        except Exception as e:
            logger.error(f"Failed to extract PDF text: {e}")
            raise ValueError(f"Failed to process PDF: {str(e)}")
    
    def extract_metadata(self, file_content: bytes) -> dict:
        """
        Extract metadata from PDF (title, authors, etc.).
        
        Args:
            file_content: PDF file bytes
            
        Returns:
            Dictionary with metadata fields
        """
        try:
            doc = self.fitz.open(stream=file_content, filetype="pdf")
            metadata = doc.metadata or {}
            doc.close()
            
            return {
                "title": metadata.get("title", "").strip() or None,
                "author": metadata.get("author", "").strip() or None,
                "subject": metadata.get("subject", "").strip() or None,
                "keywords": metadata.get("keywords", "").strip() or None,
                "creator": metadata.get("creator", "").strip() or None,
                "producer": metadata.get("producer", "").strip() or None,
                "creation_date": metadata.get("creationDate"),
                "mod_date": metadata.get("modDate"),
            }
            
        except Exception as e:
            logger.error(f"Failed to extract PDF metadata: {e}")
            return {}
    
    def extract_sections(self, full_text: str) -> dict:
        """
        Attempt to identify paper sections (Abstract, Introduction, etc.).
        
        Uses regex patterns to identify common academic paper sections.
        
        Args:
            full_text: Extracted text from PDF
            
        Returns:
            Dictionary mapping section names to their content
        """
        sections = {}
        
        # Common section patterns in academic papers
        section_patterns = [
            (r"(?i)^abstract[:\s]*$", "abstract"),
            (r"(?i)^1\.?\s*introduction", "introduction"),
            (r"(?i)^2\.?\s*(?:related\s+work|background)", "related_work"),
            (r"(?i)^3\.?\s*(?:method|methodology|approach)", "methodology"),
            (r"(?i)^\d+\.?\s*(?:experiment|results|evaluation)", "results"),
            (r"(?i)^\d+\.?\s*(?:discussion)", "discussion"),
            (r"(?i)^\d+\.?\s*(?:conclusion|conclusions)", "conclusion"),
            (r"(?i)^references?$", "references"),
        ]
        
        # Try to extract abstract (usually at the start)
        abstract_match = re.search(
            r"(?i)abstract[:\s]*\n(.+?)(?=\n\s*(?:1\.?\s*introduction|\n\n\n))",
            full_text,
            re.DOTALL
        )
        if abstract_match:
            sections["abstract"] = abstract_match.group(1).strip()
        
        return sections
    
    def extract_abstract(self, full_text: str) -> Optional[str]:
        """
        Extract just the abstract from paper text.
        
        Args:
            full_text: Full paper text
            
        Returns:
            Abstract text or None if not found
        """
        # Pattern 1: Explicit "Abstract" heading
        patterns = [
            r"(?i)abstract[:\s]*\n(.+?)(?=\n\s*(?:1\.?\s*introduction|keywords|index terms))",
            r"(?i)^abstract[:\s]*(.+?)(?=\n\n\n|\n\s*1\.)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, full_text, re.DOTALL | re.MULTILINE)
            if match:
                abstract = match.group(1).strip()
                # Limit abstract length
                if len(abstract) > 100 and len(abstract) < 3000:
                    return abstract
        
        # Fallback: First substantial paragraph
        paragraphs = [p.strip() for p in full_text.split("\n\n") if len(p.strip()) > 200]
        if paragraphs:
            return paragraphs[0][:2000]
        
        return None
    
    async def process_pdf(self, file_content: bytes) -> dict:
        """
        Full PDF processing pipeline.
        
        Args:
            file_content: PDF file bytes
            
        Returns:
            Dictionary with all extracted data
        """
        # Compute hash for deduplication
        file_hash = self.compute_file_hash(file_content)
        
        # Extract text
        full_text, page_count, word_count = self.extract_text(file_content)
        
        # Extract metadata
        metadata = self.extract_metadata(file_content)
        
        # Extract sections
        sections = self.extract_sections(full_text)
        
        # Extract abstract
        abstract = self.extract_abstract(full_text)
        
        # Parse authors from metadata
        authors = None
        if metadata.get("author"):
            # Split by common delimiters
            author_str = metadata["author"]
            if "," in author_str:
                authors = [a.strip() for a in author_str.split(",")]
            elif ";" in author_str:
                authors = [a.strip() for a in author_str.split(";")]
            elif " and " in author_str.lower():
                authors = [a.strip() for a in re.split(r"\s+and\s+", author_str, flags=re.IGNORECASE)]
            else:
                authors = [author_str.strip()]
        
        return {
            "file_hash": file_hash,
            "title": metadata.get("title"),
            "authors": authors,
            "abstract": abstract,
            "full_text": full_text,
            "sections": sections,
            "page_count": page_count,
            "word_count": word_count,
            "metadata": metadata,
        }


# Singleton instance
pdf_processor = PDFProcessor()
