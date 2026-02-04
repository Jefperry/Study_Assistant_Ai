"""
AI Summarization Service

Hybrid summarization using:
- BART for extractive summarization (local)
- Groq LLM for generative summarization (API)
"""

import logging
from typing import Optional
from uuid import UUID

from groq import AsyncGroq
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.paper import Paper, PaperContent
from app.models.summary import Summary, SummaryType

logger = logging.getLogger(__name__)


class SummarizationService:
    """
    Hybrid AI summarization service.
    
    Combines extractive (BART) and generative (Groq) approaches
    for high-quality academic paper summaries.
    """
    
    def __init__(self):
        """Initialize the summarization service."""
        self.groq_client: Optional[AsyncGroq] = None
        self._bart_model = None
        self._bart_tokenizer = None
        
        # Initialize Groq client if API key is available
        if settings.GROQ_API_KEY:
            self.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    
    async def generate_summary(
        self,
        paper_id: UUID,
        summary_type: SummaryType,
        db: AsyncSession,
        user_id: Optional[UUID] = None
    ) -> Summary:
        """
        Generate a summary for a paper.
        
        Args:
            paper_id: The paper's UUID
            summary_type: Type of summary (brief, detailed, etc.)
            db: Database session
            user_id: Optional user ID for tracking
            
        Returns:
            Summary model instance
        """
        # Get paper and content
        result = await db.execute(
            select(Paper).where(Paper.id == paper_id)
        )
        paper = result.scalar_one_or_none()
        
        if not paper:
            raise ValueError(f"Paper not found: {paper_id}")
        
        # Get paper content
        result = await db.execute(
            select(PaperContent).where(PaperContent.paper_id == paper_id)
        )
        content = result.scalar_one_or_none()
        
        if not content or not content.full_text:
            raise ValueError(f"No content found for paper: {paper_id}")
        
        # Generate summary based on type
        if summary_type == SummaryType.EXTRACTIVE:
            summary_text = await self._generate_extractive_summary(content.full_text)
        else:
            summary_text = await self._generate_groq_summary(
                content.full_text,
                paper.title or "Research Paper",
                summary_type
            )
        
        # Create summary record
        summary = Summary(
            paper_id=paper_id,
            summary_type=summary_type.value,
            content=summary_text,
            model_used="groq-llama" if summary_type != SummaryType.EXTRACTIVE else "bart",
            status="completed",
        )
        
        db.add(summary)
        await db.commit()
        await db.refresh(summary)
        
        logger.info(f"Generated {summary_type.value} summary for paper {paper_id}")
        
        return summary
    
    async def _generate_extractive_summary(self, text: str, max_length: int = 500) -> str:
        """
        Generate extractive summary using BART.
        
        This extracts key sentences from the original text.
        """
        try:
            # Lazy load BART model
            if self._bart_model is None:
                from transformers import BartForConditionalGeneration, BartTokenizer
                
                logger.info("Loading BART model...")
                self._bart_tokenizer = BartTokenizer.from_pretrained(
                    "facebook/bart-large-cnn"
                )
                self._bart_model = BartForConditionalGeneration.from_pretrained(
                    "facebook/bart-large-cnn"
                )
                logger.info("BART model loaded successfully")
            
            # Truncate text to fit model context
            inputs = self._bart_tokenizer(
                text,
                max_length=1024,
                truncation=True,
                return_tensors="pt"
            )
            
            # Generate summary
            summary_ids = self._bart_model.generate(
                inputs["input_ids"],
                max_length=max_length,
                min_length=100,
                length_penalty=2.0,
                num_beams=4,
                early_stopping=True
            )
            
            summary = self._bart_tokenizer.decode(
                summary_ids[0],
                skip_special_tokens=True
            )
            
            return summary
            
        except Exception as e:
            logger.error(f"BART summarization failed: {e}")
            # Fallback to simple extraction
            return self._simple_extractive_summary(text, max_length)
    
    def _simple_extractive_summary(self, text: str, max_length: int = 500) -> str:
        """
        Simple fallback extractive summary.
        
        Extracts first sentences until max_length is reached.
        """
        sentences = text.replace('\n', ' ').split('. ')
        summary_sentences = []
        current_length = 0
        
        for sentence in sentences[:20]:  # Consider first 20 sentences
            if current_length + len(sentence) > max_length:
                break
            summary_sentences.append(sentence)
            current_length += len(sentence)
        
        return '. '.join(summary_sentences) + '.'
    
    async def _generate_groq_summary(
        self,
        text: str,
        title: str,
        summary_type: SummaryType
    ) -> str:
        """
        Generate summary using Groq LLM (Llama).
        
        Args:
            text: Full paper text
            title: Paper title
            summary_type: Type of summary to generate
        """
        if not self.groq_client:
            logger.warning("Groq client not initialized, using extractive fallback")
            return await self._generate_extractive_summary(text)
        
        # Build prompt based on summary type
        prompts = {
            SummaryType.BRIEF: f"""Summarize this research paper in 2-3 concise paragraphs.
Focus on: main objective, methodology, key findings, and conclusions.

Title: {title}

Paper text:
{text[:8000]}

Provide a clear, academic summary:""",

            SummaryType.DETAILED: f"""Provide a comprehensive summary of this research paper.
Include: background, objectives, methodology, results, discussion, and conclusions.
Use bullet points for key findings.

Title: {title}

Paper text:
{text[:12000]}

Detailed summary:""",

            SummaryType.KEY_POINTS: f"""Extract the key points from this research paper as a bullet-point list.
Include: main findings, methodology highlights, and practical implications.

Title: {title}

Paper text:
{text[:8000]}

Key points:""",

            SummaryType.ABSTRACT: f"""Write an academic abstract (150-250 words) for this research paper.
Follow standard abstract structure: background, methods, results, conclusions.

Title: {title}

Paper text:
{text[:6000]}

Abstract:""",
        }
        
        prompt = prompts.get(
            summary_type,
            prompts[SummaryType.BRIEF]
        )
        
        try:
            response = await self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert academic research assistant. Provide clear, accurate, and well-structured summaries of research papers."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=2000,
                temperature=0.3,
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            # Fallback to extractive
            return await self._generate_extractive_summary(text)
    
    async def generate_flashcards(
        self,
        paper_id: UUID,
        db: AsyncSession,
        count: int = 10
    ) -> list[dict]:
        """
        Generate flashcards from a paper using Groq.
        
        Args:
            paper_id: The paper's UUID
            db: Database session
            count: Number of flashcards to generate
            
        Returns:
            List of flashcard dicts with 'question' and 'answer'
        """
        # Get paper content
        result = await db.execute(
            select(PaperContent).where(PaperContent.paper_id == paper_id)
        )
        content = result.scalar_one_or_none()
        
        if not content or not content.full_text:
            raise ValueError(f"No content found for paper: {paper_id}")
        
        if not self.groq_client:
            logger.warning("Groq client not available for flashcards")
            return []
        
        prompt = f"""Generate {count} flashcards from this research paper for studying.
Each flashcard should have a clear question and concise answer.
Focus on key concepts, definitions, findings, and methodologies.

Paper text:
{content.full_text[:10000]}

Return as JSON array:
[{{"question": "...", "answer": "...", "difficulty": "easy|medium|hard"}}]

Flashcards:"""

        try:
            response = await self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an educational content creator. Generate high-quality study flashcards. Return valid JSON only."
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.5,
            )
            
            import json
            content_text = response.choices[0].message.content
            
            # Try to parse JSON from response
            try:
                # Find JSON array in response
                start = content_text.find('[')
                end = content_text.rfind(']') + 1
                if start >= 0 and end > start:
                    flashcards = json.loads(content_text[start:end])
                    return flashcards
            except json.JSONDecodeError:
                logger.warning("Failed to parse flashcards JSON")
                return []
                
        except Exception as e:
            logger.error(f"Flashcard generation failed: {e}")
            return []


# Singleton instance
summarization_service = SummarizationService()
