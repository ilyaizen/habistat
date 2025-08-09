# PRP: Local‑First Timed Sync, Deletion Propagation, ActivityHistory Minimization, and firstAppOpenAt Fix (Phase 3.8)

## Overview
Design and implement a less‑aggressive, local‑first sync loop that:
- Triggers every 5 minutes, only syncing if local changes exist.
- Replaces success console logs with user‑visible toast notifications.
- Ensures local deletions of calendars and habits propagate to Convex.
- Minimizes `activityHistory` by using creation/open timestamps as the unique daily key.
- Fixes `firstAppOpenAt` initialization and sync to Convex.

This follows the project’s local‑first architecture with SQLite as the source of truth and Convex as optional cloud sync, using last‑write‑wins (LWW) outside of initial import.

## Goals & Success Criteria
- Local data persists offline; sync runs every 5 minutes without spamming.
- Conditional sync: only runs if local changes are detected since last successful sync.
- User feedback: toast appears on successful full sync (no console noise for users).
- Local deletions of calendars/habits result in remote deletions on next online sync.
- `activityHistory` stores one entry per day per user via `openedAt` without duplicating a `date` field.
- `firstAppOpenAt` is set locally at first app open and reliably synced to Convex.

## Scope
- SvelteKit UI: `src/routes/+layout.svelte` and/or a small scheduler module in `src/lib/services/`.
- Sync orchestration: `src/lib/services/sync-service.ts` (existing) and/or `src/lib/stores/sync-stores.ts`.
- Store wiring: `src/lib/components/store-sync.svelte` (current sign‑in trigger remains, remove aggressive auto‑syncs).
- Local DB ops: `src/lib/services/local-data.ts`, `src/lib/db/schema.ts`.
- Convex functions: `src/convex/*.ts` for deletion and user profile timestamp.
- Toasts: keep `Toaster` in `src/routes/+layout.svelte`; use `svelte-sonner` `toast.success()`.

## Design Decisions
- Timer lives on the client (desktop app via Tauri + browser). A simple scheduler runs while the layout is mounted.
- “Has local changes?” is computed by comparing per‑table latest `updatedAt`/`clientUpdatedAt` against last successful sync timestamps in `syncMetadata`.
- Deletions use immediate remote mutation when online; if offline, they are queued and pushed on next sync.
- LWW remains default; on first authenticated import, server should be able to overwrite local (handled already by SyncService via initial‑sync flag or equivalent logic; verify and preserve).

## Affected Files (planned)
- `src/routes/+layout.svelte`: host scheduler/subscribe to sync store; show toast on success.
- `src/lib/components/store-sync.svelte`: keep auth‑driven init; remove any per‑load full syncs.
- `src/lib/services/sync-service.ts`: expose `fullSync()` result events and a lightweight `hasLocalChanges()` helper or surface via `local-data.ts`.
- `src/lib/services/local-data.ts`: utility to compute latest local change timestamps per table; helpers for `syncMetadata` read/write.
- `src/lib/db/schema.ts`: confirm fields used for change detection; optionally add unique index for daily activity bucket (see below).
- `src/lib/stores/calendars.ts`, `src/lib/stores/habits.ts`: ensure local deletions call queued remote deletions when offline.
- `src/convex/*`: ensure delete mutations exist and `firstAppOpenAt` set-if-missing semantics.

## Implementation Blueprint

### 1) Timed sync scheduler (every 5 minutes) with conditional trigger
- Create `src/lib/services/sync-scheduler.ts` (or wire inside `+layout.svelte`):
  - On mount, `setInterval` with 5‑minute period.
  - On each tick, run `hasLocalChanges()` → if true, call `SyncService.fullSync()`.
  - Debounce: do not start a new sync if one is in progress (`isSyncing` guard already present in service).
- `hasLocalChanges()` options:
  - Query max local `updatedAt` (or analogous per table) and compare with saved `lastSuccessSyncAt` for each table in `syncMetadata`.
  - If any table has local change newer than its respective last success time, return true.
- Persist last success time:
  - On successful `fullSync()`, update `syncMetadata` for all tables touched to `now()` as last success time.

Pseudocode:
```ts
// sync-scheduler.ts
let intervalId: number | undefined;
export function startSyncScheduler() {
  stopSyncScheduler();
  intervalId = window.setInterval(async () => {
    if (SyncService.isSyncing) return;
    const changed = await hasLocalChanges();
    if (!changed) return;
    const res = await SyncService.fullSync();
    if (res?.success) notifySyncSuccess(res); // toast in layout context
  }, 5 * 60 * 1000);
}
export function stopSyncScheduler() { if (intervalId) clearInterval(intervalId); }
```
- Hook lifecycle in `src/routes/+layout.svelte`: start on mount, stop on destroy.

### 2) Toast notifications on success
- Replace success console log with a UI toast:
  - Keep logging for dev using guarded DEBUG flag, but user feedback via `toast.success("Synced")`.
  - Trigger in layout by listening to `SyncService` result or simply after `fullSync()` resolves successfully in the scheduler.
- Ensure `Toaster` stays rendered in `+layout.svelte`.

### 3) Local deletions propagate to Convex
- Current behavior: local deletions “call corresponding Convex mutations.” Verify both calendars and habits.
- For offline safety, add a tiny queued deletion mechanism:
  - Add `pendingDeletes` table (minimal): `{ id, tableName, localUuid, queuedAt }`.
  - On local delete: attempt remote delete; if fails (offline/401/timeout), insert an entry into `pendingDeletes`.
  - During `fullSync()`: drain `pendingDeletes` first (retry deletes), then proceed with normal push/pull.
