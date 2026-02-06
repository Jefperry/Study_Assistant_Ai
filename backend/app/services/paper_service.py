"""
Paper Service

Business logic for paper management, upload, and processing.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.paper import Paper, PaperContent, PaperSource, ProcessingStatus
from app.models.job import ProcessingJob
from app.services.pdf_processor import pdf_processor

logger = logging.getLogger(__name__)


class PaperService:
    """Service for paper management operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_paper_by_id(
        self,
        paper_id: UUID,
        user_id: UUID
    ) -> Optional[Paper]:
        """Get a paper by ID for a specific user."""
        result = await self.db.execute(
            select(Paper).where(
                Paper.id == paper_id,
                Paper.user_id == user_id
            )
        )
        return result.scalar_one_or_none()
    
    async def get_user_papers(
        self,
        user_id: UUID,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None
    ) -> tuple[List[Paper], int]:
        """
        Get paginated list of papers for a user.
        
        Returns:
            Tuple of (papers list, total count)
        """
        query = select(Paper).where(Paper.user_id == user_id)
        
        if status:
            query = query.where(Paper.status == status)
        
        # Get total count
        count_query = select(func.count()).select_from(
            query.subquery()
        )
        total = (await self.db.execute(count_query)).scalar() or 0
        
        # Get paginated results
        query = query.order_by(Paper.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        
        result = await self.db.execute(query)
        papers = list(result.scalars().all())
        
        return papers, total
    
    async def check_duplicate(
        self,
        user_id: UUID,
        file_hash: str
    ) -> Optional[Paper]:
        """Check if user already uploaded a paper with same content."""
        result = await self.db.execute(
            select(Paper).where(
                Paper.user_id == user_id,
                Paper.file_hash == file_hash
            )
        )
        return result.scalar_one_or_none()
    
    async def check_usage_limit(self, user_id: UUID) -> bool:
        """Check if user is within their upload limit."""
        from app.models.user import User
        
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return False
        
        # Using daily_upload_count instead of papers_uploaded
        # Free tier: 5/day, Verified: 20/day, Premium: unlimited
        limits = {"free": 5, "verified": 20, "premium": 1000}
        limit = limits.get(user.tier, 5)
        return user.daily_upload_count < limit
    
    async def check_upload_limit(self, user) -> tuple[bool, str]:
        """
        Check if user can upload based on daily limit.
        
        Returns:
            Tuple of (can_upload: bool, message: str)
        """
        from datetime import datetime, timezone
        
        # Reset daily count if needed
        now = datetime.now(timezone.utc)
        if user.daily_upload_reset_at is None or user.daily_upload_reset_at.date() < now.date():
            user.daily_upload_count = 0
            user.daily_upload_reset_at = now
        
        # Check limits by tier
        limits = {"free": 5, "verified": 20, "premium": 1000}
        limit = limits.get(user.tier, 5)
        
        if user.daily_upload_count >= limit:
            return False, f"Daily upload limit reached ({limit}/day). Upgrade your plan for more."
        
        return True, "OK"
    
    async def create_paper_from_upload(
        self,
        user_id: UUID,
        file_content: bytes,
        filename: str,
        title: Optional[str] = None,
        authors: Optional[List[str]] = None,
        tags: Optional[List[str]] = None
    ) -> tuple[Paper, ProcessingJob]:
        """
        Create a paper from uploaded PDF file.
        
        Returns:
            Tuple of (Paper, ProcessingJob)
        """
        # Process PDF
        pdf_data = await pdf_processor.process_pdf(file_content)
        
        # Check for duplicates
        existing = await self.check_duplicate(user_id, pdf_data["file_hash"])
        if existing:
            raise ValueError(f"This paper has already been uploaded (ID: {existing.id})")
        
        # Create paper record
        paper = Paper(
            user_id=user_id,
            title=title or pdf_data.get("title") or filename,
            authors=authors or pdf_data.get("authors"),
            abstract=pdf_data.get("abstract"),
            source=PaperSource.UPLOAD.value,
            file_hash=pdf_data["file_hash"],
            status=ProcessingStatus.EXTRACTING.value,
            page_count=pdf_data.get("page_count"),
            word_count=pdf_data.get("word_count"),
            tags=tags,
        )
        
        self.db.add(paper)
        await self.db.flush()  # Get paper ID
        
        # Create paper content
        content = PaperContent(
            paper_id=paper.id,
            full_text=pdf_data.get("full_text"),
            sections=pdf_data.get("sections"),
        )
        
        self.db.add(content)
        
        # Create processing job
        job = ProcessingJob(
            paper_id=paper.id,
            user_id=user_id,
            job_type="full_processing",
            status=ProcessingStatus.PENDING.value,
            progress=0,
        )
        
        self.db.add(job)
        
        # Update user daily upload count
        from app.models.user import User
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one()
        user.daily_upload_count += 1
        
        await self.db.commit()
        await self.db.refresh(paper)
        await self.db.refresh(job)
        
        logger.info(f"Paper created: {paper.id} for user {user_id}")
        
        return paper, job
    
    async def create_paper_from_arxiv(
        self,
        user_id: UUID,
        file_content: bytes,
        arxiv_id: str,
        title: str,
        authors: Optional[List[str]] = None,
        abstract: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> tuple[Paper, ProcessingJob]:
        """
        Create a paper from ArXiv import.
        
        Returns:
            Tuple of (Paper, ProcessingJob)
        """
        # Process PDF
        pdf_data = await pdf_processor.process_pdf(file_content)
        
        # Check for duplicates by arxiv_id or file hash
        existing = await self.check_duplicate(user_id, pdf_data["file_hash"])
        if existing:
            raise ValueError(f"This paper has already been uploaded (ID: {existing.id})")
        
        # Also check by arxiv_id
        from sqlalchemy import select
        result = await self.db.execute(
            select(Paper).where(
                Paper.user_id == user_id,
                Paper.arxiv_id == arxiv_id
            )
        )
        existing_arxiv = result.scalar_one_or_none()
        if existing_arxiv:
            raise ValueError(f"This ArXiv paper has already been imported (ID: {existing_arxiv.id})")
        
        # Create paper record
        paper = Paper(
            user_id=user_id,
            title=title,
            authors=authors or pdf_data.get("authors"),
            abstract=abstract or pdf_data.get("abstract"),
            arxiv_id=arxiv_id,
            source=PaperSource.ARXIV.value,
            file_hash=pdf_data["file_hash"],
            status=ProcessingStatus.EXTRACTING.value,
            page_count=pdf_data.get("page_count"),
            word_count=pdf_data.get("word_count"),
            tags=tags,
        )
        
        self.db.add(paper)
        await self.db.flush()  # Get paper ID
        
        # Create paper content
        content = PaperContent(
            paper_id=paper.id,
            full_text=pdf_data.get("full_text"),
            sections=pdf_data.get("sections"),
        )
        
        self.db.add(content)
        
        # Create processing job
        job = ProcessingJob(
            paper_id=paper.id,
            user_id=user_id,
            job_type="full_processing",
            status=ProcessingStatus.PENDING.value,
            progress=0,
        )
        
        self.db.add(job)
        
        # Update user daily upload count
        from app.models.user import User
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one()
        user.daily_upload_count += 1
        
        await self.db.commit()
        await self.db.refresh(paper)
        await self.db.refresh(job)
        
        logger.info(f"ArXiv paper created: {paper.id} ({arxiv_id}) for user {user_id}")
        
        return paper, job
    
    async def update_paper_status(
        self,
        paper_id: UUID,
        status: ProcessingStatus,
        error_message: Optional[str] = None
    ) -> Optional[Paper]:
        """Update paper processing status."""
        result = await self.db.execute(
            select(Paper).where(Paper.id == paper_id)
        )
        paper = result.scalar_one_or_none()
        
        if paper:
            paper.status = status.value
            if error_message:
                paper.error_message = error_message
            if status == ProcessingStatus.COMPLETED:
                paper.processed_at = datetime.now(timezone.utc)
            
            await self.db.commit()
            await self.db.refresh(paper)
        
        return paper
    
    async def delete_paper(
        self,
        paper_id: UUID,
        user_id: UUID
    ) -> bool:
        """Delete a paper and all related data."""
        paper = await self.get_paper_by_id(paper_id, user_id)
        
        if not paper:
            return False
        
        # Delete paper (cascade will handle related records)
        await self.db.delete(paper)
        
        # Update user usage
        from app.models.user import User
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one()
        user.papers_uploaded = max(0, user.papers_uploaded - 1)
        
        await self.db.commit()
        
        logger.info(f"Paper deleted: {paper_id}")
        
        return True
    
    async def get_paper_content(
        self,
        paper_id: UUID,
        user_id: UUID
    ) -> Optional[PaperContent]:
        """Get the content of a paper."""
        # First verify user owns the paper
        paper = await self.get_paper_by_id(paper_id, user_id)
        if not paper:
            return None
        
        result = await self.db.execute(
            select(PaperContent).where(PaperContent.paper_id == paper_id)
        )
        return result.scalar_one_or_none()
