"""
Pydantic models – shared data schemas.
"""

from pydantic import BaseModel, Field
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
    user_id: Optional[str] = None


class DiagnosisOutput(BaseModel):
    """Structured output from the AI reasoning layer."""
    root_cause: str = Field(description="Primary root cause of the issue")
    explanation: str = Field(description="Detailed explanation of the failure")
    fix: str = Field(description="Actionable fix recommendation")
    kubectl_command: str = Field(description="Specific kubectl command to apply the fix")
    prevention: str = Field(description="Prevention recommendation for future")
    confidence: int = Field(description="Confidence score 0-100", ge=0, le=100)
    severity: SeverityLevel = Field(description="Severity level of the issue")


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
    diagnosis: Optional[DiagnosisOutput] = None