- Conflict policy:
  - If record already deleted remotely, consider delete successful and remove queue entry.
  - If remote record exists, perform remote delete; if remote returns 404, treat as success (idempotent).

### 4) Minimize activityHistory using creation timestamps
- Keep only `openedAt` (unix int). Treat each day as a unique bucket per user.
- Enforce uniqueness in code:
  - Before inserting, compute `dayStart = floor(openedAt / 86400) * 86400`.
  - Query if there is already an entry for `(userId, dayStart)`; if exists, skip insert.
- Optional (schema improvement): add computed column `dayStart` and unique index `(userId, dayStart)` for fast dedup. Keep out of critical path if migrations are heavy.
- Sync rules:
  - LWW on `clientUpdatedAt` when updating existing day entry.
  - Do not create multiple entries for the same day when merging server data; always upsert by `(userId, dayStart)`.

### 5) Fix `firstAppOpenAt` initialization and sync
- Local: on very first app open (detected by missing local `userProfile.firstAppOpenAt`), set it to `now()`.
- On next authenticated sync, call a Convex mutation `setFirstAppOpenAtIfMissing(now)` that only sets the field if not present.
- Ensure mutation is idempotent and never overwrites an existing value.
- Add `waitForConvexAuth()` guard (already used in `SyncService`) before calling.

## Data Model & Schema Notes
- `syncMetadata` already exists; continue to use it to store last success sync timestamps per table.
- Add (optional) `pendingDeletes` table in local SQLite for robust offline deletion propagation.
- Activity history remains minimal with `openedAt` only; deduplicate by day in code; optional unique index `(userId, dayStart)` if we introduce computed column.

## Integration Points
- `src/routes/+layout.svelte`:
  - Start/stop scheduler; import `toast` and show success on `fullSync` completion.
- `src/lib/components/store-sync.svelte`:
  - Keep auth initialization; remove any “sync on every load.” Ensure it doesn’t compete with scheduler.
- `src/lib/services/sync-service.ts`:
  - Provide/keep `isSyncing` guard; on success update `syncMetadata`.
  - Add `drainPendingDeletes()` step at the start of `fullSync()`.
- `src/lib/services/local-data.ts`:
  - `getSyncMetadata(table)`, `setSyncMetadata(table, ts)` (exists).
  - Add `getLatestUpdatedAt(table)` helpers for calendars, habits, completions, activityHistory.
  - Implement `pendingDeletes` helpers if table is added.

## Error Handling & Edge Cases
- Never run concurrent syncs: respect `isSyncing`.
- If `waitForConvexAuth()` fails, skip sync; scheduler will retry later.
- Treat delete 404s as success (idempotent remote delete).
- If max local updatedAt equals last sync time, treat as no changes; tolerate clock skew by adding small epsilon (e.g., 1s).
- On sign‑out, stop scheduler; clear user state via `store-sync.svelte`.

## Validation Plan
- Lint & type check: `bun lint`, `bun typecheck`.
- Unit tests (where feasible) for:
  - `hasLocalChanges()` per table logic.
  - `pendingDeletes` draining logic.
  - ActivityHistory day‑bucket upsert.
- Manual QA:
  - Create/edit/delete habits and calendars offline → reconnect → confirm remote reflects changes.
  - Observe 5‑minute interval behavior; force local change and verify one sync + toast.
  - Confirm no sync when idle.
  - Verify one activityHistory entry per day.
  - Verify `firstAppOpenAt` appears in Convex after first auth.

## Tasks
1. Scheduler
   - Create `sync-scheduler.ts`; wire in `+layout.svelte` with lifecycle hooks.
   - Use `toast.success` on success. Keep `Toaster` in layout.
2. Conditional check
   - Implement `hasLocalChanges()` in `local-data.ts` using max `updatedAt` vs `syncMetadata`.
   - Update `syncMetadata` on successful `fullSync()`.
3. Deletions
   - Verify existing delete mutations are called from stores.
   - Add `pendingDeletes` queue + drain step in `fullSync()`.
4. ActivityHistory
   - Ensure day‑bucket upsert locally; adjust sync pull/push to upsert by day.
5. firstAppOpenAt
   - Set locally on first run; add Convex mutation `setFirstAppOpenAtIfMissing`.
6. Cleanup & Docs
   - Remove aggressive auto‑sync triggers from `store-sync.svelte` if any; ensure only auth init + scheduler.
   - Update `Docs/plan.md` and CHANGELOG.

## Risks & Mitigations
- Timer drift or tab suspension: acceptable—sync runs opportunistically. On app resume, next tick runs.
- Duplicate triggers (auth + timer): rely on `isSyncing` guard to serialize.
- Schema changes (optional unique index or pendingDeletes): if migration risk is high, enforce in code first.

## References
- Templates: `Docs/PRPs/prp-svelte.md`, `Docs/PRPs/SV-create-base-prp.md`
- Files: `src/routes/+layout.svelte`, `src/lib/components/store-sync.svelte`, `src/lib/services/sync-service.ts`, `src/lib/services/local-data.ts`, `src/lib/stores/calendars.ts`, `src/lib/stores/habits.ts`, `src/lib/utils/convex-operations.ts`, `src/convex/*`.
