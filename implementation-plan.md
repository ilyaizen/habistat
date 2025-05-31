# **Habistat - Implementation Plan**

This document outlines the phased implementation plan for Habistat, evolving it into a Software as a Service (SaaS) application with free and premium tiers. It integrates previous planning documents, user feedback, and new feature requirements.

## **Core Principles**

*   **Offline-First**: Core functionality must be available offline. Data is stored locally (SQLite via Drizzle ORM) and synced to Convex when online.
*   **SaaS Model**: The application will have free and premium tiers, with feature gating and subscription management via Stripe.
*   **Cross-Platform**: Target Web, Windows, macOS, Android, and iOS using Tauri and SvelteKit.
*   **User-Controlled Data**: Users can export their data. Privacy is paramount.
*   **Modern UI/UX**: Clean, responsive, and intuitive interface using Tailwind CSS and shadcn-svelte.
*   **Incremental Development**: Phased approach with testable milestones.

## **General Notes**

*   **Testing**: Implement unit tests (Vitest) for utility functions, Svelte stores, and Convex actions. Component tests (Svelte Testing Library) and End-to-End tests (Playwright/Cypress) should be added progressively.
*   **Svelte 5**: Adhere to Svelte 5 best practices (runes like `$props`, `$effect` over deprecated syntaxes).
*   **Styling**: Use Tailwind CSS and `shadcn-svelte` components for UI. Layouts for lists (calendars, habits) will initially be simple stacked cards.
*   **Error Handling**: Implement robust error handling, including Svelte error boundaries (`<svelte:boundary>`) and clear user feedback.

---

### **Phase 0: Project Setup & Foundation Refinement**

**Goal**: Consolidate existing progress and ensure a solid foundation for subsequent phases. Many tasks from previous "Phase 1 & 2" are assumed to be largely complete here.

**Tasks**:

*   **0.1. Verify Core Setup**:
    *   [x] SvelteKit project initialized with `adapter-static`.
    *   [x] Tauri configured for desktop and mobile.
    *   [x] Tailwind CSS and `shadcn-svelte` integrated.
    *   [x] Internationalization (`svelte-i18n`) set up (en, es, he) with language switcher.
*   **0.2. Basic Application Shell**:
    *   [x] Main layout (`src/routes/+layout.svelte`) with header and footer (hidden on homepage).
    *   [x] Simplified homepage (`src/routes/+page.svelte`).
    *   [x] Theme switching (light/dark mode) persistence.
    *   [x] Basic navigation structure (placeholders for Dashboard, Calendars, Stats, Settings).
    *   [x] Settings page shell with sub-routes for Account, Customization, Sync, Data.
*   **0.3. Local Data Layer Setup**:
    *   [ ] Integrate Drizzle ORM with SQLite for local database persistence.
    *   [ ] Define initial (empty or basic) schemas for local tables if not already done.
    *   [ ] Set up Svelte stores that will interact with Drizzle for reactive UI updates.

---

### **Phase 1: SaaS Backend Foundation & Authentication**

**Goal**: Establish the Convex backend with user authentication (Clerk) and subscription-aware user profiles.

**Tasks**:

*   **1.1. Convex Backend Setup**:
    *   [ ] Initialize Convex project and link it.
    *   [ ] **Update `convex/schema.ts` - `users` table (SaaS ready)**:
        ```typescript
        // convex/schema.ts
        defineTable({
          clerkId: v.string(), // From Clerk
          email: v.string(),
          name: v.optional(v.string()),
          avatarUrl: v.optional(v.string()),
          subscriptionId: v.optional(v.string()), // Stripe Subscription ID
          subscriptionTier: v.optional(v.union(
            v.literal("free"),
            v.literal("premium_monthly"),
            v.literal("premium_lifetime")
          )),
          subscriptionExpiresAt: v.optional(v.number()), // Timestamp
        })
        .index("by_clerk_id", ["clerkId"])
        .index("by_subscription_id", ["subscriptionId"])
        ```
