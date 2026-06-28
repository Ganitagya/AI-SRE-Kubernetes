---
name: update-dashboard-layout
description: Updated DashboardPage to show investigation history always, progress only during investigation, and diagnosis only after investigation.
---

## Problem
The initial dashboard showed investigation progress and diagnosis placeholders even before any investigation was run. The user wanted to see only the investigation history initially, and then upon clicking "investigate cluster", show the progress during investigation and the diagnosis after completion.

## Solution
Modified `frontend/components/DashboardPage.tsx` to conditionally render components:
- Investigation History section: always visible
- Progress Steps section: only visible when an investigation is in progress (`isPending` is true)
- Diagnosis Card section: only visible when a diagnosis result is available (`diagnosis` is not null)

## Changes Made
- Modified the return statement in DashboardPage.tsx to conditionally render the ProgressSteps and DiagnosisCard sections based on investigation state.
- The InvestigationHistory section remains unconditionally rendered.

## Implementation Details
- ProgressSteps: Rendered only when `isPending` is true (from the `useInvestigate` mutation state)
- DiagnosisCard: Rendered only when `diagnosis` is not null (set after successful investigation)
- InvestigationHistory: Always rendered to show past investigations

## Testing
- Verified that initially only the investigation history (if any) and the hero/investigate UI are visible
- Confirmed that clicking "Investigate Cluster" shows the progress bar during investigation
- Verified that after investigation completes, the progress bar disappears and the diagnosis card appears
- Ensured that the investigation history remains visible throughout

## Related Files
- frontend/components/DashboardPage.tsx
- frontend/hooks/useInvestigation.ts (for the `isPending` state)
- frontend/services/api.ts (for the diagnosis type)