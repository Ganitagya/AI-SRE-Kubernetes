from fastapi import APIRouter
from models.schemas import InvestigationRequest, InvestigationResponse
from services.investigation import run_investigation_with_ai

router = APIRouter()

@router.post("/investigate", response_model=InvestigationResponse)
async def investigate_cluster(request: InvestigationRequest):
    """
    Trigger a Kubernetes investigation with AI-powered root cause analysis.
    
    Collects pods, logs, events, deployments, and network data,
    then sends to AI agent for Senior SRE-level diagnosis.
    
    If user_id is provided, saves investigation to history with real-time progress.
    """
    investigation, diagnosis = await run_investigation_with_ai(
        request.namespace, 
        request.user_id
    )
    return InvestigationResponse(
        status="success",
        investigation=investigation,
        diagnosis=diagnosis
    )