*   **1.2. Clerk Authentication Integration (`svelte-clerk`)**:
    *   [ ] Implement `svelte-clerk` for user sign-up, sign-in, sign-out.
    *   [ ] Configure Clerk environment variables.
    *   [ ] Server hook (`src/hooks.server.ts`) to populate `event.locals.session`.
    *   [ ] Wrap root layout with `<ClerkProvider>`.
    *   [ ] Implement sign-in/sign-up pages and user button (`<UserButton>`).
    *   [ ] Ensure reactive user state handling in UI.
    *   [ ] Test redirection logic for protected routes (e.g., `/dashboard`).
*   **1.3. Link Clerk Auth to Convex Users (Webhook)**:
    *   [ ] Create Convex HTTP Action (`convex/http.ts`) for Clerk webhooks (`user.created`, `user.updated`).
    *   [ ] Implement logic to verify webhook signature.
    *   [ ] In the webhook handler, call an internal Convex mutation (`createOrUpdateUser`) to sync Clerk user data to the Convex `users` table (populating `clerkId`, `email`, `name`, `avatarUrl`, and defaulting `subscriptionTier` to "free").
*   **1.4. Convex User & Subscription Functions (`convex/users.ts`)**:
    *   [ ] Create `getCurrentUser` query (as in `saas.md`) to fetch user data including subscription status.
    *   [ ] Create `internal.users.updateSubscription` mutation (as in `saas.md`) for Stripe webhooks to call later.
*   **1.5. Tauri Specific Auth Adjustments**:
    *   [ ] Verify `allowlist` in `tauri.conf.json` for Clerk and Convex domains.
    *   [ ] Test OAuth flow thoroughly within Tauri webviews (Windows, Android initially).

---

### **Phase 2: Core Habit Tracking - Local First (Drizzle ORM & SQLite)**

**Goal**: Implement full local CRUD operations for calendars, habits (with descriptions, types, timers), and multiple daily completions.

**Tasks**:

*   **2.1. Define Local Database Schemas (Drizzle ORM - `src/lib/db/schema.ts`)**:
    *   [ ] **`calendars`**: `id` (uuid, primary key), `userId` (string, nullable for local-only anonymous data initially), `name` (string), `colorTheme` (string), `position` (integer), `createdAt` (timestamp), `updatedAt` (timestamp).
    *   [ ] **`habits`**: `id` (uuid, primary key), `userId` (string, nullable), `calendarId` (uuid, references `calendars.id`), `name` (string), `description` (text, optional), `type` (enum: 'positive', 'negative'), `timerEnabled` (boolean, default false), `targetDurationSeconds` (integer, optional), `pointsValue` (integer, optional, default 0), `position` (integer), `createdAt` (timestamp), `updatedAt` (timestamp).
    *   [ ] **`completions`**: `id` (uuid, primary key), `userId` (string, nullable), `habitId` (uuid, references `habits.id`), `completedAt` (timestamp), `notes` (text, optional), `durationSpentSeconds` (integer, optional), `isDeleted` (boolean, default false, for soft deletes).
    *   [ ] **`activeTimers`**: `id` (uuid, primary key), `userId` (string, nullable), `habitId` (uuid, references `habits.id`), `startTime` (timestamp), `pausedTime` (timestamp, nullable), `totalPausedDurationSeconds` (integer, default 0), `status` (enum: 'running', 'paused'), `createdAt` (timestamp), `updatedAt` (timestamp).
*   **2.2. Local Data Service (`src/lib/services/local-data.ts` or similar)**:
    *   [ ] Implement functions using Drizzle ORM to perform CRUD operations on local SQLite tables.
    *   [ ] Initialize database connection.
*   **2.3. Svelte Stores for Reactivity**:
    *   [ ] Create writable Svelte stores (`src/lib/stores/calendars.ts`, `habits.ts`, `completions.ts`, `activeTimers.ts`).
    *   [ ] Stores load data from and save data via the Local Data Service. They manage UI state and trigger backend operations.
