"""
API routes – all endpoint routers registered here.
"""

from fastapi import APIRouter
from .health import router as health_router
from .investigate import router as investigate_router

router = APIRouter()

router.include_router(health_router, tags=["Health"])
router.include_router(investigate_router, tags=["Investigate"])
