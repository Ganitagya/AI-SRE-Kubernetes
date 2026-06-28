"""
API routes – all endpoint routers registered here.
"""

from fastapi import APIRouter
from .health import router as health_router
from .investigate import router as investigate_router
from .contexts import router as contexts_router

router = APIRouter()

router.include_router(health_router, prefix="", tags=["Health"])
router.include_router(investigate_router, prefix="", tags=["Investigate"])
router.include_router(contexts_router, prefix="", tags=["Contexts"])