*   **2.4. Calendar Management UI/UX (Local)**:
    *   [ ] **View (`/calendars` or integrated into `/dashboard`):** Display list of calendars (simple stacked `Card` components) from local store, sorted by `position`.
    *   [ ] **CRUD:** Implement forms/modals for creating, editing (name, color), deleting calendars.
    *   [ ] **Reordering:** Basic move up/down buttons or drag-and-drop.
*   **2.5. Habit Management UI/UX (Local)**:
    *   [ ] **View (within selected Calendar):** Display list of habits (simple stacked `Card` components) for the current calendar, sorted by `position`.
    *   [ ] **CRUD:** Forms/modals for creating, editing (name, description, type, timer settings, points), deleting habits.
    *   [ ] **Reordering:** Within the calendar context.
*   **2.6. Completion Logging (Local - Multiple per day)**:
    *   [ ] "Complete Habit" button on `HabitListItem`.
    *   [ ] Logic to add a new `Completion` record to local DB (via stores/service). Each click = new record.
    *   [ ] Implement soft-delete for completions if a user wants to undo a log for today.
*   **2.7. Basic Timer UI (Local)**:
    *   [ ] If `timerEnabled` for a habit, show "Start Timer" button.
    *   [ ] UI to reflect timer state (running, paused) based on `activeTimers` store.
    *   [ ] Buttons for Pause, Resume, Complete Timer (logs completion with duration), Cancel Timer.

---

### **Phase 3: Cloud Sync & SaaS Entitlement Logic (Frontend)**

**Goal**: Implement cloud synchronization with Convex and integrate frontend logic for SaaS tier limitations.

**Tasks**:

*   **3.1. Convex Schemas & Functions (Backend)**:
    *   [ ] Finalize/Create Convex schemas for `calendars`, `habits`, `completions`, `activeTimers` mirroring local Drizzle schemas but with Convex types (`v.*`) and `userId` (non-nullable, indexed, based on `clerkId`).
    *   [ ] Implement Convex mutations for CRUD operations on these tables (e.g., `createCalendar`, `logCompletion`, `startTimer`, `stopTimer`).
    *   [ ] Implement Convex queries to fetch all user-specific data.
*   **3.2. Sync Logic Implementation (Bidirectional)**:
    *   [ ] **Initial Sync (Pull):** On app load for an authenticated user (or after login), fetch all data from Convex. Merge with local data (server authoritative for first pull, or more complex merge later).
    *   [ ] **Ongoing Sync (Push):** After any local CUD operation, if user is authenticated, queue and call the corresponding Convex mutation. Use optimistic updates in UI.
    *   [ ] **Ongoing Sync (Pull):** Subscribe to Convex queries to receive real-time updates from the server and update local stores/DB.
    *   [ ] **Conflict Resolution (Basic):** Start with "last write wins" based on `updatedAt` timestamp. Server timestamp preferred.
*   **3.3. Anonymous Data Migration to Cloud**:
    *   [ ] On first sign-in/sign-up for a user with existing local anonymous data:
        *   Prompt to sync local data.
        *   If confirmed, iterate through local data and call Convex mutations to create items in cloud, associating with the authenticated `userId`.
        *   Update local records with `userId` and mark as synced.
*   **3.4. Subscription Store (`src/lib/stores/subscription.ts`)**:
    *   [ ] Create a writable Svelte store (`subscriptionStatus`) holding `tier`, `expiresAt`, `isActive`.
    *   [ ] Populate this store by calling `convex.users.getCurrentUser` when an authenticated user loads the app.
*   **3.5. UI Logic for Free Tier Limits & Entitlements**:
    *   [ ] Define free tier limits (e.g., 3 calendars, 7 habits per calendar).
    *   [ ] In UI components for creating items, check against limits from `subscriptionStatus` store. Disable "Create" buttons if limit reached on "free" tier.
    *   [ ] Show tooltips/messages prompting upgrade.
    *   [ ] Apply "disabled" visual state (e.g., grayscale, reduced opacity) to items exceeding free limits if a subscription expires or for migrated data exceeding limits. These items should not be interactable for completion/timing but can be edited/deleted.
