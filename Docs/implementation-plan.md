# **Habistat Implementation Plan**

**Version:** 0.0.2
**Last Updated:** 2025-08-08

---

This document outlines the phased implementation plan for Habistat, evolving it into a Software as a Service (SaaS) application with free and premium tiers. It integrates previous planning documents, user feedback, and new feature requirements.

## **Core Principles**

- **Offline-First**: Core functionality must be available offline. Data is stored locally (SQLite via Drizzle ORM) and synced to Convex when online.
- **SaaS Model**: The application will have free and premium tiers, with feature gating and subscription management via Stripe.
- **Cross-Platform**: Target Web, Windows, macOS, Android, and iOS using Tauri and SvelteKit.
- **User-Controlled Data**: Users can export their data. Privacy is paramount.
- **Modern UI/UX**: Clean, responsive, and intuitive interface using Tailwind CSS and shadcn-svelte.
- **Incremental Development**: Phased approach with testable milestones.

## **General Notes**

- **Testing**: Implement unit tests (Vitest) for utility functions, Svelte stores, and Convex actions. Component tests (Svelte Testing Library) and End-to-End tests (Playwright/Cypress) should be added progressively.
- **Svelte 5**: Adhere to Svelte 5 best practices (runes like `$props`, `$effect` over deprecated syntaxes).
- **Styling**: Use Tailwind CSS and `shadcn-svelte` components for UI. Layouts for lists (calendars, habits) will initially be simple stacked cards.
- **Error Handling**: Implement robust error handling, including Svelte error boundaries (`<svelte:boundary>`) and clear user feedback.
- **Clerk authentication is configured in cookieless mode to ensure compatibility with browsers that block third-party cookies.**

---

### **Phase 0: Project Setup & Foundation Refinement**

**Goal**: Consolidate existing progress and ensure a solid foundation for subsequent phases. Many tasks from previous "Phase 1 & 2" are assumed to be largely complete here.

**Tasks**:

- **0.1. Verify Core Setup**:
  - [x] SvelteKit project initialized with `adapter-static`.
  - [x] Tauri configured for desktop and mobile.
  - [x] Tailwind CSS and `shadcn-svelte` integrated.
  - [x] Internationalization (`svelte-i18n`) set up (en, es, he) with language switcher.
- **0.2. Basic Application Shell**:
  - [x] Main layout (`src/routes/+layout.svelte`) with header and footer (hidden on homepage).
  - [x] Simplified homepage (`src/routes/+page.svelte`).
  - [x] Theme switching (light/dark mode) persistence.
  - [x] Basic navigation structure (placeholders for Dashboard, Calendars, Stats, Settings).
  - [x] Settings page shell with sub-routes for Account, Customization, Sync, Data.
- **0.3. Local Data Layer Setup**:
  - [x] Integrate Drizzle ORM with SQLite for local database persistence.
  - [x] Define initial (empty or basic) schemas for local tables if not already done.
  - [x] Set up Svelte stores that will interact with Drizzle for reactive UI updates.
- **0.4. Fix app open tracking** Fix app open tracking:
  - [x] Add debug logging for inserts and queries.
  - [x] Standardize date formatting to UTC for correct activity monitor display.
- **0.5. SvelteKit + Tauri SPA Routing Fix**:
  - [x] Resolved build failures by explicitly disabling prerendering on all dynamic routes (e.g., `/dashboard/[calendarId]`) using `export const prerender = false;` in a `+layout.ts` file. This is critical for SPA builds with `adapter-static`.
  - [x] Corrected `tauri.conf.json` schema errors by removing invalid properties that were causing the Tauri build to fail.
  - [x] Confirmed `adapter-static` in `svelte.config.js` is correctly configured with a fallback page (`index.html`) to enable client-side routing.
  - [x] Disabled PWA service worker in Tauri builds to prevent navigation interference.
  - [x] Created navigation utility (`src/lib/utils/navigation.ts`) for consistent Tauri/web routing.
  - [x] Verified navigation works correctly in both development and production builds.

---

### **Phase 1: SaaS Backend Foundation & Authentication**

**Goal**: Establish the Convex backend with user authentication (Clerk) and subscription-aware user profiles.

**Tasks**:

