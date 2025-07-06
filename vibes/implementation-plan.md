# **Habistat Implementation Plan**

**Version:** 0.0.1
**Last Updated:** 2025-06-28

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
  - [ ] ~~**Reordering:** Reordering controls need to be added to the new dashboard UI.~~ (Deferred)
- **2.5. Habit Management UI/UX (Local)**:
  - [x] **Store:** `src/lib/stores/habits.ts` with CRUD and Drizzle ORM persistence.
  - [x] **View (on `/dashboard`):** New compact UI displays list of habits for each calendar, sorted by `position`.
  - [x] **CRUD:** Actions link to `/dashboard-old` pages. A new integrated solution is needed.
  - [ ] ~~**Reordering:** Reordering controls need to be added to the new dashboard UI.~~ (Deferred)
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
  - [ ] Finalize/Create Convex schemas for `calendars`, `habits`, `completions`, `activeTimers` mirroring local Drizzle schemas but with Convex types (`v.*`) and `userId` (non-nullable, indexed, based on `clerkId`).
  - [ ] Implement Convex mutations for CRUD operations on these tables (e.g., `createCalendar`, `logCompletion`, `startTimer`, `stopTimer`).
  - [ ] Implement Convex queries to fetch all user-specific data.
- **3.2. Sync Logic Implementation (Bidirectional)**:
  - [ ] **Initial Sync (Pull):** On app load for an authenticated user (or after login), fetch all data from Convex. Merge with local data (server authoritative for first pull, or more complex merge later).
  - [ ] **Ongoing Sync (Push):** After any local CUD operation, if user is authenticated, queue and call the corresponding Convex mutation. Use optimistic updates in UI.
  - [ ] **Ongoing Sync (Pull):** Subscribe to Convex queries to receive real-time updates from the server and update local stores/DB.
  - [ ] **Conflict Resolution (Basic):** ~~Start with "last write wins" based on `updatedAt` timestamp. Server timestamp preferred.~~ **UPDATED:** For completions, use `completedAt` timestamp for conflict resolution since completions are ultra-simplified. Other entities still use createdAt/updatedAt.
- **3.3. Anonymous Data Migration to Cloud**:
  - [ ] On first sign-in/sign-up for a user with existing local anonymous data:
    - Prompt to sync local data.
    - If confirmed, iterate through local data and call Convex mutations to create items in cloud, associating with the authenticated `userId`.
    - Update local records with `userId` and mark as synced.
- **3.4. Subscription Store (`src/lib/stores/subscription.ts`)**:
  - [ ] Create a writable Svelte store (`subscriptionStatus`) holding `tier`, `expiresAt`, `isActive`.
  - [ ] Populate this store by calling `convex.users.getCurrentUser` when an authenticated user loads the app.
- **3.5. UI Logic for Free Tier Limits & Entitlements**:
  - [ ] Define free tier limits (e.g., 3 calendars, 7 habits per calendar).
  - [ ] In UI components for creating items, check against limits from `subscriptionStatus` store. Disable "Create" buttons if limit reached on "free" tier.
  - [ ] Show tooltips/messages prompting upgrade.
  - [ ] Apply "disabled" visual state (e.g., grayscale, reduced opacity) to items exceeding free limits if a subscription expires or for migrated data exceeding limits. These items should not be interactable for completion/timing but can be edited/deleted.
- **3.6. UI Feedback for Sync**:
  - [ ] Visual indicators for sync status (Offline, Syncing, Synced). Utilize `isOnline` store (`src/lib/stores/network.ts`).

---

### **Phase 4: Dashboard & Gamification Visuals**

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
- **4.3. Gamification - Point System (v1)**:
  - [x] Created a `gamification` store to calculate points.
  - [x] Total points are calculated from habit completions (positive/negative) and daily app activity (active/inactive days).
  - [x] Weekly points are calculated for the last 7 days.
  - [x] Display total and weekly points in the app header using badges.
  - [ ] Sync user's total points to a `userStats` table or aggregate on `users` in Convex.
- **4.4. Gamification - Streak System**:
  - [ ] Implement logic (local and Convex query/function) to calculate current and longest streaks for each habit based on `completions` data.
  - [ ] Display current streak on `HabitListItem` and Dashboard.
- **4.5. "Virtual Garden" as a Chart**:
  - [ ] Integrate a charting library (`shadcn-svelte` charts).
  - [ ] Display a chart on the dashboard representing overall progress (e.g., total completions per week for past N weeks, habit consistency score, or active streak lengths).

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

### **Phase 6: CI/CD & Automated Builds**

**Goal**: Automate the build and release process for desktop and mobile platforms using GitHub Actions.

**Tasks**:

- **6.1. Create GitHub Actions Workflow**:
  - [ ] A workflow is defined in `.github/workflows/release.yml`.
  - [ ] The workflow triggers on pushes to the `master` branch and can be run manually.
  - [ ] It uses `tauri-apps/tauri-action` to build the application.
- **6.2. Windows Build Job**:
  - [ ] A job builds the application on `windows-latest`.
  - [ ] On completion, it uploads the `.msi` installer as a release artifact.
- **6.3. Android Build Job**:
  - [ ] A job builds the application on `ubuntu-latest`.
  - [ ] It requires `ANDROID_SIGNING_KEY` and `ANDROID_KEYSTORE_PASSWORD` secrets to be configured in the GitHub repository to sign the `.apk`.
  - [ ] On completion, it uploads the signed `.apk` as a release artifact.

---

### ~~**Phase 7: Syncable Timer Functionality**~~ (Deferred)

**Goal**: Implement the habit timer feature with local persistence and cloud sync for active timer state.

**Tasks**:

- **6.1. Refine Timer UI**:
  - [ ] On `HabitListItem` or habit detail page, if `timerEnabled`:
    - If no active timer for this habit: Show "Start Timer" button.
    - If an active timer exists (from `activeTimers` store/table): Show current state (Running: HH:MM:SS / Paused) with "Pause", "Resume", "Complete Session", "Cancel Session" buttons.
- **6.2. Local Timer Logic (using `activeTimers` store & Drizzle)**:
  - [ ] Implement store actions for `
