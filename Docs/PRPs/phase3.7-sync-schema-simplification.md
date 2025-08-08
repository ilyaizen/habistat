# Phase 3.7 — Sync & Schema Simplification (KISS + YAGNI)

Status: Draft
Owner: Habistat Core
Last updated: 2025-08-08
Related: Phase 3.5 Enhanced Sync, Subscription Management PRP

## 1) Overview
We will simplify sync logic and schemas to improve reliability and maintainability before Phase 4. Focus areas:
- Enforce calendar `colorTheme` as a predefined named set (no hex).
- Guarantee `activityHistory` is a daily log with at most one entry per day the app was opened.
- Ensure “initial sync” overwrites local data with server data (per data type); subsequent syncs use last-write-wins (LWW).
- Keep `firstAppOpenAt` global-only in `userProfile`, decoupled from daily activity.

Guiding principles: KISS, YAGNI, Offline-first (SQLite is source of truth), clear validation gates.

## 2) Goals & Non-Goals
Goals
- Reduce complexity in sync paths; remove ambiguity around conflict resolution on first sign-in.
- Enforce consistent color themes with a small curated palette.
- Make daily activity tracking correct-by-construction with deduplication guarantees.
- Maintain full offline capability and resilient retries.

Non-Goals
- No UI redesign beyond necessary inputs/validation for color selection.
- No historical analytics expansion beyond daily open log.
- No changes to subscription logic in this PRP.

## 3) Success Criteria
- Calendars only persist allowed named colors end-to-end; invalid inputs are normalized.
- `activityHistory` contains at most one row per `(userId, date)` locally and in Convex after migration.
- On first sign-in (per data type), local data is overwritten by server data. Subsequent syncs use LWW.
- No regression in offline-first behavior or anonymous→auth migration.
- E2E tests pass on cold login, offline use, reconnection, and conflict scenarios.

## 4) Data Model & Schema Changes
### 4.1 Calendar colorTheme (named set)
- Allowed list (single source of truth):
  - ["lime","green","emerald","teal","cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose","red","orange","amber","yellow"]
- Local (Drizzle): keep `colorTheme TEXT` but validate at write boundaries.
- Convex: two-step hardening
  1) Validate and normalize in mutations; keep `v.string()` during migration.
  2) After data normalization, tighten schema to a `v.union` of literals.

### 4.2 ActivityHistory (daily log)
- Local (Drizzle): add a unique index on `(userId, date)`; use upsert-by-date helper.
- Convex: enforce uniqueness by `(userId, date)` in mutations (query by date + update-or-insert). Keep `openedAt` as canonical; retain `firstOpenAt` only for compatibility during migration, then remove.
- Tracking: “app open” code path must call local upsert-by-date.

### 4.3 Timestamps & IDs
- Maintain Unix integer timestamps across both sides.
- Keep `localUuid` mapping for correlation; no `convexId` persistence locally.
- Continue LWW using `clientUpdatedAt` after initial sync is established.

## 5) Sync Logic Changes
### 5.1 Initial Sync semantics (per data type)
- Definition: `initialSync(dataType)` when `getLastSyncTimestamp(dataType) === 0` for current user.
- Behavior during pull:
  - If initial: always overwrite local with server on conflict (ignore local recency).
  - After pull completes: set last sync timestamp, revert to LWW on next cycles.
- Apply to: `calendars`, `habits`, `completions`, `activityHistory`.

### 5.2 ActivityHistory sync
- Push: batch upsert with `{ localUuid, date, openedAt, clientUpdatedAt }`.
- Pull: upsert-by-date locally; if duplicate exists pre-unique-index, consolidate using LWW.

### 5.3 Calendar colorTheme validation
- UI restricts choices; service layer clamps invalid values to the nearest allowed name (configurable strategy: default to "blue").
- Mutations normalize incoming values; telemetry log when normalization occurs.

## 6) API/Convex Changes
- Mutations
  - `activityHistory.batchUpsertActivityHistory(entries)`: upsert by `(userId, date)`, normalize `openedAt` (required), ignore legacy `firstOpenAt` if present.
  - `calendars.upsertCalendar(...)`: validate `colorTheme` against allowed set during Step 1; after Step 2, change schema to `v.union` of literals (rejects invalids).
