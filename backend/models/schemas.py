"""
Pydantic models – shared data schemas.
"""

from pydantic import BaseModel
from typing import Optional
from enum import Enum


class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class InvestigationRequest(BaseModel):
    """Request body for triggering a cluster investigation."""
    namespace: str = "default"
    include_logs: bool = False


class DiagnosisResult(BaseModel):
    """Structured output from the AI reasoning layer."""
    root_cause: Optional[str] = None
    suggested_fix: Optional[str] = None
    severity: Optional[SeverityLevel] = None
    confidence: Optional[float] = None
    raw_diagnostics: Optional[dict] = None


class InvestigationResult(BaseModel):
    """Structured output from the Kubernetes investigation layer."""
    pods: dict = {}
    logs: dict = {}
    events: dict = {}
    deployments: dict = {}
    network: dict = {}


class InvestigationResponse(BaseModel):
    """API response for investigation requests."""
    status: str
    investigation: InvestigationResult

