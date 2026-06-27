import subprocess
import json
import os
from pathlib import Path
from loguru import logger
from typing import Optional, Any
import yaml


def get_kubeconfig() -> Optional[str]:
    """
    Returns the path to the kubeconfig. If running in Docker, automatically
    patches localhost/127.0.0.1 to host.docker.internal so it can reach the host's clusters.
    """
    original = Path("/root/.kube/config")
    patched = Path("/tmp/patched_kubeconfig")
    
    if not original.exists():
        return None
        
    if os.environ.get("RUNNING_IN_DOCKER") == "true":
        try:
            with open(original, "r") as f:
                content = f.read()
                
            if "localhost" in content or "127.0.0.1" in content:
                content = content.replace("localhost", "host.docker.internal")
                content = content.replace("127.0.0.1", "host.docker.internal")
                
                with open(patched, "w") as f:
                    f.write(content)
                return str(patched)
        except Exception as e:
            logger.warning(f"Could not patch kubeconfig: {e}")
            
    return str(original)


def get_kubeconfig_contexts() -> dict[str, Any]:
    """
    Parse kubeconfig and return available clusters, contexts, and users.
    Returns a dict with clusters, contexts, current_context, and users.
    """
    kubeconfig_path = get_kubeconfig()
    if not kubeconfig_path:
        return {"error": "Kubeconfig not found. Please ensure ~/.kube/config exists."}
    
    try:
        with open(kubeconfig_path, "r") as f:
            config = yaml.safe_load(f)
        
        if not config:
            return {"error": "Kubeconfig is empty or invalid."}
        
        clusters = []
        for cluster in config.get("clusters", []):
            clusters.append({
                "name": cluster.get("name"),
                "server": cluster.get("cluster", {}).get("server"),
            })
        
        contexts = []
        for context in config.get("contexts", []):
            ctx = context.get("context", {})
            contexts.append({
                "name": context.get("name"),
                "cluster": ctx.get("cluster"),
                "user": ctx.get("user"),
                "namespace": ctx.get("namespace"),
            })
        
        users = []
        for user in config.get("users", []):
            users.append({
                "name": user.get("name"),
                "has_client_cert": bool(user.get("user", {}).get("client-certificate-data")),
                "has_client_key": bool(user.get("user", {}).get("client-key-data")),
                "has_token": bool(user.get("user", {}).get("token")),
            })
        
        return {
            "clusters": clusters,
            "contexts": contexts,
            "current_context": config.get("current-context"),
            "users": users,
        }
    except Exception as e:
        logger.error(f"Failed to parse kubeconfig: {e}")
        return {"error": f"Failed to parse kubeconfig: {str(e)}"}


def run_kubectl_command(args: list[str], namespace: Optional[str] = None, context: Optional[str] = None) -> dict[str, Any]:
    """
    Executes a kubectl command securely via subprocess and returns the parsed output.
    
    If '-o json' is part of the command, parses and returns the JSON structure.
    Otherwise, returns a dict with raw 'output'.
    Handles common error cases: missing kubeconfig, cluster unreachable, auth failures.
    """
    cmd = ["kubectl"]
    kubeconfig = get_kubeconfig()
    if not kubeconfig:
        return {"error": "Kubeconfig not found. Please ensure ~/.kube/config exists and is accessible."}
    
    cmd.extend(["--kubeconfig", kubeconfig])
    
    if context:
        cmd.extend(["--context", context])
    elif namespace:
        cmd.extend(["-n", namespace])
    cmd.extend(args)

    logger.debug(f"Executing kubectl command: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False,
            timeout=60  # 60 second timeout for kubectl commands
        )
    except subprocess.TimeoutExpired:
        logger.error(f"kubectl command timed out: {' '.join(cmd)}")
        return {"error": f"Command timed out after 60 seconds: {' '.join(cmd)}"}
    except FileNotFoundError:
        logger.error("kubectl not found in PATH")
        return {"error": "kubectl not found. Please ensure kubectl is installed and in PATH."}
    except Exception as e:
        logger.error(f"Failed to execute kubectl command '{' '.join(cmd)}': {str(e)}")
        return {"error": f"Execution failed: {str(e)}"}

    if result.returncode != 0:
        stderr = result.stderr.strip()
        # Provide user-friendly error messages for common failures
        if "connection refused" in stderr.lower():
            return {"error": "Cannot connect to Kubernetes cluster. Please verify cluster is running and accessible."}
        elif "unauthorized" in stderr.lower() or "forbidden" in stderr.lower():
            return {"error": "Authentication failed. Please check your kubeconfig credentials and permissions."}
        elif "no such host" in stderr.lower() or "dial tcp" in stderr.lower():
            return {"error": "Cannot reach cluster API server. Check network connectivity and cluster status."}
        elif "context" in stderr.lower() and "not found" in stderr.lower():
            return {"error": f"Kubernetes context not found. Available contexts can be listed via /clusters endpoint."}
        else:
            logger.warning(f"kubectl command returned non-zero exit status {result.returncode}. Stderr: {stderr}")
            return {"error": stderr or f"Command failed with exit code {result.returncode}"}

    stdout = result.stdout.strip()
    
    # If the command expects JSON output, parse it
    if "-o json" in " ".join(cmd) or "-o=json" in " ".join(cmd):
        try:
            return json.loads(stdout) if stdout else {}
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse kubectl JSON output: {str(e)}")
            return {"error": f"Failed to parse JSON output: {str(e)}", "raw_output": stdout}

    return {"output": stdout}

    logger.debug(f"Executing kubectl command: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False  # We want to handle non-zero exit codes gracefully
        )
    except Exception as e:
        logger.error(f"Failed to execute kubectl command '{' '.join(cmd)}': {str(e)}")
        return {"error": f"Execution failed: {str(e)}"}

    if result.returncode != 0:
        logger.warning(f"kubectl command returned non-zero exit status {result.returncode}. Stderr: {result.stderr.strip()}")
        return {"error": result.stderr.strip() or f"Command failed with exit code {result.returncode}"}

    stdout = result.stdout.strip()
    
    # If the command expects JSON output, parse it
    if "-o json" in " ".join(cmd) or "-o=json" in " ".join(cmd):
        try:
            return json.loads(stdout) if stdout else {}
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse kubectl JSON output: {str(e)}")
            return {"error": f"Failed to parse JSON output: {str(e)}", "raw_output": stdout}

    return {"output": stdout}
