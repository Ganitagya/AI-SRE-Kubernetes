import subprocess
import json
import os
from pathlib import Path
from loguru import logger
from typing import Optional, Any


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


def run_kubectl_command(args: list[str], namespace: Optional[str] = None) -> dict[str, Any]:
    """
    Executes a kubectl command securely via subprocess and returns the parsed output.
    
    If '-o json' is part of the command, parses and returns the JSON structure.
    Otherwise, returns a dict with raw 'output'.
    """
    cmd = ["kubectl"]
    kubeconfig = get_kubeconfig()
    if kubeconfig:
        cmd.extend(["--kubeconfig", kubeconfig])
        
    if namespace:
        cmd.extend(["-n", namespace])
    cmd.extend(args)

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