*   **3.6. UI Feedback for Sync**:
    *   [ ] Visual indicators for sync status (Offline, Syncing, Synced). Utilize `isOnline` store (`src/lib/stores/network.ts`).

---

### **Phase 4: Dashboard & Gamification Visuals**

**Goal**: Create the main dashboard displaying habit summaries, 30-day history with interactive completion, and initial gamification visuals.

**Tasks**:

*   **4.1. Dashboard Layout (`/dashboard/+page.svelte`)**:
    *   [ ] Design a user-friendly dashboard.
    *   [ ] Display a "Today's Habits" section: list habits relevant for today, show completion status, allow quick completion.
*   **4.2. 30-Day Habit History & Interactive Completion**:
    *   [ ] For each habit (or a selection), display a 30-day grid/view showing completion status for each day.
    *   [ ] For "today" in this view (and in "Today's Habits"):
        *   If 0 completions for the habit today: Show `[ Complete ]` button.
        *   If >0 completions: Show `[ - <count> + ]` buttons.
        *   `+` action: Logs a new completion for today, increments count.
        *   `-` action: Deletes the most recent completion for today for that habit, decrements count. (Ensure this works with sync).
*   **4.3. Gamification - Point System**:
    *   [ ] When a habit with `pointsValue` is completed, update user's total points (locally and sync to a `userStats` table or aggregate on `users` in Convex).
    *   [ ] Display total points on Dashboard.
*   **4.4. Gamification - Streak System**:
    *   [ ] Implement logic (local and Convex query/function) to calculate current and longest streaks for each habit based on `completions` data.
    *   [ ] Display current streak on `HabitListItem` and Dashboard.
*   **4.5. "Virtual Garden" as a Chart**:
    *   [ ] Integrate a charting library (`shadcn-svelte` charts).
    *   [ ] Display a chart on the dashboard representing overall progress (e.g., total completions per week for past N weeks, habit consistency score, or active streak lengths).

---

### **Phase 5: Premium Onboarding & Stripe Integration**

**Goal**: Implement the payment flow using Stripe for premium subscriptions.

**Tasks**:

*   **5.1. Stripe Product & Price Setup**:
    *   [ ] In Stripe Dashboard: Create "Habistat Premium Monthly" and "Habistat Premium Lifetime" products with prices.
*   **5.2. Premium/Pricing Page (`src/routes/premium/+page.svelte`)**:
    *   [ ] Clearly list premium benefits (e.g., unlimited calendars/habits, advanced features, support development).
    *   [ ] "Upgrade to Monthly" and "Upgrade to Lifetime" buttons.
*   **5.3. Stripe Checkout Integration**:
    *   [ ] Create Convex action (`convex/stripe.ts` or `http.ts`) `createStripeCheckoutSession` using Stripe Node.js library. Takes `clerkId` (for metadata) and `priceId`.
    *   [ ] Wire up "Upgrade" buttons to call this action and redirect to Stripe Checkout.
*   **5.4. Stripe Webhook Handler (`convex/http.ts`)**:
    *   [ ] Create HTTP action for Stripe webhooks. Secure with signature verification.
    *   [ ] Handle `checkout.session.completed`: Extract `subscriptionId`, `clerkId` (from metadata). Determine tier and expiration. Call `internal.users.updateSubscription` Convex mutation.
    *   [ ] Handle `customer.subscription.updated`, `customer.subscription.deleted`: Update user's subscription status in Convex accordingly.
*   **5.5. Update Settings Page (`/settings/account`)**:
    *   [ ] Display current subscription tier and expiration (if applicable).
    *   [ ] "Manage Subscription" button:
        *   Create Convex action `createStripeBillingPortalSession`.
        *   Button calls this action and redirects to Stripe Customer Portal.
    *   [ ] "Upgrade" button linking to `/premium` page if on free tier.
*   **5.6. Anonymous User to Subscriber Flow Polish**:
    *   [ ] If migrated local data exceeds free tier limits upon first login, clearly explain and prompt for upgrade with a modal.

---

### **Phase 6: Syncable Timer Functionality**

