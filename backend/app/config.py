"""
Application Configuration Module

Centralizes all environment variables and settings using Pydantic BaseSettings.
Supports .env file loading with type validation and sensible defaults.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # 
    # App
    # 
    APP_NAME: str = "Research Assistant AI"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # 
    # Database (Supabase PostgreSQL)
    # 
    DATABASE_URL: str
    DB_ECHO: bool = False

    # 
    # Redis (Upstash)
    # 
    REDIS_URL: str

    # 
    # RabbitMQ (CloudAMQP)
    # 
    RABBITMQ_URL: str

    # 
    # JWT Authentication
    # 
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # 
    # AI Services (Groq)
    # Note: Don't set GROQ_BASE_URL with /openai/v1 - the SDK appends it automatically
    GROQ_API_KEY: str
    GROQ_BASE_URL: str = "https://api.groq.com"  # SDK appends /openai/v1 automatically
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # 
    # File Upload
    # 
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB
    UPLOAD_DIR: str = "./uploads"
    ALLOWED_EXTENSIONS: str = "pdf"

    # 
    # CORS
    # 
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,https://study-assistant-ai.vercel.app"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into a list."""
        origins = [origin.strip().rstrip('/') for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        # If "*" is specified, return it as a list for the middleware
        if "*" in origins:
            return ["*"]
        return origins

    # 
    # Pydantic v2 Configuration
    # 
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings loader.
    
    Uses lru_cache to ensure settings are only loaded once per process,
    improving performance and ensuring consistency.
    """
    return Settings()


# Global settings instance for easy import
settings = get_settings()