- **1.1. Convex Backend Setup**:
  - [x] Initialize Convex project and link it.
  - [x] **Update `convex/schema.ts` - `users` table (SaaS ready)**:

    ```typescript
    // convex/schema.ts
    defineTable({
      clerkId: v.string(), // From Clerk
      email: v.string(),
      name: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      subscriptionId: v.optional(v.string()), // Stripe Subscription ID
      subscriptionTier: v.optional(
        v.union(v.literal("free"), v.literal("premium_monthly"), v.literal("premium_lifetime"))
      ),
      subscriptionExpiresAt: v.optional(v.number()) // Timestamp
    })
      .index("by_clerk_id", ["clerkId"])
      .index("by_subscription_id", ["subscriptionId"]);
    ```

- **1.2. Clerk Authentication Integration (`svelte-clerk`)**:
  - [x] Implement `svelte-clerk` for user sign-up, sign-in, sign-out.
  - [x] Configure Clerk environment variables.
  - [x] **Enable Clerk cookieless mode to avoid third-party cookie warnings and ensure compatibility with Chrome's third-party cookie phase-out:**
    - [x] Add `cookieless={true}` to `<ClerkProvider>` in `+layout.svelte`.
    - [x] Pass `cookieless: true` to `createClerkClient` in `hooks.server.ts`.
    - [x] Test authentication, session persistence, and logout in all supported browsers and platforms.
  - [x] Server hook (`src/hooks.server.ts`) to populate `event.locals.session`.
  - [x] Wrap root layout with `<ClerkProvider>`.
  - [x] Implement sign-in/sign-up pages and user button (`<UserButton>`).
  - [x] Ensure reactive user state handling in UI.
  - [x] Test redirection logic for protected routes (e.g., `/dashboard`).
  - **[FIXED 2025-01-28]** Resolved authentication issues:
    - [x] Fixed JWT token endpoint to use proper Convex template
    - [x] Fixed `localUuid` mapping in sync service (was using `c.localUuid` instead of `c.id`)
    - [x] Created comprehensive setup guide for Clerk JWT template configuration
- **1.3. Link Clerk Auth to Convex Users (Webhook)**:
  - [x] Create Convex HTTP Action (`convex/http.ts`) for Clerk webhooks (`user.created`, `user.updated`).
  - [x] Implement logic to verify webhook signature.
  - [x] In the webhook handler, call an internal Convex mutation (`createOrUpdateUser`) to sync Clerk user data to the Convex `users` table (populating `clerkId`, `email`, `name`, `avatarUrl`, and defaulting `subscriptionTier` to "free").
- **1.4. Convex User & Subscription Functions (`convex/users.ts`)**:
  - [x] Create `getCurrentUser` query (as in `saas.md`) to fetch user data including subscription status.
  - [x] Create `internal.users.updateSubscription` mutation (as in `saas.md`) for Stripe webhooks to call later.
- ~~**1.5. Tauri Specific Auth Adjustments**~~: (Deferred)
  - [ ] Verify `allowlist` in `tauri.conf.json` for Clerk and Convex domains.
  - [ ] Test OAuth flow thoroughly within Tauri webviews (Windows, Android initially).

---

### **Phase 2: Core Habit Tracking - Local First (Drizzle ORM & SQLite)**

**Goal**: Implement full local CRUD operations for calendars, habits (with descriptions, types, timers), and multiple daily completions.

**Tasks**:

- **2.1. Define Local Database Schemas (Drizzle ORM - `src/lib/db/schema.ts`)**:
  - [x] **`calendars`**: `id` (uuid, primary key), `userId` (string, nullable for local-only anonymous data initially), `name` (string), `colorTheme` (string), `position` (integer), `isEnabled` (boolean, default true), `createdAt` (timestamp), `updatedAt` (timestamp).
  - [x] **`habits`**: `id` (uuid, primary key), `userId` (string, nullable), `calendarId` (uuid, references `calendars.id`), `name` (string), `description` (text, optional), `type` (enum: 'positive', 'negative'), `timerEnabled` (boolean, default false), `targetDurationSeconds` (integer, optional), `pointsValue` (integer, optional, default 0), `position` (integer), `createdAt` (timestamp), `updatedAt` (timestamp).
  - [x] **`completions`**: `id` (uuid, primary key), `userId` (string, nullable), `habitId` (uuid, references `habits.id`), `completedAt` (timestamp). Ultra-simplified for basic habit tracking - only essential fields kept.
  - [x] **`activeTimers`**: `id` (uuid, primary key), `userId` (string, nullable), `habitId` (uuid, references `habits.id`), `startTime` (timestamp), `pausedTime` (timestamp, nullable), `totalPausedDurationSeconds` (integer, default 0), `status` (enum: 'running', 'paused'), `createdAt` (timestamp), `updatedAt` (timestamp).
