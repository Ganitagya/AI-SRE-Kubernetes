---
name: fix-investigation-progress-visibility
description: Fixed investigation progress to remain visible until all stages are complete, and show progress even after investigation finishes (with completed steps).
---

## Problem
The investigation progress bar would disappear immediately after an investigation finished because the DashboardPage only rendered the progress section while the mutation was pending (`isPending`). Additionally, if no realtime updates were received (e.g., missing investigation ID), the progress would stall at the first step.

## Solution
1. **Persist progress display**: Changed `DashboardPage.tsx` to show the progress section whenever an `investigationId` exists (i.e., an investigation has been started), not just while `isPending` is true. This ensures the progress bar remains visible after the investigation ends, showing all steps as completed.
2. **Initialize progress correctly**: Updated `useInvestigationProgress` hook to mark all steps as completed when `isPending` becomes false (investigation finished).
3. **Improve fallback logic**: Enhanced the fallback mechanism to detect whether any realtime update was received. If no realtime update occurs within 5 seconds, the hook simulates progress progression.
4. **Pass investigationId to hook**: Exposed `investigationId` from the `useInvestigate` hook and used it in the dashboard to gate progress visibility.

## Changes Made
- **frontend/components/DashboardPage.tsx**:
  * Added `investigationId` to the destructured return from `useInvestigate()`.
  * Changed progress section condition from `{isPending && (...)}` to `{investigationId != null && (...)})`.
  * Passed `isActive={!!investigationId}` to `ProgressSteps` to retain pulse logic while an investigation exists.
- **frontend/hooks/useInvestigation.ts**:
  * Modified the `!isPending` branch in the initialization effect to set all steps to `{ completed: true, status: 'completed' }`.
  * Added a `realtimeReceived` flag to track if any realtime update was received.
  * Updated the fallback timeout to simulate progress only when `!realtimeReceived` (i.e., no realtime updates).
  * Ensured the fallback simulates progression to completion if no realtime data arrives.
- **frontend/hooks/useInvestigation.ts** ( minor adjustments ):
  * Cleaned up duplicate `useEffect` dependencies.

## Testing
- Verified that after logging in, clicking "Investigate Cluster" shows the progress bar.
- The progress bar advances through each step (either via realtime updates or fallback simulation).
- After the investigation completes, the progress bar remains visible with all steps marked as completed.
- The diagnosis section appears after the investigation finishes (when diagnosis data is available).
- Investigation history remains visible at all times.

## Related Files
- frontend/components/DashboardPage.tsx
- frontend/hooks/useInvestigation.ts
- memory/fix-investigation-progress-visibility.md (this file)