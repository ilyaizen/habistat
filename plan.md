# Habistat Convex Auth & Sync Fix Plan

## Notes
- User is experiencing Convex authentication errors ("Not authenticated") in the browser.
- Convex authentication and sync errors persist after endpoint implementation ("Not authenticated" errors in Convex mutations/queries).
- Note: Convex authentication flow now appears to be working after endpoint and JWT debugging.
- Convex sync/auth errors may persist in safe-query or related logic.
- Note: Auth state tracking and race conditions in convex.ts updated to improve sync reliability.
- App stack: SvelteKit, Convex backend, Clerk auth, offline-first with SQLite.
- TypeScript errors in sync.ts were fixed; now the main blocker is missing API routes for auth token handling.
- Existing local logic (safe-query.ts, auth-state.ts) depends on these endpoints.
- Convex client (convex.ts), auth state store (auth-state.ts), and safe query utilities (safe-query.ts) all require `/api/auth/token` and `/api/auth/check` endpoints to function.
- `/api/auth/token` endpoint exists, but may require review or fixes.
- `/api/auth/check` endpoint implemented; basic validation for Bearer tokens is in place.
- Convex backend (`auth.config.ts`) requires JWTs with `domain: process.env.CLERK_JWT_ISSUER_DOMAIN` and `applicationID: "convex"`.
- User confirmed `CLERK_JWT_ISSUER_DOMAIN` is set correctly in all environments.

## Task List
- [x] Analyze current auth flow and dependencies in codebase
- [x] Ensure `/api/auth/token` endpoint exists and review implementation
- [x] Implement `/api/auth/check` endpoint for token validation
- [x] Test authentication flow end-to-end
- [x] Verify Clerk JWT compatibility with Convex backend config
  - [x] Inspect JWT structure/claims (aud, iss) for Convex compatibility
- [x] Debug Convex authentication failures despite endpoints returning 200
- [x] Test Convex sync operations with working auth
- [x] Debug safe-query and sync auth errors if they persist
- [ ] Verify sync/auth layer is stable under real usage

## Current Goal
✅ RESTORED: Reverted all breaking changes, authentication system restored to working state

## Status
- ✅ Convex auth configuration restored to working state
- ✅ Token fetching and verification restored to original implementation
- ✅ Debug page removed (was causing routing issues)
- ✅ Development server runs on port 3001 (not 5173)

The system should now be back to the working state from before the debugging session.