# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/) and follows the
structure of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

Nothing yet.

## [0.0.4] - 2025-08-17

### Added
- **Phase 3.8 Local-First Timed Sync**:
  - New `phase3.8-local-first-timed-sync.md` documentation for the latest development phase
  - Timed sync scheduler that runs every 5 minutes to automatically sync local changes
  - `setFirstAppOpenAtIfMissing` mutation in `users.ts` to track user engagement timestamps
  - Enhanced layout integration to start/stop timed sync scheduler for improved data synchronization
- **Noto Color Emoji Font Support**:
  - New toggle in settings customization tab to enable Noto Color Emoji font
  - `useNotoEmoji` property in settings store (defaults to false for efficient resource management)
  - Conditional font loading based on user preference with CSS override support
  - Improved emoji consistency across different platforms
  - **Noto Color Emoji Font Support**:
  - New toggle in settings customization tab to enable Noto Color Emoji font
  - `useNotoEmoji` property in settings store (defaults to false for efficient resource management)
  - Conditional font loading based on user preference with CSS override support
  - Improved emoji consistency across different platforms
- **Fireworks visual feedback**:
  - Single-explosion fireworks effect with coordinate targeting, triggered on habit completion.
- **Rate limiting & safety**:
  - Rate limits for creating calendars, habits, and completions; added `rate_limits` table.
  - Health check endpoint and maintenance endpoint for deduplication tasks.
- **Completion controls**:
  - `deleteLatestCompletionForDay` mutation enables decrementing the latest completion in a day.
- **Debug configuration**:
  - Centralized `config.ts` for debug flags (e.g., `DEBUG_VERBOSE`).
- **Navigation Enhancements**:
  - Temporary link to new hybrid dashboard page ("/dashboard-new") in app header
  - Updated navigation structure for both desktop and mobile views

### Enhanced
- **Local Data Management**:
  - New functions in `local-data.ts` for syncing metadata and checking local changes
  - Improved data synchronization capabilities and local-first architecture

### Changed
- **Sync UX and reliability**:
  - Replaced legacy SyncIndicator components with a unified `SyncStatus` in the header.
  - Proactive sync trigger in sample-data generation; auth subscription primed to avoid unnecessary full syncs.
  - Timed scheduler no longer runs an immediate sync on start; first sync happens after the interval.
  - Safe query/mutation paths can trigger token refresh when auth is not ready, reducing deadlocks.
- **Drag-and-drop reordering**:
  - Emoji act as drag handles; reorder mode is always enabled.
  - Batch writes and resequencing improve performance and stability; drag state clears correctly.
  - Animations pause during dragging; invisible dropzones improve targetability.
- **Activity calendar & titles**:
  - ActivityCalendar moved above the calendars list; single-row layout with refined title/logo area.
  - Title rows get a themed left-to-right fading background and dashed 2px border.
- **Emoji rendering**:
  - Noto Color Emoji is now included by default; removed the per-user toggle.
  - Updated `app.css` and consolidated styles with `ui.css` for consistency.
- **Habit Management Optimization**:
  - Cascade-delete functionality for habit completions when deleting habits
  - Batch mapping of unknown Convex habit IDs to local UUIDs for better performance
  - Cached local-to-Convex habit ID mappings in `mapCompletionHabitIds` function
  - Reduced Convex queries and optimized sync process

### Fixed
- Improved activity history integrity with unique (userId, date) upserts and deduplication.
- Mapping of completion habit IDs is batched and cached to reduce Convex lookups.
- Reduced noisy logging behind debug flags for cleaner consoles.

### Removed
- Deprecated `sync-indicator` components.
- Noto Color Emoji settings toggle and related UI/state.
- **Code Cleanup**:
  - Deleted `maintenance.ts` file and all related references from the codebase
  - Removed maintenance-related imports and scheduler calls from `activityHistory.ts`, `calendars.ts`, and `crons.ts`
  - Removed `anonymous-data-migration-dialog.svelte` component (migration now occurs automatically on sign-in)
  - Commented out "Stats" and "Upgrade" navigation links for future consideration

### Docs
- Updated implementation plan and file structure docs; streamlined PRP documents.

## [0.0.3] - 2025-08-08

### Refactored
- Activity history schema and sync handling:
  - Simplified the `activityHistory` table schema by removing `openedAt` and `clientUpdatedAt` fields, enforcing a minimal structure that relies on `date` for daily tracking.
  - Updated related queries and mutations to accommodate the new schema, ensuring efficient data handling and synchronization.
  - Enhanced deduplication logic to maintain a single entry per (userId, date) and improved migration processes to clean up existing duplicates.
  - Removed deprecated migration files and streamlined the database initialization process for better performance and reliability.

### Enhanced
- Calendar and activity history management for Phase 3.7:
  - Introduced normalization for calendar color names to enforce allowed values and improve consistency across the application.
  - Updated the `createCalendar` and `updateCalendar` mutations to utilize normalized color names and log normalization events.
  - Implemented deduplication logic in the activity history to ensure a single entry per (userId, date) and added a migration function to clean up existing duplicates.
  - Enhanced sync functionality to guarantee pull-first behavior during initial syncs, ensuring data integrity.
  - Updated the database schema to include maintenance metrics for tracking normalization events and deduplication processes.
  - Improved documentation and changelog to reflect these changes and their implications for the application.

## [0.0.2] - 2025-08-08

### Added
- Habit calendar reassignment UX:
  - Drag-and-drop between calendars with long-hover (800ms) intent detection
  - Confirmation dialog to prevent accidental moves
  - Calendar selector on the habit edit page

### Changed
- Color system simplification:
  - Store calendar color names only; render with Tailwind v4 OKLCH 500 shades via `colorNameToCss`
  - Added `OKLCH_500` mapping in `src/lib/utils/colors.ts`
  - `src/lib/constants/colors.ts` now re-exports utils and provides a temporary alias `colorNameToHex -> colorNameToCss`

- Refactor: Sync files renamed for clarity:
  - `src/lib/stores/sync-consolidated.ts` ➜ `src/lib/stores/sync-service.ts`
  - `src/lib/services/sync-unified.ts` ➜ `src/lib/services/sync-stores.ts`
  - Updated all imports and documentation references accordingly

### Fixed
- Sync reliability:
  - Removed duplicate sign-in sync trigger; improved auth check in `fullSync()`
  - Resolved unsubscribe race conditions in `sync-service.ts`
  - Restored `getHabitByConvexId()` using `localUuid` mapping in `local-data.ts`
  - Added detailed debug logging in `sync-stores.ts`
- Activity history sync:
  - Standardized on `openedAt` field across local and Convex schemas
  - Fixed server/client field mapping; resolved Convex `ArgumentValidationError`
  - Aligned `production-init.sql` with schema; addressed "no such table: userProfile" via improved migration flow

### Dev/Docs
- Database scripts: added `db:studio`, `db:reset`, `db:setup`; enhanced migrate script error handling and verification
- Added Phase 3.5 plan docs for enhanced sync
- Convex migration `migrateActivityHistoryFields` to backfill `openedAt` and remove legacy `firstOpenAt`
