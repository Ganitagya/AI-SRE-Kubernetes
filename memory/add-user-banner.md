---
name: add-user-banner
description: Added a banner at the top of DashboardPage showing user email and logout button.
---

## Problem
The dashboard lacked a visible indication of the currently logged-in user and a way to log out. Users needed a persistent banner showing their account details and a logout option.

## Solution
Added a user banner component at the top of the DashboardPage that:
- Shows the logged-in user's email
- Provides a logout button that signs the user out via the Auth context and redirects to the home page
- Only appears when a user is authenticated (uses the `user` object from `useAuth`)

## Changes Made
- Modified `frontend/components/DashboardPage.tsx`:
  * Imported `useRouter` from `next/navigation` for redirection after logout
  * Destructured `signOut` from `useAuth()`
  * Added `handleLogout` async function that calls `signOut()` then `router.push('/')`
  * Inserted a conditional banner at the top of the component that renders when `user` is truthy
  * Banner displays user email and a logout button with appropriate styling

## Implementation Details
- Banner appears as a flex container with justified content: email on left, logout button on right
- Styled with `bg-slate-800/50` for subtle visibility over background
- Uses same text size and color scheme as existing UI components
- Logout button uses red color scheme for visual distinction
- After logout, user is redirected to the root path (`/`), which will show the login page due to auth checks in `HomePage`

## Related Files
- frontend/components/DashboardPage.tsx
- frontend/context/AuthProvider.tsx (provides `signOut` function)
- frontend/app/(auth)/login/page.tsx (login page where user lands after logout)

## Testing
- Verified that when a user is logged in, the banner appears with correct email
- Verified that clicking logout signs the user out and redirects to login page
- Verified that banner disappears when not authenticated
- Verified that existing dashboard functionality (investigate, progress, diagnosis, history) remains unaffected