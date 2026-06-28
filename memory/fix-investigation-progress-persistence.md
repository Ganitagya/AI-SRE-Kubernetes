---
name: fix-investigation-progress-persistence
description: Fixed investigation progress UI to show completed steps after investigation ends instead of resetting to pending.
---

## Problem
The investigation progress bar would disappear or reset to pending state immediately after an investigation finished, because the `useInvestigationProgress` hook's effect reset all steps to 'pending' when `isPending` became false.

## Solution
Modified the `useEffect` in `frontend/hooks/useInvestigation.ts` to set all steps to 'completed' when the investigation finishes (`!isPending`) instead of resetting to pending. This ensures the progress bar shows the completed state after an investigation ends.

## Changes Made
- Updated `frontend/hooks/useInvestigation.ts`:
  * Changed the `!isPending` branch in the effect to map progress to `{ ...p, completed: true, status: 'completed' }`.
  * Kept the initialization logic for when `isPending` becomes true (first step running, others pending).

## Testing
- Verified that after clicking "Investigate Cluster", the progress bar advances through each step.
- After investigation completes (whether quickly or after simulated delay), the progress bar remains visible with all steps marked as completed.
- The investigation history and diagnosis sections continue to work as expected.

## Related Files
- frontend/hooks/useInvestigation.ts
- memory/fix-investigation-progress-persistence.md (this file)