- **2.2. Local Data Service (`src/lib/services/local-data.ts` or similar)**:
  - [x] Implement functions using Drizzle ORM to perform CRUD operations on local SQLite tables.
  - [x] Initialize database connection.
- **2.3. Svelte Stores for Reactivity**:
  - [x] Create writable Svelte stores (`src/lib/stores/calendars.ts`, `habits.ts`, `completions.ts`, `activeTimers.ts`).
  - [x] Stores load data from and save data via the Local Data Service. They manage UI state and trigger backend operations.
- **2.4. Calendar Management UI/UX (on Dashboard)**:
  - [x] **View (on `/dashboard`):** New compact UI displays list of calendars from local store, sorted by `position`.
  - [x] **CRUD (Create/Update/Delete):** Actions now link to `/dashboard-old` pages. A new integrated solution is needed.
  - [x] **Enable/Disable:** Add a mechanism (e.g., a switch or button) to enable or disable a calendar. Disabled calendars will be visually distinct (e.g., grayed out), and their habits will not appear in daily views.
  - [x] **Reordering:** Reordering controls need to be added to the new dashboard UI.
- **2.5. Habit Management UI/UX (Local)**:
  - [x] **Store:** `src/lib/stores/habits.ts` with CRUD and Drizzle ORM persistence.
  - [x] **View (on `/dashboard`):** New compact UI displays list of habits for each calendar, sorted by `position`.
  - [x] **CRUD:** Actions link to `/dashboard-old` pages. A new integrated solution is needed.
  - [x] **Reassign Habits:** UI now supports reassigning a habit to a different calendar from the edit page. When a habit is moved, its position is automatically set to the end of the new calendar to avoid duplicate positions.
- **2.6. Completion Logging (Local - Multiple per day)**:
  - [x] "Complete" button/control implemented in new dashboard UI.
  - [x] Logic to add a new `Completion` record to local DB (via stores/service). Each click = new record.
  - [x] ~~Implemented soft-delete for completions for the current day via the new UI.~~ **UPDATED:** Completions ultra-simplified - removed notes, durationSpentSeconds, isDeleted, createdAt, updatedAt. Now only tracks: id, userId, habitId, completedAt. Uses hard deletes for simplicity.
- ~~**2.7. Basic Timer UI (Local)**~~: (Deferred)
  - [ ] If `timerEnabled` for a habit, show "Start Timer" button.
  - [ ] UI to reflect timer state (running, paused) based on `activeTimers` store.
  - [ ] Buttons for Pause, Resume, Complete Timer (logs completion with duration), Cancel Timer.

---

### **Phase 3: Cloud Sync & SaaS Entitlement Logic (Frontend)**

**Goal**: Implement cloud synchronization with Convex and integrate frontend logic for SaaS tier limitations.

**Tasks**:

- **3.1. Convex Schemas & Functions (Backend)**:
  - [x] Finalize/Create Convex schemas for `calendars`, `habits`, `completions`, `activeTimers` mirroring local Drizzle schemas but with Convex types (`v.*`) and `userId` (non-nullable, indexed, based on `clerkId`).
  - [x] Implement Convex mutations for CRUD operations on these tables (e.g., `createCalendar`, `logCompletion`, `startTimer`, `stopTimer`).
  - [x] Implement Convex queries to fetch all user-specific data.
- **3.2. Sync Logic Implementation (Bidirectional)**:
  - [x] **Initial Sync (Pull):** On app load for an authenticated user (or after login), fetch all data from Convex. Merge with local data (server authoritative for first pull, or more complex merge later).
  - [x] **Ongoing Sync (Push):** After any local CUD operation, if user is authenticated, queue and call the corresponding Convex mutation. Use optimistic updates in UI.
  - [x] **Ongoing Sync (Pull):** Subscribe to Convex queries to receive real-time updates from the server and update local stores/DB.
  - [x] **Conflict Resolution (Basic):** ~~Start with "last write wins" based on `updatedAt` timestamp. Server timestamp preferred.~~ **UPDATED:** For completions, use `completedAt` timestamp for conflict resolution since completions are ultra-simplified. Other entities still use createdAt/updatedAt.
  - [x] **Habit Calendar Reassignment Sync:** Backend and store logic now support updating a habit's `calendarId` and syncing this change to Convex. Position is recalculated on reassignment to prevent conflicts.
  - [x] **Unified Sync Service Architecture**:
    - **REFACTORED**: Replaced legacy `SyncService` with `syncService` across all components
    - **CONSOLIDATED**: Merged sync-related state into single `syncStore`
    - **REMOVED**: Deprecated sync manager and user sync service files
    - **ENHANCED**: Improved background sync operations and error handling
    - Implement conflict resolution (Last-Write-Wins based on `clientUpdatedAt` timestamps)
    - Handle network connectivity checks before attempting sync
  - [x] **Anonymous User Migration**:
    - **ENHANCED**: Added anonymous data migration dialog for better UX
    - On first sign-in, check if local data exists (calendars, habits, completions)
    - Prompt to sync local data with improved dialog interface
    - If confirmed, iterate through local data and call Convex mutations to create items in cloud
    - Update local records with `userId` and mark as synced
  - [x] **Database Schema Updates**:
    - **UPDATED**: Changed database connection URL in `drizzle.config.ts` to new local path
    - **REMOVED**: Deprecated migration files for cleaner structure
    - **ADDED**: `convexId` column to `habits` table for improved synchronization
    - **ADDED**: `clientUpdatedAt` column to `completions` table for conflict resolution
    - **CREATED**: `activity_history` table to track user activity with timestamps
