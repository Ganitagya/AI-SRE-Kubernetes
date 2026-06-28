"""
Kubernetes investigation layer.

This module uses kubectl internally to fetch evidence from the cluster,
such as pod status, logs, events, deployments, and network configurations.
"""

from .executor import run_kubectl_command
from loguru import logger
from typing import Any


def inspect_pods(namespace: str = "default", context: str = None) -> dict[str, Any]:
    """Inspect all pods and identify unhealthy ones."""
    logger.info(f"Inspecting pods in namespace {namespace}" +
                (f" and context {context}" if context else ""))
    response = run_kubectl_command(["get", "pods", "-o", "json"], namespace, context)

    if "error" in response:
        return {"processed": response, "raw": response}

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

    processed = {
        "healthy": len(problematic_pods) == 0,
        "total_pods": len(items),
        "problematic_pods": problematic_pods
    }

    return {"processed": processed, "raw": response}


def collect_logs(problematic_pods: list[dict], namespace: str = "default", context: str = None, tail: int = 50) -> dict[str, Any]:
    """Fetch recent logs for failed pods, capturing connection failures, etc."""
    logger.info(f"Collecting logs for {len(problematic_pods)} problematic pods in namespace {namespace}" + (f" and context {context}" if context else ""))
    logs_processed = {}
    logs_raw = {}

    for pod in problematic_pods:
        pod_name = pod["name"]
        # Fetch last `tail` lines to keep it concise
        response = run_kubectl_command(["logs", pod_name, f"--tail={tail}"], namespace, context)

        if "error" in response:
            logs_processed[pod_name] = f"Error fetching logs: {response['error']}"
        else:
            logs_processed[pod_name] = response.get("output", "")
        logs_raw[pod_name] = response

    return {"processed": logs_processed, "raw": logs_raw}


def analyze_events(namespace: str = "default", context: str = None) -> dict[str, Any]:
    """Fetch recent Kubernetes events and filter for failures and warnings."""
    logger.info(f"Analyzing events in namespace {namespace}" + (f" and context {context}" if context else ""))
    response = run_kubectl_command(["get", "events", "-o", "json"], namespace, context)

    if "error" in response:
        return {"processed": response, "raw": response}

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

    processed = {
        "anomalies_found": len(relevant_events) > 0,
        "recent_anomalies": relevant_events
    }

    return {"processed": processed, "raw": response}


def inspect_deployments(namespace: str = "default", context: str = None) -> dict[str, Any]:
    """Inspect deployments and check for replica mismatches and rollout failures."""
    logger.info(f"Inspecting deployments in namespace {namespace}" + (f" and context {context}" if context else ""))
    response = run_kubectl_command(["get", "deployments", "-o", "json"], namespace, context)

    if "error" in response:
        return {"processed": response, "raw": response}

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

    processed = {
        "healthy": len(unhealthy_deployments) == 0,
        "total_deployments": len(items),
        "unhealthy_deployments": unhealthy_deployments
    }

    return {"processed": processed, "raw": response}


def inspect_network(namespace: str = "default", context: str = None) -> dict[str, Any]:
    """Inspect services and endpoints for missing targets."""
    logger.info(f"Inspecting networking in namespace {namespace}" + (f" and context {context}" if context else ""))
    svc_response = run_kubectl_command(["get", "svc", "-o", "json"], namespace, context)
    ep_response = run_kubectl_command(["get", "endpoints", "-o", "json"], namespace, context)

    if "error" in svc_response:
        return {"processed": svc_response, "raw": svc_response}
    if "error" in ep_response:
        return {"processed": ep_response, "raw": ep_response}

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

    processed = {
        "healthy": len(network_issues) == 0,
        "total_services": len(services),
        "issues": network_issues
    }

    return {"processed": processed, "raw": {"svc_response": svc_response, "ep_response": ep_response}}
