from fastapi import APIRouter, Query
from models.schemas import InvestigationRequest, InvestigationResponse
from services.investigation import run_investigation_with_ai
from services.insforge_db import insforge_db

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
        request.user_id,
        request.context,
        request.deep_scan
    )
    return InvestigationResponse(
        status="success",
        investigation=investigation,
        diagnosis=diagnosis
    )


@router.get("/investigation-history")
async def get_investigation_history(user_id: str = Query(..., description="User ID"), limit: int = Query(50, description="Maximum number of records to return")):
    """
    Get investigation history for a user.

    Returns a list of investigations with basic information for display in UI.
    """
    investigations = await insforge_db.get_investigation_history(user_id=user_id, limit=limit)
    return {"status": "success", "data": investigations}


@router.get("/investigation-history/{investigation_id}")
async def get_investigation_details(investigation_id: str):
    """
    Get detailed information for a specific investigation.

    Includes both the investigation history and progress steps.
    """
    investigation = await insforge_db.get_investigation_by_id(investigation_id=investigation_id)
    if not investigation:
        return {"status": "error", "message": "Investigation not found"}

    progress = await insforge_db.get_investigation_progress(investigation_id=investigation_id)

    return {
        "status": "success",
        "data": {
            "investigation": investigation,
            "progress": progress
        }
    }