- **3.3. Anonymous Data Migration to Cloud**:
  - [x] On first sign-in/sign-up for a user with existing local anonymous data:
    - Prompt to sync local data.
    - If confirmed, iterate through local data and call Convex mutations to create items in cloud, associating with the authenticated `userId`.
    - Update local records with `userId` and mark as synced.
- **3.4. Subscription Store (`src/lib/stores/subscription.ts`)**:
  - [x] Create a writable Svelte store (`subscriptionStatus`) holding `tier`, `expiresAt`, `isActive`.
  - [x] Populate this store by calling `convex.users.getCurrentUser` when an authenticated user loads the app.
- **3.5. UI Logic for Free Tier Limits & Entitlements**:
  - [x] Define free tier limits (e.g., 3 calendars, 7 habits per calendar).
  - [x] In UI components for creating items, check against limits from `subscriptionStatus` store. Disable "Create" buttons if limit reached on "free" tier.
  - [x] Show tooltips/messages prompting upgrade.
  - [x] Apply "disabled" visual state (e.g., grayscale, reduced opacity) to items exceeding free limits if a subscription expires or for migrated data exceeding limits. These items should not be interactable for completion/timing but can be edited/deleted.
- **3.6. UI Feedback for Sync**:
  - [x] Visual indicators for sync status (Offline, Syncing, Synced). Utilize `isOnline` store (`src/lib/stores/network.ts`).

---

### **Phase 3.5: Enhanced Sync - Activity History & Completion Timestamps**

**Goal**: Implement comprehensive bidirectional sync for daily activity history and ensure all habit completion timestamps are properly synchronized to Convex. This builds upon the existing Phase 3 sync infrastructure to provide complete data consistency across devices.

**Tasks**:

- **3.5.1. Simplify Activity History Schema (COMPLETED)**:
  - [x] **SIMPLIFIED**: Moved `firstAppOpenAt` to `users` table in Convex schema (stored once globally)
  - [x] **ADDED**: `userProfile` table to local schema for global first app open tracking
  - [x] **UPDATED**: `activityHistory` table to use `openedAt` instead of `firstOpenAt`:
    ```typescript
    // Local Schema
    userProfile: sqliteTable("userProfile", {
      id: text("id").primaryKey(),
      userId: text("userId"),
      firstAppOpenAt: integer("firstAppOpenAt"), // Stored once globally
      createdAt: integer("createdAt").notNull(),
      updatedAt: integer("updatedAt").notNull()
    });

    activityHistory: sqliteTable("activityHistory", {
      // ... other fields
      openedAt: integer("openedAt").notNull(), // Individual app open timestamp
      // ... removed firstOpenAt field
    });
    ```
  - [x] **UPDATED**: Convex schema to match simplified local schema
  - [x] **FIXED**: All Convex functions to use `openedAt` field

- **3.5.2. Update Tracking Utilities (COMPLETED)**:
  - [x] **ENHANCED**: `logAppOpenDb()` to use `ensureUserProfile()` for global first open tracking
  - [x] **UPDATED**: `getAppOpenHistory()` to use `openedAt` field
  - [x] **ADDED**: `getFirstAppOpenTimestamp()` helper function
  - [x] **FIXED**: All field references from `firstOpenAt` to `openedAt`

- **3.5.4. Enhance Activity Monitor Integration**:
  - [x] Update `src/lib/components/activity-monitor.svelte` to trigger background sync
  - [x] Add sync trigger when new activity is logged via `logAppOpenIfNeeded()`
  - [x] Ensure no blocking of UI during sync operations

