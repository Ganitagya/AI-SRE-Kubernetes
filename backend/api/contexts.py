"""
Kubernetes context management endpoints.
"""

from fastapi import APIRouter, HTTPException
from kubernetes import config, client
from k8s_executor.executor import get_kubeconfig
from typing import Dict, List, Any

router = APIRouter()

@router.get("/contexts")
async def get_kubernetes_contexts():
    """
    Get available Kubernetes contexts from kubeconfig.

    Returns:
        List of available contexts with current context marked
    """
    try:
        # Load kubeconfig
        contexts, active_context = config.list_kube_config_contexts()

        if not contexts:
            return {
                "contexts": [],
                "current_context": None
            }

        # Format the response
        context_list = []
        for context in contexts:
            context_list.append({
                "name": context["name"],
                "cluster": context["context"]["cluster"],
                "user": context["context"]["user"],
                "namespace": context["context"].get("namespace", "default"),
                "is_current": context["name"] == (active_context["name"] if active_context else None)
            })

        return {
            "contexts": context_list,
            "current_context": active_context["name"] if active_context else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load kubeconfig: {e}"
        )

@router.get("/current-context")
async def get_current_context():
    """
    Get the current Kubernetes context.

    Returns:
        Current context name or None if not configured
    """
    try:
        _, active_context = config.list_kube_config_contexts()
        return {
            "current_context": active_context["name"] if active_context else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get current context: {e}"
        )

@router.get("/namespaces")
async def get_namespaces(context: str = None):
    """
    Get a list of namespaces for a given Kubernetes context.
    If context is not provided, uses the current context.

    Returns:
        List of namespace names
    """
    try:
        # Get the kubeconfig path (patched for Docker if needed)
        kubeconfig_path = get_kubeconfig()
        if not kubeconfig_path:
            raise HTTPException(
                status_code=500,
                detail="Kubeconfig not found. Please ensure ~/.kube/config exists."
            )

        # Load kubeconfig from the specified file
        if context is not None:
            config.load_kube_config(config_file=kubeconfig_path, context=context)
        else:
            config.load_kube_config(config_file=kubeconfig_path)

        # Create API client and list namespaces
        api = client.CoreV1Api()
        ret = api.list_namespace()
        namespaces = [item.metadata.name for item in ret.items]
        return {"namespaces": namespaces}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get namespaces: {e}"
        )