**Goal**: Implement the habit timer feature with local persistence and cloud sync for active timer state.

**Tasks**:

*   **6.1. Refine Timer UI**:
    *   [ ] On `HabitListItem` or habit detail page, if `timerEnabled`:
        *   If no active timer for this habit: Show "Start Timer" button.
        *   If an active timer exists (from `activeTimers` store/table): Show current state (Running: HH:MM:SS / Paused) with "Pause", "Resume", "Complete Session", "Cancel Session" buttons.
*   **6.2. Local Timer Logic (using `activeTimers` store & Drizzle)**:
    *   [ ] Implement store actions for `startTimer`, `pauseTimer`, `resumeTimer`, `completeTimerSession`, `cancelTimerSession` which update the local SQLite `activeTimers` table and `completions` table (for `completeTimerSession`).
*   **6.3. Convex Timer Functions (Backend)**:
    *   [ ] Mutations in `convex/activeTimers.ts` (or similar): `start`, `pause`, `resume`, `complete`, `cancel`. These manipulate the `activeTimers` table in Convex.
    *   [ ] `complete` mutation should calculate duration, create a `Completion` record in Convex, and delete the `activeTimer` record.
*   **6.4. Sync Active Timers**:
    *   [ ] When local timer actions are performed and user is authenticated, call corresponding Convex mutations.
    *   [ ] Subscribe to Convex query for the user's active timers to reflect server state changes in the local UI (e.g., if timer was managed on another device).
    *   [ ] Handle offline scenarios: Queue operations. On reconnect, sync. Server needs to handle potential conflicts (e.g., if timer started offline and also on another device for the same habit – for now, assume last operation wins or disallow concurrent timers for the same habit).

---

### **Phase 7: Advanced Features & Final Polish**

**Goal**: Implement data portability, advanced visualizations, and thoroughly polish the application.

**Tasks**:

*   **7.1. GitHub-Style Activity Grid**:
    *   [ ] Implement a component on the Dashboard displaying daily habit completion intensity over a longer period (e.g., past year).
*   **7.2. Data Export/Import (`/settings/data`)**:
    *   [ ] **Export:** Allow users to export their data (calendars, habits, completions, settings) as a JSON file from local DB.
    *   [ ] **Import:** Allow users to import from a previously exported JSON file. Handle merging/conflict resolution (e.g., skip duplicates by ID, or offer choices).
*   **7.3. UI/UX Polish**:
    *   [ ] Conduct a full review for consistency, clarity, ease of use.
    *   [ ] Refine animations, transitions, and visual feedback.
    *   [ ] Improve error messages and loading states.
*   **7.4. Performance Optimization**:
    *   [ ] Profile app performance, especially with large datasets (long lists, many completions).
    *   [ ] Optimize Svelte component rendering, Drizzle queries, and Convex functions. Consider virtual lists if needed.
*   **7.5. Accessibility (A11y) Review**:
    *   [ ] Test with screen readers, keyboard navigation.
    *   [ ] Ensure adequate color contrast, ARIA attributes.
*   **7.6. Thorough Cross-Platform Testing**:
    *   [ ] Test all features extensively on Web (Chrome, Firefox, Safari), Windows, macOS, Android, iOS (Tauri apps).
*   **7.7. Documentation**:
    *   [ ] Update `README.md` with final features, usage instructions.
    *   [ ] Add `CONTRIBUTING.md`.
    *   [ ] Add JSDoc comments to complex functions and components.

---

### **Future Considerations (Post-Launch / Next Iteration)**

*   **Advanced Gamification**: Badges, achievements, levels.
*   **Social Features**: Share progress with friends, accountability groups (requires careful privacy considerations).
*   **Deeper Integrations**: Apple Health, Google Fit, Todoist, etc., via their APIs.
*   **More Themes & Customization**: Beyond light/dark mode.
*   **Advanced Reporting & Insights**: More detailed stats and trends.
*   **Robust Conflict Resolution for Sync**: Implement more sophisticated strategies if needed.
*   **Public API**.

---

2025-05-31