- **3.5.5. Verify Completion Sync Completeness**:
  - [x] Audit existing completion sync in `SyncService.syncCompletions()`
  - [x] Ensure all completion timestamps sync bidirectionally
  - [x] Test conflict resolution for completion data
  - [x] Verify habit ID mapping works correctly

- **3.5.6. Implement Automated Sync Trigger**:
  - [x] Create a new service or hook that listens to Clerk authentication state.
  - [x] On sign-in, trigger a full sync (`SyncService.fullSync()`).
  - [x] On sign-out, clear local user data.
  - [x] **Fix implementation**: Corrected faulty import logic in `sync-manager.ts` to properly use the `authState` store, resolving runtime errors.
  - [x] Ensure sync is triggered automatically on app startup if user is already logged in.

- **3.5.7. Documentation & Error Handling (COMPLETED)**:
  - [x] Update sync documentation with activity history patterns
  - [x] Add proper error messages and user feedback
  - [x] Ensure graceful degradation if sync fails
  - [x] Add troubleshooting guide for sync issues
  - [x] **SCHEMA SIMPLIFICATION**: Completed major refactoring to eliminate redundant `firstOpenAt` per daily entry
  - [x] **IMPROVED DATA MODEL**: First app open now stored once globally in user profile
  - [x] **MAINTAINED FUNCTIONALITY**: Usage history UI continues to work with simplified schema

**Success Criteria**:
- [x] Daily activity history syncs to Convex with proper deduplication
- [x] All habit completion timestamps sync bidirectionally without data loss
- [x] Activity data persists across app restarts and device changes
- [x] Sync performance remains optimal with new data types
- [x] **SIMPLIFIED SCHEMA**: Activity history schema complexity reduced while maintaining all functionality
- [x] **GLOBAL FIRST OPEN**: First app open timestamp stored once in user profile instead of per daily entry
- [x] No breaking changes to existing sync functionality
- [x] Proper error handling and retry logic for new sync operations

**Reference**: See `Docs/PRPs/phase3.5-enhanced-sync.md` for detailed implementation blueprint and validation gates.

- **3.5.1. Database Schema & Sync Architecture Overhaul**:
  - [x] **COMPLETED**: Extended Convex schema with `activityHistory` table and proper indexing
  - [x] **COMPLETED**: Updated local database schema with `activity_history` table
  - [x] **COMPLETED**: Added `convexId` to habits and `clientUpdatedAt` to completions tables
  - [x] **COMPLETED**: Streamlined database structure by removing unnecessary fields
  - [x] **COMPLETED**: Consolidated activity tracking with unified `activityHistory` table
  - [x] **COMPLETED**: Enhanced schema documentation with comprehensive comments

- **3.5.2. Unified Sync Service Implementation**:
  - [x] **COMPLETED**: Replaced all instances of legacy `SyncService` with `syncService`
  - [x] **COMPLETED**: Consolidated sync state management into `syncStore`
  - [x] **COMPLETED**: Implemented bidirectional activity history sync with conflict resolution
  - [x] **COMPLETED**: Enhanced background sync triggers on auth state changes
  - [x] **COMPLETED**: Added automated sync functionality for improved UX
  - [x] **COMPLETED**: Updated `fullSync()` to handle all data types including activity history

- **3.5.3. Local Data Service Enhancements**:
  - [x] **COMPLETED**: Updated local data service methods to reflect schema changes
  - [x] **COMPLETED**: Added functions for retrieving habits by `convexId`
  - [x] **COMPLETED**: Implemented activity history entry management functions
  - [x] **COMPLETED**: Added `clearAllLocalData` function for proper sign-out handling
  - [x] **COMPLETED**: Enhanced data handling for improved sync performance

- **3.5.4. Component & Store Updates**:
  - [x] **COMPLETED**: Refactored components to utilize new unified sync architecture
  - [x] **COMPLETED**: Updated activity monitor to trigger background sync
  - [x] **COMPLETED**: Enhanced completions store to include `clientUpdatedAt` during creation
  - [x] **COMPLETED**: Improved sync status indicators and error handling throughout UI

- **3.5.5. File Structure & Documentation**:
  - [x] **COMPLETED**: Cleaned up file structure by removing deprecated sync files
  - [x] **COMPLETED**: Removed `.vercel` directory and updated package.json exclusions
  - [x] **COMPLETED**: Added comprehensive documentation for new sync architecture
  - [x] **COMPLETED**: Created migration files with proper meta directory structure
  - [x] **COMPLETED**: Enhanced implementation plan to reflect all changes

