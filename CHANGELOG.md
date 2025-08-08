# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/) and follows the
structure of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
