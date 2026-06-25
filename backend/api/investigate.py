from fastapi import APIRouter
from models.schemas import InvestigationRequest, InvestigationResponse
from services.investigation import run_investigation

router = APIRouter()

@router.post("/investigate", response_model=InvestigationResponse)
def investigate_cluster(request: InvestigationRequest):
    """
    Trigger a Kubernetes investigation.
    Collects pods, logs, events, deployments, and network data without AI reasoning.
    """
    result = run_investigation(request.namespace)
    return InvestigationResponse(
        status="success",
        investigation=result
    )