- **3.5.6. Production Readiness & Quality Assurance**:
  - [x] **COMPLETED**: Implemented automated sync triggers on authentication state changes
  - [x] **COMPLETED**: Enhanced sign-out flow with proper local data clearing via `clearAllLocalData`
  - [x] **COMPLETED**: Added comprehensive error handling and retry logic
  - [x] **COMPLETED**: Implemented user-friendly sync status indicators
  - [x] **COMPLETED**: Added network status monitoring and sync state management

- **3.5.7. Validation & Testing Results**:
  - [x] **COMPLETED**: All TypeScript errors resolved across sync architecture
  - [x] **COMPLETED**: Database schema migration tested and validated
  - [x] **COMPLETED**: Cross-component integration verified with unified sync service
  - [x] **COMPLETED**: Activity history sync functionality validated end-to-end
  - [x] **COMPLETED**: Conflict resolution tested with `clientUpdatedAt` timestamps
  - [x] **COMPLETED**: Performance optimization confirmed with streamlined schema

**✅ SUCCESS CRITERIA ACHIEVED FOR PHASE 3.5**:
- ✅ **Database Architecture**: Unified, streamlined schema with essential fields only
- ✅ **Sync Architecture**: Complete refactor to unified sync service with consolidated state
- ✅ **Activity History**: Bidirectional sync implemented and validated
- ✅ **Completion Sync**: Enhanced with proper conflict resolution via `clientUpdatedAt`
- ✅ **Local-First Integrity**: SQLite remains source of truth with improved sync correlation
- ✅ **Performance**: Optimized with focused indexing and reduced complexity
- ✅ **Error Handling**: Comprehensive logging and user-friendly error management
- ✅ **Code Quality**: All TypeScript errors resolved, deprecated code removed

**📋 PHASE 3.5 STATUS: COMPLETE**

**Reference**: Implementation based on `Docs/PRPs/phase3.5-enhanced-sync.md` with all validation gates passed.

---

### **Phase 3.7: Sync & Schema Simplification (KISS + YAGNI)**

References
- PRP: `Docs/PRPs/phase3.7-sync-schema-simplification.md`
- Process baseline: `Docs/PRPs/SV-execute-base-prp.md`

Goal
- Simplify sync logic and schemas to improve reliability and maintainability prior to Phase 4.
- Enforce named `colorTheme` values for calendars; remove hex acceptance end-to-end.
- Guarantee `activityHistory` is a daily log with at most one entry per `(userId, date)`.
- Implement per-type initial sync overwrite; subsequent cycles use LWW.

Success Criteria
- Calendars only persist allowed named colors; invalid values normalized (R1) and rejected after hardening (R2).
- `activityHistory` contains at most one row per `(userId, date)` locally and in Convex after migration.
- On first sign-in (per data type), local data is overwritten by server data; subsequent syncs use LWW by `clientUpdatedAt`.
- No regression to offline-first behavior or anon→auth migration flows.

Work Items
- Constants & Types
  - [x] Create `src/lib/constants/colors.ts` exporting `ALLOWED_CALENDAR_COLORS` and `export type CalendarColor`. (R1 normalization helpers implemented)
  - [ ] Update calendar UI components to restrict choices to allowed colors only.
- Local DB (SQLite via Drizzle)
  - [x] Add unique index on `activityHistory(userId, date)` and provide `upsertActivityHistoryByDate(userId, date, openedAt, clientUpdatedAt)` helper.
  - [x] Ensure `production-init.sql` mirrors Drizzle schema (unique index present).
  - [ ] Add local cleanup on startup: consolidate duplicate day rows by LWW if any pre-index duplicates exist.
- Convex (Server)
  - [ ] Mutations normalize `colorTheme` to nearest/default allowed name (Step 1) and log telemetry when normalization occurs.
  - [ ] `activityHistory.batchUpsertActivityHistory(entries)` upserts by `(userId, date)`; keep `openedAt` canonical. Accept legacy `firstOpenAt` during migration but ignore after.
  - [ ] After normalization is stable, tighten `colorTheme` to `v.union([...literals])` (Step 2).
- Unified Sync
  - [ ] Implement per-type initial sync detection: `initialSync(type) := getLastSyncTimestamp(type) === 0`.
  - [ ] During initial pull, always overwrite local with server for conflicts; set last sync timestamp after completion.
  - [ ] Verify/align pull paths for `calendars`, `habits`, `completions`, `activityHistory`.
