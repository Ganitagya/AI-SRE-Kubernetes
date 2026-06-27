"""
InsForge Database Service – REST API client for investigation progress tracking.
Uses the PostgREST-compatible REST API directly with httpx.
"""

import httpx
import json
import logging
from datetime import datetime
from typing import Optional
from core.config import settings

logger = logging.getLogger(__name__)


class InsForgeDB:
    """Client for writing investigation progress to InsForge database."""
    
    def __init__(self):
        self.base_url = settings.INSFORGE_BASE_URL.rstrip('/')
        self.api_key = settings.INSFORGE_API_KEY
        self.headers = {
            'apikey': self.api_key,
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        }
    
    async def _request(self, method: str, path: str, json_data: dict = None) -> httpx.Response:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1{path}"
            response = await client.request(method, url, headers=self.headers, json=json_data)
            if response.status_code >= 400:
                logger.error(f"InsForge DB {method} {path} failed: {response.status_code} - {response.text}")
            response.raise_for_status()
            return response
    
    async def create_investigation_history(
        self,
        user_id: str,
        namespace: str,
        root_cause: str,
        explanation: str,
        fix: str,
        kubectl_command: str,
        prevention: str,
        confidence: int,
        severity: str,
        raw_diagnostics: dict
    ) -> Optional[str]:
        """Create investigation history record and return its ID."""
        try:
            data = {
                'user_id': user_id,
                'namespace': namespace,
                'root_cause': root_cause,
                'explanation': explanation,
                'fix': fix,
                'kubectl_command': kubectl_command,
                'prevention': prevention,
                'confidence': confidence,
                'severity': severity,
                'status': 'completed',
                'raw_diagnostics': raw_diagnostics,
            }
            response = await self._request('POST', '/investigation_history', data)
            result = response.json()
            if result and len(result) > 0:
                return result[0].get('id')
        except Exception as e:
            # Log but don't fail the investigation
            logger.error(f"Failed to create investigation history: {e}")
        return None
    
    async def create_progress(
        self,
        investigation_id: str,
        step: str,
        status: str = 'pending',
        message: str = '',
        payload: dict = None
    ) -> Optional[str]:
        """Create a progress record."""
        try:
            data = {
                'investigation_id': investigation_id,
                'step': step,
                'status': status,
                'message': message,
                'payload': payload,
                'started_at': datetime.utcnow().isoformat() + 'Z' if status == 'running' else None,
            }
            response = await self._request('POST', '/investigation_progress', data)
            result = response.json()
            if result and len(result) > 0:
                return result[0].get('id')
        except Exception as e:
            logger.error(f"Failed to create progress: {e}")
        return None
    
    async def update_progress(
        self,
        progress_id: str,
        status: str = None,
        message: str = None,
        payload: dict = None
    ) -> bool:
        """Update a progress record."""
        try:
            data = {}
            if status:
                data['status'] = status
            if message:
                data['message'] = message
            if payload:
                data['payload'] = payload
            if status == 'completed' or status == 'failed':
                data['completed_at'] = datetime.utcnow().isoformat() + 'Z'
            
            response = await self._request(
                'PATCH', 
                f'/investigation_progress?id=eq.{progress_id}',
                data
            )
            return response.status_code in (200, 204)
        except Exception as e:
            logger.error(f"Failed to update progress: {e}")
        return False
    
    async def run_step(
        self,
        investigation_id: str,
        step: str,
        message: str,
        step_fn,
        *args,
        **kwargs
    ):
        """Run a step with automatic progress tracking."""
        # Create running progress
        progress_id = await self.create_progress(
            investigation_id, step, 'running', message
        )
        
        try:
            # Execute the step
            result = await step_fn(*args, **kwargs)
            
            # Mark completed
            if progress_id:
                await self.update_progress(progress_id, 'completed', message, {'result': 'ok'})
            
            return result
        except Exception as e:
            # Mark failed
            if progress_id:
                await self.update_progress(progress_id, 'failed', str(e), {'error': str(e)})
            raise


# Global instance
insforge_db = InsForgeDB()