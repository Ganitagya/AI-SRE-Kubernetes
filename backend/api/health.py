"""
Health check endpoint.
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    service: str


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Returns service health status."""
    return HealthResponse(
        status="healthy",
        service="ai-kubernetes-agent",
    )