- Migration Strategy
  - [ ] Step 1: Calendar color normalization in Convex mutations + one-off server job to normalize existing records.
  - [ ] Step 2: ActivityHistory dedupe on server by `(userId, date)` keeping max `clientUpdatedAt`; add local unique index and run local consolidation.
  - [ ] Step 3: Ship initial sync flags; E2E validate initial overwrite behavior; monitor metrics.
  - [ ] Step 4: Remove legacy `firstOpenAt` after 2 successful releases with 0 legacy writes.

Validation Gates (Executable)
- VG1: Color enforcement
  - [ ] Create calendars using each allowed color; writes succeed.
  - [ ] Attempt to write hex/invalid; normalized and warns in R1; rejected in R2.
- VG2: ActivityHistory uniqueness
  - [ ] 3 writes for same `(userId, date)` locally result in 1 row.
  - [ ] Pull from Convex with duplicate day records ends with 1 row locally (LWW).
- VG3: Initial sync overwrite
  - [ ] Seed Convex with data vs newer local timestamps; on first login, server overwrites local for all types; subsequent cycles use LWW.
- VG4: Offline-first + migration
  - [ ] Start offline, create data, sign in later; anon→auth migration preserves data; no duplicate daily rows.
- VG5: Browser vs node SQLite parity
  - [ ] Drizzle vs `production-init.sql` schemas match (CI check).

Rollout & Monitoring
- R1: Ship normalization + initial sync overwrite; add unique index locally; run server cleanup jobs.
- R2: Tighten Convex schema; remove legacy fields post-stability.
- Monitoring: log normalized color writes, activityHistory dedupe counts, initial sync metrics by type.

Rollback Plan
- If `colorTheme` hardening causes issues, revert to `v.string()` but keep normalization.
- If unique index causes local errors, revert migration and fallback to app-level upsert-by-date while investigating.

Status
- [ ] Planned  •  [ ] In Progress  •  [ ] Validated  •  [ ] Released

---

### ~~**Phase 4: Dashboard & Gamification Visuals**~~ (Deferred)

**Update**: 2025-08-07 - This feature has been deferred and will not be implemented at this time.

**Goal**: Create the main dashboard displaying habit summaries, 30-day history with interactive completion, and initial gamification visuals.

**Tasks**:

- **4.1. Dashboard Layout (`/dashboard/+page.svelte`)**:
  - [x] Designed and implemented a new user-friendly dashboard.
  - [x] Displays habits with completion status and allows quick completion.
- **4.2. 30-Day Habit History & Interactive Completion**:
  - [x] Each habit displays a 35-day grid showing completion status with color gradients.
  - [x] Interactive controls for logging completions are implemented:
    - [x] If 0 completions for the habit today: Show `[ Complete ]` button.
    - [x] If >0 completions: Show `[ - <count> + ]` buttons.
    - [x] `+` action: Logs a new completion for today, increments count.
    - [x] `-` action: Deletes the most recent completion for today for that habit, decrements count.
- **4.2.1. Enhanced Activity Monitor with Collapsible Chart**:
  - [x] Converted Activity Overview header into a collapsible button with animated chevron icon.
  - [x] Added expandable chart section with separator showing completion trend.
  - [x] **SIMPLIFIED**: Replaced layerchart with recharts for simpler, more maintainable implementation.
  - [x] Implemented proper shadcn-svelte chart pattern using recharts BarChart component.
  - [x] Chart uses app theme colors (`var(--chart-1)`) and displays daily completion counts.
  - [x] Shows up to 14 days of data (capped from numDays parameter).
  - [x] Added recharts dependency and removed complex layerchart/d3-scale dependencies.
- **4.3. Gamification - Point System (v1)**:
  - [x] Created a `gamification` store to calculate points.
  - [x] Total points are calculated from habit completions (positive/negative) and daily app activity (active/inactive days).
  - [x] Weekly points are calculated for the last 7 days.
  - [x] Display total and weekly points in the app header using badges.
  - [ ] Sync user's total points to a `userStats` table or aggregate on `users` in Convex.
- **4.4. Gamification - Streak System**:
  - [ ] Implement logic (local and Convex query/function) to calculate current and longest streaks for each habit based on `completions` data.
  - [ ] Display current streak on `HabitListItem` and Dashboard.
- **4.5. Gamification - "Virtual Garden" Visualization (Alpha)**:
  - [x] Implemented an initial, alpha version of a "Virtual Garden" using p5.js to visually represent user progress.
  - [x] The garden's appearance (plant count, growth, colors, health) is dynamically tied to the `gamification` store's total points and weekly delta.
  - [x] Features a day/night cycle and procedurally generated plants with unique, randomized "DNA" for variety.
  - [ ] **Note:** This is a temporary, alpha implementation. It may be refined or replaced with a different visualization (e.g., a more traditional chart) in the future. The core logic is in `src/lib/p5/virtual-garden.ts`.

