"""
Kubernetes investigation layer.

This module uses kubectl internally to fetch evidence from the cluster,
such as pod status, logs, events, deployments, and network configurations.
"""

from .executor import run_kubectl_command
from loguru import logger
from typing import Any


def inspect_pods(namespace: str = "default") -> dict[str, Any]:
    """Inspect all pods and identify unhealthy ones."""
    logger.info(f"Inspecting pods in namespace {namespace}")
    response = run_kubectl_command(["get", "pods", "-o", "json"], namespace)
    
    if "error" in response:
        return response

    items = response.get("items", [])
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


def collect_logs(problematic_pods: list[dict], namespace: str = "default") -> dict[str, Any]:
    """Fetch recent logs for failed pods, capturing connection failures, etc."""
    logger.info(f"Collecting logs for {len(problematic_pods)} problematic pods")
    logs = {}
    
    for pod in problematic_pods:
        pod_name = pod["name"]
        # Fetch last 50 lines to keep it concise
        response = run_kubectl_command(["logs", pod_name, "--tail=50"], namespace)
        
        if "error" in response:
            logs[pod_name] = f"Error fetching logs: {response['error']}"
        else:
            logs[pod_name] = response.get("output", "")
            
    return logs


def analyze_events(namespace: str = "default") -> dict[str, Any]:
    """Fetch recent Kubernetes events and filter for failures and warnings."""
    logger.info(f"Analyzing events in namespace {namespace}")
    response = run_kubectl_command(["get", "events", "-o", "json"], namespace)
    
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


def inspect_deployments(namespace: str = "default") -> dict[str, Any]:
    """Inspect deployments and check for replica mismatches and rollout failures."""
    logger.info(f"Inspecting deployments in namespace {namespace}")
    response = run_kubectl_command(["get", "deployments", "-o", "json"], namespace)
    
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


def inspect_network(namespace: str = "default") -> dict[str, Any]:
    """Inspect services and endpoints for missing targets."""
    logger.info(f"Inspecting networking in namespace {namespace}")
    svc_response = run_kubectl_command(["get", "svc", "-o", "json"], namespace)
    ep_response = run_kubectl_command(["get", "endpoints", "-o", "json"], namespace)
    
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
