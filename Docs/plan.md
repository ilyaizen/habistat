# Plan

Current plan is: Finish Phase 3.7 of the implementation plan at `@Docs/implementation-plan.md`, and read PRP `@Docs/PRPs/phase3.7-sync-schema-simplification.md`.

# Recent Changes

## Color System
- Simplified to calendar color names; render via Tailwind v4 OKLCH 500 shades using `colorNameToCss`.
- Deprecated hex usage; `OKLCH_500` mapping added in `src/lib/utils/colors.ts`.
- `src/lib/constants/colors.ts` re-exports utils; temporary alias `colorNameToHex -> colorNameToCss`.

## Dev Workflow Preferences
- Uses `bun`; user runs their own dev server (`bun dev`). Do not auto-run dev server.

## Sync: Initial Overwrite Bug
- Problem: On first sign-in, local DB not overwritten by server due to LWW check.
- Fix needed: Add “initial sync” flag to always overwrite on first sign-in.
- Files: `src/lib/stores/calendars.ts`, `src/lib/stores/habits.ts`, `src/lib/services/sync-unified.ts`.

## Sync: Duplicate Triggers Fixed
- Cause: Two sign-in sync triggers racing.
- Fix: Improved auth check in `fullSync()` and removed duplicate trigger in `sync-consolidated.ts`.
- Status: Error resolved; verify overwrite behavior when Convex has data.

## Sync: Pull + Mapping Fixes and Stability
- Fixed unsubscribe race conditions in `sync-consolidated.ts`.
- Restored `getHabitByConvexId()` via `localUuid` mapping in `local-data.ts`.
- Added detailed logging in `sync-unified.ts`; pull syncs now report success across data types.

## Convex Schema: Activity History Migration
- Deployment failed due to missing `openedAt` in old records.
- Fix: `openedAt` optional; added optional `firstOpenAt` for compatibility in `src/convex/schema.ts`.
- Migration: `migrateActivityHistoryFields` in `src/convex/activityHistory.ts`; script `scripts/migrate-activity-history.mjs`.

## Schema Simplification
- Removed redundant `convexId`; rely on `localUuid`.
- Unified integer timestamps; streamlined `completions` and consolidated activity tracking.
- Documented schema; maintained LWW via `clientUpdatedAt`.

## Activity Tracking Model Adjustments
- Issue: `firstOpenAt` should be global, not per-day.
- Proposal: Move `firstAppOpenAt` to user profile; keep minimal daily `activityHistory`.
- Maintain sync with reduced complexity.

## DB Migration/Setup Fixes
- Fixed “no such table: userProfile” by enhancing migration scripts.
- Added scripts: `db:studio`, `db:reset`, `db:setup`; improved error handling and verification.

## Browser/Prod Schema Consistency
- Fixed mismatch: `production-init.sql` now uses `openedAt` (line 76).
- Verified consistency across `schema.ts`, migrations, and `production-init.sql`.

## Activity History Sync Mapping Fixed
- Mapped `openedAt` consistently in `sync-unified.ts` for both push and pull.
- Resolved Convex `ArgumentValidationError` for missing `openedAt`.

## Habit Calendar Reassignment UX
- Added calendar selector and cross-calendar drag detection with long-hover intent (800ms).
- Confirmation dialog via ShadCN; smart redirect after reassignment.
- Updated `dashboard-calendars.svelte` and related handlers.

## Phase 3.5 Plan Added
- Added detailed plan section with tasks 3.5.1–3.5.7.
- Covers Convex schema, local DB, sync extensions, activity monitor integration, testing, and docs.

## Phase 3.5 Requirements Recap
- Current: Calendars/habits/completions sync working; user sync OK.
- Missing: Activity history sync, enhanced completion timestamp verification.
- Architecture: Local-first SQLite, bidirectional sync, LWW.

## Auth Flow Findings
- Diagnosed Convex “Not authenticated” due to auth timing race.
- Improved token verification and readiness checks.
- Endpoints `/api/auth/token` and `/api/auth/check` 404—need implementation.

## Phase 3.1 Sync Unification
- Unified sync logic across calendars, habits, completions.
- Fixed UNIQUE constraint errors and added `getHabitById`.
- Improved error handling and auth timing; dashboard reliability improved.

# Latest Commit Messages

Refactor habit creation and timestamp fields
Moved the createHabit function in local-data.ts and improved its documentation. In habits.ts, updated field names from clientCreatedAt/clientUpdatedAt to createdAt/updatedAt for consistency.

---

Enhance database schema and migration handling
- Added `userProfile` table to store global user settings and first app open timestamp.
- Updated `activityHistory` schema to replace `firstOpenAt` with `openedAt` for individual app open tracking.
- Refactored migration scripts to ensure proper application of schema changes and error handling.
- Improved local data handling to support new schema and ensure data integrity during sync operations.
- Updated implementation plan documentation to reflect changes in activity tracking and user profile management.

---

Update database schema and refactor sync handling
- Changed database connection URL in drizzle.config.ts to point to the new local database path.
- Removed deprecated migration files and updated the schema to streamline the database structure.
- Enhanced the activity history tracking by consolidating fields and improving sync functionality.
- Updated local data service methods to reflect changes in the schema and ensure proper data handling.
- Refactored components to utilize the new schema and improved sync architecture for better performance.

---

Refactor sync services to use unified sync architecture
- Replaced instances of `SyncService` with `unifiedSyncService` across multiple components for improved synchronization handling.
- Consolidated sync-related state management into a single `consolidatedSyncStore`, replacing legacy sync and status stores.
- Removed deprecated sync manager and user sync service files to streamline the codebase.
- Updated components to utilize the new unified sync service for background sync operations and error handling.
- Enhanced documentation to reflect the new sync architecture and its benefits.

---

Enhance database schema and local data handling
- Added `convexId` column to the `habits` table for improved synchronization.
- Introduced `clientUpdatedAt` column in the `completions` table for conflict resolution.
- Created `activity_history` table to track user activity with timestamps.
- Updated local data service to include functions for retrieving habits by `convexId` and updating activity history entries.
- Refactored completions store to include `clientUpdatedAt` during creation.

---

Enhance sync functionality and file structure
- Added new `meta` directory in migrations with snapshot and journal files.
- Introduced `clearAllLocalData` function in local-data service to clear user-specific data on sign-out.
- Updated sync service to improve activity history synchronization, including better handling of local timestamps and UUID generation.
- Implemented automated sync trigger on user authentication state changes.
- Refactored sync service methods to streamline operations and improve error handling.
- Updated implementation plan documentation to reflect new sync features and enhancements.

---

Refactor file structure and enhance sync functionality
- Removed .vercel directory from file structure.
- Added new markdown files for enhanced sync planning and documentation.
- Updated package.json to exclude .vercel from tree command.
- Specified types for results in activityHistory and completions mutations.
- Enhanced activity monitor to trigger background sync for activity history.
- Added anonymous data migration dialog for syncing user data.
- Improved sync status indicators and error handling.
- Implemented activity history table in schema for tracking app usage.
- Added functions for managing activity history in local data service.
- Developed sync methods for bidirectional activity history synchronization.
- Updated sync service to handle activity history migration and syncing.
- Refined network and sync status stores for better state management.

---