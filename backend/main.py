"""
AI Kubernetes Troubleshooting Agent - FastAPI Backend
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import sys

from core.config import settings
from api.health import router as health_router
from api.investigate import router as investigate_router

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO",
)

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AI Kubernetes Agent",
    description="On-demand AI-powered Kubernetes troubleshooting service",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(health_router, prefix="", tags=["Health"])
app.include_router(investigate_router, prefix="", tags=["Investigate"])


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    logger.info("AI Kubernetes Agent backend starting up...")
    logger.info(f"OpenRouter model: {settings.OPENROUTER_MODEL}")
    logger.info(f"Kubeconfig path: {settings.KUBECONFIG_PATH}")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("AI Kubernetes Agent backend shutting down...")