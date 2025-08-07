# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/) and follows the
structure of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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

### Fixed
- Sync reliability:
  - Removed duplicate sign-in sync trigger; improved auth check in `fullSync()`
  - Resolved unsubscribe race conditions in `sync-consolidated.ts`
  - Restored `getHabitByConvexId()` using `localUuid` mapping in `local-data.ts`
  - Added detailed debug logging in `sync-unified.ts`
- Activity history sync:
  - Standardized on `openedAt` field across local and Convex schemas
  - Fixed server/client field mapping; resolved Convex `ArgumentValidationError`
  - Aligned `production-init.sql` with schema; addressed "no such table: userProfile" via improved migration flow

### Dev/Docs
- Database scripts: added `db:studio`, `db:reset`, `db:setup`; enhanced migrate script error handling and verification
- Added Phase 3.5 plan docs for enhanced sync
- Convex migration `migrateActivityHistoryFields` to backfill `openedAt` and remove legacy `firstOpenAt`
