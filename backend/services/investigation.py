"""
Services for orchestration.

This module coordinates the Kubernetes investigation layer and AI reasoning.
"""

import httpx
import json
import inspect
from typing import Any, Dict, List, Optional
from loguru import logger
from k8s_executor import inspector
from ai.agent import analyze_cluster
from models.schemas import InvestigationResult, DiagnosisOutput
from core.config import settings
from services.insforge_db import insforge_db


def run_investigation(namespace: str = "default", context: str = None) -> InvestigationResult:
    """
    Orchestrate a full cluster investigation by calling the inspector layer.

    Returns structured evidence containing pods, logs, events, deployments, and network data.
    """
    logger.info(f"Starting Kubernetes investigation for namespace: {namespace}" +
                (f" and context: {context}" if context else ""))

    # 1. Check Pods
    pods_data = inspector.inspect_pods(namespace, context)

    if "error" in pods_data:
        return pods_data

    items = pods_data.get("items", [])
    problematic_pods = []

    unhealthy_states = [
        "CrashLoopBackOff", "ImagePullBackOff", "Pending",
        "Error", "OOMKilled", "ErrImagePull"
    ]

    for pod in items:
        name = pod.get("metadata", {}).get("name", "unknown")
        status_phase = pod.get("status", {}).get("phase", "Unknown")

        # Check container statuses for granular reasons
        container_statuses = pod.get("status", {}).get("containerStatuses", [])
        pod_problem = None

        for cs in container_statuses:
            state = cs.get("state", {})
            waiting = state.get("waiting")
            terminated = state.get("terminated")

            if waiting and waiting.get("reason") in unhealthy_states:
                pod_problem = waiting.get("reason")
            elif terminated and terminated.get("reason") in unhealthy_states:
                pod_problem = terminated.get("reason")
            elif terminated and terminated.get("exitCode") != 0:
                pod_problem = f"ExitCode {terminated.get('exitCode')}"

        # If no specific container reason, check phase
        if not pod_problem and status_phase in ["Pending", "Failed", "Unknown"]:
            pod_problem = status_phase

        if pod_problem:
            problematic_pods.append({
                "name": name,
                "namespace": namespace,
                "status": pod_problem
            })

    return {
        "healthy": len(problematic_pods) == 0,
        "total_pods": len(items),
        "problematic_pods": problematic_pods
    }


def collect_logs(problematic_pods: list[dict], namespace: str = "default", context: str = None) -> dict[str, Any]:
    """Fetch recent logs for failed pods, capturing connection failures, etc."""
    logger.info(f"Collecting logs for {len(problematic_pods)} problematic pods in namespace {namespace}" + (f" and context {context}" if context else ""))
    logs = {}
    
    for pod in problematic_pods:
        pod_name = pod["name"]
        # Fetch last 50 lines to keep it concise
        response = inspector.run_kubectl_command(["logs", pod_name, "--tail=50"], namespace, context)
        
        if "error" in response:
            logs[pod_name] = f"Error fetching logs: {response['error']}"
        else:
            logs[pod_name] = response.get("output", "")
            
    return logs


def analyze_events(namespace: str = "default", context: str = None) -> dict[str, Any]:
    """Fetch recent Kubernetes events and filter for failures and warnings."""
    logger.info(f"Analyzing events in namespace {namespace}" + (f" and context {context}" if context else ""))
    response = inspector.run_kubectl_command(["get", "events", "-o", "json"], namespace, context)
    
    if "error" in response:
        return response

    items = response.get("items", [])
    relevant_events = []
    
    target_reasons = [
        "FailedScheduling", "BackOff", "FailedMount", 
        "FailedPull", "ErrImagePull", "Unhealthy"
    ]
    
    for event in items:
        reason = event.get("reason")
        event_type = event.get("type")
        
        if event_type == "Warning" or reason in target_reasons:
            relevant_events.append({
                "reason": reason,
                "message": event.get("message"),
                "object": event.get("involvedObject", {}).get("name"),
                "count": event.get("count", 1)
            })
            
    return {
        "anomalies_found": len(relevant_events) > 0,
        "recent_anomalies": relevant_events
    }


