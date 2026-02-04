"""
FastAPI Application Entry Point

Main application factory with CORS, routers, and lifecycle management.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

# ─────────────────────────────────────────────────────────────
# Logging Configuration (stdout for Render)
# ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Application Lifespan (Startup/Shutdown)
# ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles application startup and shutdown events.
    
    Startup: Log configuration, verify connections.
    Shutdown: Clean up resources.
    """
    # Startup
    logger.info(f"Starting {settings.APP_NAME} in {settings.ENVIRONMENT} mode")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"CORS origins: {settings.cors_origins_list}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")


# ─────────────────────────────────────────────────────────────
# FastAPI Application Instance
# ─────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered research paper analysis and summarization platform",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ─────────────────────────────────────────────────────────────
# CORS Middleware
# ─────────────────────────────────────────────────────────────
# Note: When allow_credentials=True, you cannot use "*" for origins.
# We need to either specify exact origins or handle "*" specially.
cors_origins = settings.cors_origins_list

# If wildcard is requested, allow all origins but disable credentials
if cors_origins == ["*"]:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# ─────────────────────────────────────────────────────────────
# Health Check Endpoint
# ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for Render/load balancers."""
    return {"status": "healthy", "app": settings.APP_NAME}


@app.get("/api/v1/health", tags=["Health"])
async def api_health_check():
    """Versioned API health check."""
    return {
        "status": "healthy",
        "version": "v1",
        "environment": settings.ENVIRONMENT,
    }


# ─────────────────────────────────────────────────────────────
# API Routers
# ─────────────────────────────────────────────────────────────
from app.api.auth import router as auth_router
from app.api.papers import router as papers_router
from app.api.summaries import router as summaries_router
from app.api.search import router as search_router

app.include_router(auth_router, prefix="/api/v1")
app.include_router(papers_router, prefix="/api/v1")
app.include_router(summaries_router, prefix="/api/v1")
app.include_router(search_router, prefix="/api/v1")
