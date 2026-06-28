---
name: fix-insforge-api-path
description: Fixed InsForge API path in backend/services/insforge_db.py and removed duplicate methods
---

## Problem
The backend was receiving 404 errors when communicating with the InsForge API because it was using the wrong endpoint path (`/rest/v1/{table}` instead of `/api/database/records/{table}`). Additionally, duplicate method definitions were present in the insforge_db.py file.

## Solution
1. Changed the base path in `InsForgeDB._request` method from `/rest/v1` to `/api/database/records`.
2. Ensured only one copy of the getter methods (`get_investigation_history`, `get_investigation_by_id`, `get_investigation_progress`) exists by removing duplicates and placing them after the `run_step` method.
3. Verified that the investigation endpoint now works correctly and returns successful responses from InsForge.

## Changes Made
- Modified `backend/services/insforge_db.py`:
  * Line 31: Changed `url = f"{self.base_url}/rest/v1{path}"` to `url = f"{self.base_url}/api/database/records{path}"`
  * Removed duplicate getter method definitions and added a single correct set after the `run_step` method.

## Testing
- Confirmed that the `/investigate` endpoint returns 200 OK with no InsForge error logs.
- Verified that direct calls to the InsForge API endpoint `/api/database/records/investigation_history` succeed (returns empty array when no records exist).
- Ensured no regression in existing functionality.

## Related Files
- backend/services/insforge_db.py