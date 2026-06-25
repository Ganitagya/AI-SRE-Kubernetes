"""
Services for orchestration.

This module coordinates the Kubernetes investigation layer.
"""

from loguru import logger
from kubernetes import inspector
from models.schemas import InvestigationResult


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
