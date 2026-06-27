"""
Services for orchestration.

This module coordinates the Kubernetes investigation layer and AI reasoning.
"""

import httpx
import json
from loguru import logger
from kubernetes import inspector
from ai.agent import analyze_cluster
from models.schemas import InvestigationResult, DiagnosisOutput
from core.config import settings
from services.insforge_db import insforge_db


def run_investigation(namespace: str = "default") -> InvestigationResult:
    """
    Orchestrate a full cluster investigation by calling the inspector layer.
    
    Returns structured evidence containing pods, logs, events, deployments, and network data.
    """
    logger.info(f"Starting Kubernetes investigation for namespace: {namespace}")
    
    # 1. Check Pods
    pods_data = inspector.inspect_pods(namespace)
    
    # 2. Collect Logs (only for problematic pods)
    logs_data = {}
    problematic_pods = pods_data.get("problematic_pods", [])
    if problematic_pods:
        logs_data = inspector.collect_logs(problematic_pods, namespace)
        
    # 3. Analyze Events
    events_data = inspector.analyze_events(namespace)
    
    # 4. Inspect Deployments
    deployments_data = inspector.inspect_deployments(namespace)
    
    # 5. Check Networking
    network_data = inspector.inspect_network(namespace)
    
    logger.info("Investigation completed successfully.")
    
    return InvestigationResult(
        pods=pods_data,
        logs=logs_data,
        events=events_data,
        deployments=deployments_data,
        network=network_data
    )


async def run_investigation_with_ai(
    namespace: str = "default",
    user_id: str = None
) -> tuple[InvestigationResult, DiagnosisOutput | None]:
    """
    Run full investigation and AI analysis with real-time progress tracking.
    
    Args:
        namespace: Kubernetes namespace to investigate
        user_id: Optional user ID for saving history
    
    Returns:
        tuple of (InvestigationResult, DiagnosisOutput or None if AI fails)
    """
    investigation_id = None
    
    # If user_id provided, create history record
    if user_id:
        investigation_id = await insforge_db.create_investigation_history(
            user_id=user_id,
            namespace=namespace,
            root_cause="In progress...",
            explanation="Investigation running",
            fix="",
            kubectl_command="",
            prevention="",
            confidence=0,
            severity="low",
            raw_diagnostics={}
        )
        logger.info(f"Created investigation history: {investigation_id}")
    
    async def progress_step(step: str, message: str, step_fn):
        """Run a step with progress tracking if investigation_id exists."""
        if investigation_id:
            await insforge_db.create_progress(investigation_id, step, 'running', message)
        
        try:
            # Handle both sync and async functions
            import inspect
            if inspect.iscoroutinefunction(step_fn):
                result = await step_fn()
            else:
                result = step_fn()
            if investigation_id:
                await insforge_db.update_progress(
                    investigation_id, step, 'completed', message, {'result': 'ok'}
                )
            return result
        except Exception as e:
            if investigation_id:
                await insforge_db.update_progress(
                    investigation_id, step, 'failed', str(e), {'error': str(e)}
                )
            raise
    
    # 1. Check Pods
    pods_data = await progress_step('pods', 'Checking Pods', 
        lambda: inspector.inspect_pods(namespace))
    
    # 2. Collect Logs (only for problematic pods)
    logs_data = {}
    problematic_pods = pods_data.get("problematic_pods", [])
    if problematic_pods:
        logs_data = await progress_step('logs', 'Reading Logs',
            lambda: inspector.collect_logs(problematic_pods, namespace))
    else:
        if investigation_id:
            await insforge_db.create_progress(investigation_id, 'logs', 'completed', 'No problematic pods, skipping logs')
    
    # 3. Analyze Events
    events_data = await progress_step('events', 'Analyzing Events',
        lambda: inspector.analyze_events(namespace))
    
    # 4. Inspect Deployments
    deployments_data = await progress_step('deployments', 'Inspecting Deployments',
        lambda: inspector.inspect_deployments(namespace))
    
    # 5. Check Networking
    network_data = await progress_step('network', 'Checking Networking',
        lambda: inspector.inspect_network(namespace))
    
    investigation = InvestigationResult(
        pods=pods_data,
        logs=logs_data,
        events=events_data,
        deployments=deployments_data,
        network=network_data
    )
    
    logger.info("Investigation completed successfully.")
    
    # Convert to dict for AI agent
    diagnostics = {
        "pods": investigation.pods,
        "logs": investigation.logs,
        "events": investigation.events,
        "deployments": investigation.deployments,
        "network": investigation.network
    }
    
    # 6. AI Reasoning
    if investigation_id:
        await insforge_db.create_progress(investigation_id, 'ai_reasoning', 'running', 'AI Reasoning')
    
    diagnosis = None
    try:
        logger.info("Starting AI analysis of investigation results")
        diagnosis_dict = await analyze_cluster(diagnostics)
        diagnosis = DiagnosisOutput(**diagnosis_dict)
        logger.info(f"AI diagnosis complete: {diagnosis.root_cause} (confidence: {diagnosis.confidence}%)")
        
        # Update history with actual results
        if investigation_id and user_id:
            await update_investigation_history(
                investigation_id, diagnosis, diagnostics
            )
        
        if investigation_id:
            await insforge_db.update_progress(
                investigation_id, 'ai_reasoning', 'completed', 'Root Cause Found', 
                {'root_cause': diagnosis.root_cause}
            )
    except Exception as e:
        logger.error(f"AI analysis failed: {type(e).__name__}: {e}")
        if investigation_id:
            await insforge_db.update_progress(
                investigation_id, 'ai_reasoning', 'failed', str(e), {'error': str(e)}
            )
    
    # 7. Complete
    if investigation_id:
        await insforge_db.create_progress(investigation_id, 'complete', 'completed', 'Investigation Complete')
    
    return investigation, diagnosis


async def update_investigation_history(
    investigation_id: str,
    diagnosis: DiagnosisOutput,
    raw_diagnostics: dict
):
    """Update investigation history with final diagnosis."""
    try:
        url = f"{settings.INSFORGE_BASE_URL}/rest/v1/investigation_history"
        headers = {
            'apikey': settings.INSFORGE_API_KEY,
            'Authorization': f'Bearer {settings.INSFORGE_API_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
        }
        data = {
            'root_cause': diagnosis.root_cause,
            'explanation': diagnosis.explanation,
            'fix': diagnosis.fix,
            'kubectl_command': diagnosis.kubectl_command,
            'prevention': diagnosis.prevention,
            'confidence': diagnosis.confidence,
            'severity': diagnosis.severity,
            'status': 'completed',
            'raw_diagnostics': raw_diagnostics,
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.patch(
                f"{url}?id=eq.{investigation_id}",
                headers=headers,
                json=data
            )
            response.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to update investigation history: {e}")