- Queries
  - `activityHistory.getActivityHistorySince({ timestamp, limit, cursor })`: unchanged contract, ensure deduped results.
- Schema tightening (Step 2) after normalization migration.

## 7) Local (SQLite) Changes
- Drizzle `activityHistory` table: create unique index `(userId, date)`.
- Provide `upsertActivityByDate(userId, date, openedAt, clientUpdatedAt)` helper.
- Production/browser DB (`production-init.sql`) must match migrations.

## 8) Migration Strategy
1) Calendar color normalization
   - Add normalization in Convex mutations (accept hex or invalid strings, map to nearest/ default allowed value).
   - One-off migration: scan calendars; for any non-allowed `colorTheme`, normalize and update.
   - After verification, change Convex schema to `v.union` literals; update types across TS.
2) ActivityHistory deduplication
   - Server job: group by `(userId, date)`, keep record with max `clientUpdatedAt`, delete others.
   - Local migration: add unique index; local cleanup on next app start: consolidate duplicates and reindex.
3) Initial sync flags
   - Implement per-type detection via `getLastSyncTimestamp(type)`; ship in app first, then run E2E to verify.
4) Remove legacy `firstOpenAt` fields in Convex after 2 successful releases with 0 legacy writes observed.

## 9) Validation Gates (Executable)
- VG1: Color enforcement
  - Create calendars with each allowed color; writes succeed.
  - Attempt to write hex/invalid; stored value is normalized and logs a warning (pre-tightening). After tightening, mutation rejects invalids.
- VG2: ActivityHistory uniqueness
  - Simulate 3 writes for same `(userId, date)` locally; table shows exactly one row.
  - Pull from Convex with duplicate day records; local ends with one row (LWW).
- VG3: Initial sync overwrite
  - Seed Convex with data; local has conflicting newer timestamps. On first login: server data overwrites local for all types; subsequent syncs behave LWW.
- VG4: Offline-first + migration
  - Start offline, create data, sign in later; anonymous→auth migration preserves data; no duplicate daily history rows.
- VG5: Browser vs node SQLite parity
  - Schema matches between migrations and `production-init.sql` (checked in CI step).

## 10) Anti-Patterns to Avoid
- Accepting hex `colorTheme` anywhere after Step 2.
- Relying solely on timestamp LWW for the very first sync.
- Creating per-day activity rows without upsert-by-date semantics.
- Divergent local vs production-init.sql schemas.

## 11) Work Items
- Constants & Types
  - Create `src/lib/constants/colors.ts` with `ALLOWED_CALENDAR_COLORS` and `export type CalendarColor`.
  - Update calendar UI to use allowed colors only.
- Local DB changes
  - Drizzle: add unique index on `activityHistory(userId, date)` and upsert helper.
  - Ensure `production-init.sql` mirrors the unique constraint.
- Convex changes (Step 1)
  - Add normalization for `colorTheme` in upsert mutations.
  - Ensure `activityHistory` mutations upsert by `(userId, date)`.
- Unified sync changes
- Implement per-type initial sync overwrite in `syncService` pull flows (completions, activityHistory; verify calendars, habits path too).
- Migrations
  - Server job: normalize calendar colors, dedupe activity history.
  - After stabilization: tighten Convex schema to literal union for `colorTheme`, remove legacy `firstOpenAt`.
- Tests & Tooling
  - E2E covering initial sync, offline/online, duplicate day, color validation.
  - CI check to diff Drizzle vs `production-init.sql` schema (lint step).

## 12) Rollout & Monitoring
- Rollout in two app releases:
  - R1: Ship normalization + initial sync overwrite, add unique index locally, run server cleanup jobs.
  - R2: Tighten Convex schema; remove legacy fields.
- Monitoring
  - Log counts of normalized `colorTheme` writes.
  - Log dedup actions on activityHistory server job.
  - Track initial sync metrics (# initial pulls by type, overwrite counts).

## 13) Rollback Plan
- If tightening `colorTheme` causes issues, revert to `v.string()` and keep normalization.
- If unique index causes unexpected local errors, revert migration and fallback to app-level upsert-by-date without constraint while investigating.
- Disable cleanup jobs and halt schema hardening until metrics stabilize.