def inspect_deployments(namespace: str = "default", context: str = None) -> dict[str, Any]:
    """Inspect deployments and check for replica mismatches and rollout failures."""
    logger.info(f"Inspecting deployments in namespace {namespace}" + (f" and context {context}" if context else ""))
    response = inspector.run_kubectl_command(["get", "deployments", "-o", "json"], namespace, context)
    
    if "error" in response:
        return response

    items = response.get("items", [])
    unhealthy_deployments = []
    
    for dep in items:
        name = dep.get("metadata", {}).get("name", "unknown")
        status = dep.get("status", {})
        
        replicas = status.get("replicas", 0)
        ready_replicas = status.get("readyReplicas", 0)
        unavailable_replicas = status.get("unavailableReplicas", 0)
        
        if unavailable_replicas > 0 or ready_replicas < replicas:
            unhealthy_deployments.append({
                "name": name,
                "desired_replicas": replicas,
                "ready_replicas": ready_replicas,
                "unavailable_replicas": unavailable_replicas
            })
            
    return {
        "healthy": len(unhealthy_deployments) == 0,
        "total_deployments": len(items),
        "unhealthy_deployments": unhealthy_deployments
    }


def inspect_network(namespace: str = "default", context: str = None) -> dict[str, Any]:
    """Inspect services and endpoints for missing targets."""
    logger.info(f"Inspecting networking in namespace {namespace}" + (f" and context {context}" if context else ""))
    svc_response = inspector.run_kubectl_command(["get", "svc", "-o", "json"], namespace, context)
    ep_response = inspector.run_kubectl_command(["get", "endpoints", "-o", "json"], namespace, context)
    
    if "error" in svc_response:
        return svc_response
    if "error" in ep_response:
        return ep_response

    services = svc_response.get("items", [])
    endpoints = {ep.get("metadata", {}).get("name"): ep for ep in ep_response.get("items", [])}
    
    network_issues = []
    
    for svc in services:
        name = svc.get("metadata", {}).get("name")
        # Ignore external services or those without selectors
        if not svc.get("spec", {}).get("selector"):
            continue
            
        ep = endpoints.get(name, {})
        subsets = ep.get("subsets", [])
        
        if not subsets:
            network_issues.append({
                "service": name,
                "issue": "No ready endpoints (selector mismatch or pods failing)"
            })
            
    return {
        "healthy": len(network_issues) == 0,
        "total_services": len(services),
        "issues": network_issues
    }