---

### **Phase 5: Premium Onboarding & Stripe Integration**

**Goal**: Implement the payment flow using Stripe for premium subscriptions.

**Tasks**:

- **5.1. Stripe Product & Price Setup**:
  - [ ] In Stripe Dashboard: Create "Habistat Premium Monthly" and "Habistat Premium Lifetime" products with prices.
- **5.2. Premium/Pricing Page (`src/routes/premium/+page.svelte`)**:
  - [ ] Clearly list premium benefits (e.g., unlimited calendars/habits, advanced features, support development).
  - [ ] "Upgrade to Monthly" and "Upgrade to Lifetime" buttons.
- **5.3. Stripe Checkout Integration**:
  - [ ] Create Convex action (`convex/stripe.ts` or `http.ts`) `createStripeCheckoutSession` using Stripe Node.js library. Takes `clerkId` (for metadata) and `priceId`.
  - [ ] Wire up "Upgrade" buttons to call this action and redirect to Stripe Checkout.
- **5.4. Stripe Webhook Handler (`convex/http.ts`)**:
  - [ ] Create HTTP action for Stripe webhooks. Secure with signature verification.
  - [ ] Handle `checkout.session.completed`: Extract `subscriptionId`, `clerkId` (from metadata). Determine tier and expiration. Call `internal.users.updateSubscription` Convex mutation.
  - [ ] Handle `customer.subscription.updated`, `customer.subscription.deleted`: Update user's subscription status in Convex accordingly.
- **5.5. Update Settings Page (`/settings/account`)**:
  - [ ] Display current subscription tier and expiration (if applicable).
  - [ ] "Manage Subscription" button:
    - Create Convex action `createStripeBillingPortalSession`.
    - Button calls this action and redirects to Stripe Customer Portal.
  - [ ] "Upgrade" button linking to `/premium` page if on free tier.
- **5.6. Anonymous User to Subscriber Flow Polish**:
  - [ ] If migrated local data exceeds free tier limits upon first login, clearly explain and prompt for upgrade with a modal.

---

### **Phase 6: Desktop & Mobile Build Validation**

**Goal**: Ensure the application can be successfully built and packaged for Windows and Android target platforms locally. This validates the build configuration before moving to automated CI/CD.

**Tasks**:

- **6.1. Windows Build Validation**:
  - [ ] Configure `tauri.conf.json` for Windows build (icons, identifier, etc.).
  - [ ] Run `bun tauri build` locally and confirm successful creation of the `.msi` installer.
  - [ ] Install and run the application on a Windows machine to verify core functionality.
  - [ ] Debug any platform-specific issues (e.g., white screen, file system access).
- **6.2. Initial Android Build Setup**:
  - [ ] Set up the Android development environment (Android Studio, NDK, SDK).
  - [ ] Configure `tauri.conf.json` for Android (`bundle`, `minSdkVersion`, etc.).
  - [ ] Run `bun tauri android init` to generate the Android project shell in `src-tauri/gen/android`.
  - [ ] Run `bun tauri android dev` to test the app on an emulator or physical device.
  - [ ] Address initial build errors and configuration issues. The goal is a successful debug build, not a release-signed APK at this stage.

---

### **Phase 7: CI/CD & Automated Builds**

**Goal**: Automate the build and release process for desktop and mobile platforms using GitHub Actions.

**Tasks**:

- **7.1. Create GitHub Actions Workflow**:
  - [ ] A workflow is defined in `.github/workflows/release.yml`.
  - [ ] The workflow triggers on pushes to the `master` branch and can be run manually.
  - [ ] It uses `tauri-apps/tauri-action` to build the application.
- **7.2. Windows Build Job**:
  - [ ] A job builds the application on `windows-latest`.
  - [ ] On completion, it uploads the `.msi` installer as a release artifact.
- **7.3. Android Build Job**:
  - [ ] A job builds the application on `ubuntu-latest`.
  - [ ] It requires `ANDROID_SIGNING_KEY` and `ANDROID_KEYSTORE_PASSWORD` secrets to be configured in the GitHub repository to sign the `.apk`.
  - [ ] On completion, it uploads the signed `.apk` as a release artifact.

---

### ~~**Phase 8: Syncable Timer Functionality**~~ (Deferred)

**Goal**: Implement the habit timer feature with local persistence and cloud sync for active timer state.

---

EOF.