async def run_investigation_with_ai(
    namespace: str = "default",
    user_id: str = None,
    context: str = None,
    deep_scan: bool = False
) -> tuple[InvestigationResult, DiagnosisOutput | None]:
    """
    Run full investigation and AI analysis with real-time progress tracking.
    
    Args:
        namespace: Kubernetes namespace to investigate
        user_id: Optional user ID for saving history
        context: Optional Kubernetes context to use
        
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
        
        # Store Kubernetes context in progress section (optional, but not a step in UI)
        # We can skip creating a progress step for context since it's not in STEP_ORDER.
        # If we want to store it for debugging, we could store it in the investigation record itself.
        pass

    async def progress_step(step: str, message: str, step_fn):
        """Run a step with progress tracking if investigation_id exists."""
        progress_id = None
        if investigation_id:
            progress_id = await insforge_db.create_progress(
                investigation_id, step, 'running', message
            )

        try:
            # Handle both sync and async functions
            if inspect.iscoroutinefunction(step_fn):
                result = await step_fn()
            else:
                result = step_fn()

            if investigation_id and progress_id:
                await insforge_db.update_progress(
                    progress_id, 'completed', message, {'result': 'ok'}
                )
            return result
        except Exception as e:
            if investigation_id and progress_id:
                await insforge_db.update_progress(
                    progress_id, 'failed', str(e), {'error': str(e)}
                )
            raise

    # 1. Check Pods
    pods_result = await progress_step('pods', 'Checking Pods',
        lambda: inspector.inspect_pods(namespace, context))
    pods_processed = pods_result["processed"]
    pods_raw = pods_result["raw"]
    problematic_pods = pods_processed.get("problematic_pods", [])

    # 2. Collect Conditionally Logs (based on deep_scan flag)
    logs_processed = {}
    logs_raw = {}
    # Get all pods list from pods_raw
    all_pods_list = [{"name": pod["metadata"]["name"]} for pod in pods_raw.get("items", [])]

    if deep_scan:
        logs_result = await progress_step('logs', 'Reading Logs (Deep Scan)',
            lambda: inspector.collect_logs(all_pods_list, namespace, context, tail=200))
        logs_processed = logs_result["processed"]
        logs_raw = logs_result["raw"]
    else:
        if problematic_pods:
            logs_result = await progress_step('logs', 'Reading Logs',
                lambda: inspector.collect_logs(problematic_pods, namespace, context, tail=100))
            logs_processed = logs_result["processed"]
            logs_raw = logs_result["raw"]
        else:
            if investigation_id:
                await insforge_db.create_progress(investigation_id, 'logs', 'completed', 'No problematic pods, skipping logs')
            logs_processed = {}
            logs_raw = {}

    # 3. Analyze Events
    events_result = await progress_step('events', 'Analyzing Events',
        lambda: inspector.analyze_events(namespace, context))
    events_processed = events_result["processed"]
    events_raw = events_result["raw"]

    # 4. Inspect Deployments
    deployments_result = await progress_step('deployments', 'Inspecting Deployments',
        lambda: inspector.inspect_deployments(namespace, context))
    deployments_processed = deployments_result["processed"]
    deployments_raw = deployments_result["raw"]

    # 5. Check Networking
    network_result = await progress_step('network', 'Checking Networking',
        lambda: inspector.inspect_network(namespace, context))
    network_processed = network_result["processed"]
    network_raw = network_result["raw"]

    investigation = InvestigationResult(
        id=investigation_id,
        pods=pods_processed,
        logs=logs_processed,
        events=events_processed,
        deployments=deployments_processed,
        network=network_processed,
        pods_raw=pods_raw,
        logs_raw=logs_raw,
        events_raw=events_raw,
        deployments_raw=deployments_raw,
        network_raw=network_raw
    )

    # 6. AI Reasoning (if user_id provided)
    diagnosis = None
    if user_id and investigation_id:
        ai_reasoning_id = await insforge_db.create_progress(
            investigation_id, 'ai_reasoning', 'running', 'Generating AI analysis'
        )
        try:
            diagnosis_dict = analyze_cluster(investigation.dict())
            diagnosis = DiagnosisOutput(**diagnosis_dict)
            logger.info(f"AI diagnosis complete: {diagnosis.root_cause} (confidence: {diagnosis.confidence}%)")

            # Update history with actual results
            await insforge_db.update_investigation_history(
                investigation_id, diagnosis, investigation.dict()
            )

            # Complete AI reasoning progress
            if ai_reasoning_id:
                await insforge_db.update_progress(
                    ai_reasoning_id, 'completed', 'Root Cause Found',
                    {'root_cause': diagnosis.root_cause}
                )
        except Exception as e:
            logger.error(f"AI analysis failed: {type(e).__name__}: {e}")
            if ai_reasoning_id:
                await insforge_db.update_progress(
                    ai_reasoning_id, 'failed', str(e), {'error': str(e)}
                )

    # 7. Complete
    if investigation_id:
        await insforge_db.create_progress(investigation_id, 'complete', 'completed', 'Investigation Complete')

    return investigation, diagnosis


