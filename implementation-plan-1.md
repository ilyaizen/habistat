# **Habistat - Implementation Plan**

## 🎯 Project Goals & Key Features Overview

This plan outlines the development of Habistat, a responsive, modern, and minimalistic habit tracking web application. The primary goal is to provide a user-friendly tool for building habits, tracking progress, and achieving goals, with a strong emphasis on privacy, simplicity, and an optional gamified experience.

**Key Features to Implement (as derived from README and initial prompts):**

1.  **Core Habit Tracking:**
    *   Positive ("Do") and Negative ("Don't Do") habits.
    *   Daily check-off system for habit completion.
    *   Optional timers for time-based habits.
2.  **Organization & Management:**
    *   **Habit Management:** CRUD operations for habits (name, type, timer, point value).
    *   **Calendar System:** Group habits into multiple "Calendars" (categories) with custom names and colors.
3.  **Dashboard & Visualization:**
    *   Summary of user's habits and progress.
    *   Charts and visualizations for trends.
    *   GitHub-style activity grid for habit completion over time.
4.  **Gamification:**
    *   Streaks for consistent habit completion.
    *   Points system.
    *   Virtual garden that grows with progress.
5.  **User Experience & Customization:**
    *   Clean, adaptive UI with light/dark modes.
    *   Multi-language support.
    *   Clear header and footer for navigation (except on the homepage).
    *   Settings page for account, customization, data management.
6.  **Data & Platform:**
    *   Offline-first functionality.
    *   Optional, secure cloud sync across devices.
    *   Full data portability (import/export).
    *   Cross-platform support (Tauri: Android, iOS, Windows, macOS, Web).
    *   Authentication should be optional, with clear feedback on auth status.

**Guiding Principles:**

*   **Iterative Development:** Each phase should yield visible outputs.
*   **Frontend Focus:** Prioritize a functional and visually appealing frontend. Backend components will be integrated as needed by frontend features.
*   **Minimalism & Simplicity:** Keep the UI clean and focused.
*   **Privacy First:** User data is under their control.

---

## 💡 Implementation Phases

### Phase 1: UI Foundation & Basic App Shell

**Goal:** Establish a clean, multilingual, and minimalistic user interface foundation. Simplify the homepage, prepare language support, streamline header/footer, set up basic app layout for main sections (Dashboard, Settings), and implement theme switching.
**Key Features Addressed:** Basic UI structure, Multilingual Support, Light/Dark Mode, Homepage, Header/Footer.
**Status:** Partially completed based on original "Phase 1A" and "Phase 1B".

**Tasks:**

#### 1.1. Multilingual Support (from original Phase 1A)
- [x] Set up internationalization (i18n) with support for:
  - [x] **English (en)**
  - [x] **Spanish (es)**
  - [x] **Hebrew (he)**
- [x] Create or update translation files in `src/i18n/`:
  - [x] `en.json`
  - [x] `es.json`
  - [x] `he.json`
- [x] Implement language switching logic and UI (e.g., flag icons or dropdown).
- [x] Ensure language preference persists across sessions (localStorage or cookies).

#### 1.2. Simplify Homepage (from original Phase 1A)
- [x] Redesign the homepage (`src/routes/+page.svelte`) to be minimal and clean.
- [x] Remove header and footer from the homepage entirely.
- [x] Display a simple welcome message, app logo, and language selector.
- [x] Prepare homepage layout for future onboarding or intro content.

#### 1.3. Refactor Header & Footer (from original Phase 1A)
- [x] Simplify existing header (`app-header.svelte`) and footer (`app-footer.svelte`).
- [x] Reduce clutter: keep only essential navigation/actions (e.g., links to Dashboard, Settings, User Profile/Auth).
- [x] Ensure responsive design for desktop and mobile.
- [x] Make header/footer hidden on the homepage but visible on other pages.

#### 1.4. Styling & Layout Foundation (from original Phase 1A & Prompts)
- [x] Use **TailwindCSS** utility classes for consistent styling.
- [x] Leverage **ShadCN-Svelte** components where appropriate.
- [x] Maintain a clean, modern look with minimal distractions.
- [x] Implement Light/Dark mode switching and persistence (e.g., using `theme-provider` from `shadcn-svelte` or custom logic).
- [ ] Prepare base styles for easy extension in later phases.

#### 1.5. Basic App Structure & Navigation (inspired by original Phase 1B)
- [ ] Create placeholder pages/routes for main app sections:
    - [ ] `/dashboard`
    - [ ] `/settings` (with sub-route placeholders for Account, Customization, Data, etc. to be detailed in Phase 7)
- [ ] Ensure navigation between these sections works via the header/footer or a sidebar if designed.
- [ ] Uphold "Offline-First & Static" principle for UI components: Ensure UI components render their basic structure without backend dependencies where possible.

#### 1.6. UI Feedback for Authentication Status
- [x] Design and implement initial UI elements that will later reflect authentication status (e.g., a "Sign In" button in the header that changes to "User Profile" when logged in). This prepares for Phase 2.

---

### Phase 2: Authentication & User Profile

**Goal:** Integrate user authentication using Clerk (`svelte-clerk`) and set up the Convex backend for user profiles. Ensure basic auth flow works on Web and Tauri, and users receive clear feedback about their authentication status. App should remain usable for anonymous users.
**Key Features Addressed:** User Authentication, User Profile (basic), Optional Auth.
**Status:** Partially completed based on original "Phase 3: Auth Foundation & Sync Priming".

**Tasks:**

#### 2.1. Anonymous Session Management
- [x] Implement anonymous session store in `src/lib/utils/tracking.ts`:
  - [x] Generate and store a unique `anonymousId` in localStorage on first app load.
  - [x] Track session creation timestamp and last modified date.
- [x] Add functions to check if session is anonymous vs. associated.
- [ ] Ensure core app functionality (Phase 3 onwards) can operate using this `anonymousId` if the user is not logged in.

#### 2.2. Clerk Setup & Integration (SvelteKit Frontend with `svelte-clerk`)
- [x] Create a Clerk application in the Clerk dashboard.
- [x] Configure required OAuth providers (e.g., Google, GitHub) in the Clerk dashboard.
- [x] Install `svelte-clerk`, `@clerk/clerk-js`, `@clerk/backend`, `@clerk/types`.
- [x] Configure Clerk environment variables (`VITE_PUBLIC_...` for client, `PUBLIC_...` & `CLERK_SECRET_KEY` for server) in `.env`.
- [x] Implement server hook (`src/hooks.server.ts`) using `@clerk/backend` `createClerkClient` and `authenticateRequest` to populate `event.locals.session`.
- [x] Update `src/app.d.ts` to include `session: RequestState` in `App.Locals`.
- [ ] ~~Deferred: Handles offline mode gracefully~~ (TODO - Specific Clerk offline considerations to be revisited if issues arise).
- [x] Wrap the SvelteKit root layout (`src/routes/+layout.svelte`) with `<ClerkProvider>` from `svelte-clerk`.
- [x] Use `getContext` and `clerk.addListener` in layout/components (`+layout.svelte`, `session-info.svelte`) to reactively access user state (`clerk.user`).
- [x] Implement session association logic (`markSessionAssociated`) in `src/lib/utils/tracking.ts`, triggered by `$effect` in `+layout.svelte` reacting to user state changes.
- [x] Implement basic sign-in (`/sign-in/+page.svelte`) and sign-up (`/sign-up/+page.svelte`) routes using Clerk components (`<SignIn>`, `<SignUp>`) from `svelte-clerk`.
- [x] Add server-side load functions (`+page.server.ts`) to `/sign-in` and `/sign-up` routes to redirect authenticated users to `/dashboard`.
- [ ] Add user profile button/menu (`<UserButton>`) to the main app layout, conditionally rendered (Consider using `{#if $user}` with context-derived store).
- [x] Update logout utility (`src/lib/utils/auth.ts`) to call `clerk.signOut()`.
- [x] Utilize Clerk user data (e.g., `clerk.user.id`, `clerk.user.primaryEmailAddress.emailAddress`) derived via context (using `readable` and `clerk.addListener`) to display user state in the UI (e.g., in `session-info.svelte`).

#### 2.3. Convex Backend Setup for Users
- [x] Install Convex CLI: `pnpm add convex`.
- [x] Initialize a Convex project: Run `npx convex dev` and link to your Convex cloud account.
- [ ] Define the initial `users` table schema in `convex/schema.ts`. Include fields like `clerkId` (string, unique index), `email` (string), `name` (optional string), `avatarUrl` (optional string), `anonymousId` (optional string, for linking anonymous data).
- [ ] Create a Convex mutation function (e.g., `convex/users.ts` -> `createOrUpdateUser`) that accepts user data (Clerk ID, email, name, avatar) and either creates a new user record or updates an existing one based on the `clerkId`.

#### 2.4. Linking Clerk Auth to Convex User Creation (Webhook Approach)
- [ ] Configure a Clerk Webhook in the Clerk dashboard. Set it to trigger on `user.created` and `user.updated` events.
- [ ] Create a Convex HTTP Action endpoint in `convex/http.ts`.
- [ ] Implement logic within the Convex HTTP Action:
  - [ ] Verify incoming webhook request signature.
  - [ ] Parse event payload.
  - [ ] Call the `createOrUpdateUser` Convex mutation.
  - [ ] Return appropriate responses.
- [ ] Set the Convex HTTP Action endpoint URL as the webhook target in Clerk.

#### 2.5. Tauri Specific Adjustments & Testing for Auth
- [ ] Review Tauri's `allowlist` in `src-tauri/tauri.conf.json` for Convex and Clerk domains.
- [ ] Test OAuth flow within Tauri webview (Windows/Android focus first).
- [ ] Verify user session persistence in Tauri.

#### 2.6. Auth UI/UX Refinements
- [ ] Style Clerk components (`<SignIn>`, `<SignUp>`, `<UserButton>`) using `shadcn-svelte` for consistency.
- [ ] Implement clear visual states for auth operations (loading, error, success).
- [ ] Ensure UI clearly indicates whether the user is operating anonymously or is logged in.

---

### Phase 3: Core Habit & Calendar Management (Local-First)

**Goal:** Implement the core functionality for creating, managing, and tracking habits and calendars, focusing on a local-first approach using Svelte stores and `localStorage`. Data models should align with future Convex schemas.
**Key Features Addressed:** Habit Management (CRUD, types, timer, points value), Calendar System (CRUD, organization), Habit Completion Logging.
**Status:** Partially aligns with the start of user's original "Phase 4".

**Tasks:**

#### 3.1. Data Modeling (Local Persistence & Convex Schema Prep - from original Phase 4)
- [ ] **Convex Schema (Design):** Define/update `calendars`, `habits`, and `completions` schemas in `convex/schema.ts` if not already done (from user's Phase 4, Task 1).
    - `calendars`: `userId` (or `anonymousId`), `name`, `colorTheme`, `position`.
    - `habits`: `userId` (or `anonymousId`), `calendarId`, `name`, `type` (positive/negative), `timerDuration` (optional), `pointsValue` (number), `position`.
    - `completions`: `userId` (or `anonymousId`), `habitId`, `completedAt` (timestamp), `notes` (optional string).
- [ ] **TypeScript Interfaces:** Define `Calendar`, `Habit`, `Completion` interfaces in `src/lib/types/index.ts`.
- [ ] **Svelte Stores for Local Data:** Create `writable` Svelte stores (`src/lib/stores/`) for `calendars`, `habits`, `completions`.
    - [ ] Initialize stores from `localStorage` on app load.
    - [ ] Persist store changes to `localStorage`.
    - [ ] Stores will hold arrays: `Writable<Calendar[]>`, `Writable<Habit[]>`, `Writable<Completion[]>`.
    - [ ] Ensure data is associated with `anonymousId` if user is not logged in, or `userId` if logged in (for future sync).

#### 3.2. Calendar Management (UI & Logic - from original Phase 4)
- [ ] **Calendar List View (`/dashboard` or `/calendars`):**
    - [ ] Display calendars from the local `calendars` store, sorted by `position`.
    - [ ] "Create New Calendar" button.
- [ ] **`CalendarListItem` Component:**
    - [ ] Display name, color theme.
    - [ ] Buttons: "Edit", "Delete", "View Habits".
    - [ ] Reordering controls (drag-and-drop or up/down buttons).
- [ ] **Calendar CRUD Pages/Modals:**
    - [ ] Forms for creating/editing calendars (name, colorTheme).
    - [ ] Use `shadcn-svelte` components.
- [ ] **Calendar Logic (`src/lib/stores/calendars.ts`):**
    - [ ] Functions: `addCalendar`, `updateCalendar`, `deleteCalendar`, `reorderCalendar`.
    - [ ] Update store and `localStorage`. Manage `position` updates.

#### 3.3. Habit Management (UI & Logic, within Calendar Context - from original Phase 4)
- [ ] **Calendar Detail View (`/calendars/[calendarId]`):**
    - [ ] Display selected calendar's details.
    - [ ] List habits for this calendar from local `habits` store, sorted by `position`.
    - [ ] "Create New Habit" button.
- [ ] **`HabitListItem` Component:**
    - [ ] Display name, type (positive/negative icon), timer indicator.
    - [ ] Buttons: "Edit", "Delete", "Log Completion".
    - [ ] Reordering controls.
    - [ ] Display today's completion count for the habit.
- [ ] **Habit CRUD Pages/Modals:**
    - [ ] Forms for creating/editing habits (name, type, timerDuration, pointsValue, assign to calendar).
    - [ ] Use `shadcn-svelte` components.
- [ ] **Habit Logic (`src/lib/stores/habits.ts`):**
    - [ ] Functions: `addHabit`, `updateHabit`, `deleteHabit`, `reorderHabit`.
    - [ ] Update store and `localStorage`. Manage `position` updates within a calendar.

#### 3.4. Habit Completion Logging (Local - from original Phase 4)
- [ ] **Log Completion Logic (`src/lib/stores/completions.ts`):**
    - [ ] Function: `addCompletion(habitId, completedAt?)`.
    - [ ] Creates a `Completion` object and adds to the `completions` store and `localStorage`.
- [ ] Integrate "Log Completion" button in `HabitListItem` to call this function.
- [ ] Consider UI for undoing a completion.

---

### Phase 4: Basic Cloud Sync for Core Data

**Goal:** Implement basic cloud synchronization for calendars, habits, and completions between the local Svelte stores and Convex for authenticated users. Handle migration of anonymous local data upon first sign-in/sign-up.
**Key Features Addressed:** Optional Sync (initial implementation).
**Status:** Partially aligns with sync aspects of user's original "Phase 4".

**Tasks:**

#### 4.1. Convex Mutations & Queries
- [ ] Write Convex mutations for CRUD operations on `calendars`, `habits`, and `completions` tables (e.g., `createCalendar`, `updateHabit`, `logCompletionToCloud`).
- [ ] Write Convex queries to fetch all data for a logged-in user (e.g., `getCalendarsForUser`, `getHabitsForUser`, `getCompletionsForUser`).
- [ ] Ensure all Convex functions correctly use `ctx.auth` to get the `userId` (Clerk ID) and scope data appropriately.

#### 4.2. Sync Logic Implementation
- [ ] **Initial Sync on Login:**
    - [ ] When a user logs in, fetch all their data from Convex.
    - [ ] Merge Convex data with any existing local data (conflict resolution strategy needed, e.g., "last write wins" or prompt user).
    - [ ] Update Svelte stores and `localStorage` with the merged data.
- [ ] **Ongoing Sync:**
    - [ ] When local data changes (CRUD operations in Phase 3), if the user is authenticated, call the corresponding Convex mutation.
    - [ ] Consider using Convex reactive queries (`useQuery`) in Svelte components to automatically update UI when cloud data changes (if feasible with local-first architecture, might require careful state management). Alternatively, implement a pull-based refresh or subscribe to Convex updates.
- [ ] **Offline Handling:**
    - [ ] If offline, queue mutations locally (e.g., in `localStorage`).
    - [ ] Attempt to send queued mutations when connectivity is restored.

#### 4.3. Anonymous Data Migration
- [ ] On first sign-in/sign-up after using the app anonymously:
    - [ ] Prompt the user if they want to associate their local anonymous data with their new account.
    - [ ] If yes, update local data to be associated with the new `userId` and push it to Convex.
    - [ ] Update the `anonymousId` field on the Convex `users` table to link this account to previous anonymous usage if desired for analytics or future recovery.

---

### Phase 5: Dashboard & Activity Visualization

**Goal:** Develop the main dashboard to provide users with an overview of their habits, progress, and activity using charts and a GitHub-style activity grid.
**Key Features Addressed:** Dashboard, Visuals (Charts, Activity Grid).
**Status:** New phase, incorporates deferred items.

**Tasks:**

#### 5.1. Dashboard Layout
- [ ] Design and implement the main dashboard layout (`/dashboard`).
- [ ] Include sections for habit summary, activity grid, and charts.

#### 5.2. Habit Summary
- [ ] Display a quick overview of active habits, current streaks (to be defined in Phase 6), and today's progress.
- [ ] Fetch data from local Svelte stores.

#### 5.3. Charts & Visualizations
- [ ] Integrate a charting library (e.g., Chart.js, Svelte-frappe-charts).
- [ ] Implement charts showing:
    - [ ] Habit completion trends over time (weekly, monthly).
    - [ ] Overall progress towards goals (if goals are defined).
    - [ ] Points accumulation (once points are implemented in Phase 6).
- [ ] Ensure charts are responsive and visually appealing.

#### 5.4. GitHub-Style Activity Grid (Heatmap)
- [ ] Create a component to display habit completion activity similar to GitHub's contribution graph.
- [ ] Each cell represents a day; color intensity indicates completion volume or consistency.
- [ ] Allow filtering by habit or calendar.
- [ ] Data sourced from the `completions` store.

---

### Phase 6: Gamification - Streaks, Points & Virtual Garden

**Goal:** Introduce gamification elements like streaks, points, and a virtual garden to enhance user engagement and motivation.
**Key Features Addressed:** Gamification (Streaks, Points, Virtual Garden).
**Status:** New phase, incorporates deferred items.

**Tasks:**

#### 6.1. Points System
- [ ] **Logic:**
    - [ ] Calculate points earned for each completed habit based on its `pointsValue`.
    - [ ] Potentially award bonus points for streaks or completing all habits in a calendar.
- [ ] **Display:**
    - [ ] Show total points on the dashboard or user profile.
    - [ ] Display points earned per habit or per day.
- [ ] **Storage:** Store total points locally; sync to Convex if user is authenticated.

#### 6.2. Streaks System
- [ ] **Logic:**
    - [ ] For each habit, calculate the current streak (consecutive days completed).
    - [ ] Calculate the longest streak.
    - [ ] Define rules for breaking/maintaining streaks (e.g., handling missed days).
- [ ] **Display:**
    - [ ] Show current and longest streaks per habit.
    - [ ] Highlight active streaks.
- [ ] **Storage:** Store streak data locally; sync to Convex.

#### 6.3. Virtual Garden
- [ ] **Concept:** A visual representation of user progress. The garden "grows" as habits are completed or points are earned.
- [ ] **Design:**
    - [ ] Create or source simple plant/garden graphics (SVG or simple images).
    - [ ] Define stages of growth for plants, tied to metrics (e.g., total completions, points, overall streak length).
- [ ] **Implementation:**
    - [ ] Create a `VirtualGarden` Svelte component.
    - [ ] Update the garden's state based on user activity.
    - [ ] Display the garden on the dashboard or a dedicated section.
- [ ] **Persistence:** Store garden state locally; sync to Convex.

---

### Phase 7: Settings & Data Management

**Goal:** Implement a comprehensive settings area allowing users to manage their account, customize app appearance, view history, and manage their data through import/export.
**Key Features Addressed:** User Preferences, Data Portability.
**Status:** New phase, expands on original "Phase 1B" sub-routes.

**Tasks:**

#### 7.1. Settings Page Layout
- [ ] Create the main `/settings` page with clear navigation to sub-sections (Account, Customization, Data, etc.).
- [ ] Use `shadcn-svelte` components for a consistent settings UI.

#### 7.2. Account Settings
- [ ] Link to Clerk's hosted profile management for email/password changes, connected accounts.
- [ ] Display basic account information.
- [ ] Option to delete account (with data deletion from Convex).

#### 7.3. Customization Settings
- [ ] **Theme:** Consolidate Light/Dark mode toggle (from Phase 1).
- [ ] **Language:** Consolidate language selector (from Phase 1).
- [ ] (Future) More themes or appearance options as per roadmap.

#### 7.4. Data & Sync Settings
- [ ] Display current sync status (last synced time).
- [ ] Option for manual sync trigger (if needed).
- [ ] Information about local vs. cloud storage.

#### 7.5. Data Import/Export
- [ ] **Export:**
    - [ ] Allow users to export all their data (calendars, habits, completions) as a JSON file.
    - [ ] Consider CSV export for completions.
- [ ] **Import:**
    - [ ] Allow users to import data from a previously exported JSON file.
    - [ ] Handle data merging/replacement carefully, provide options to the user.

---

### Phase 8: Advanced Features, Polish & Testing

**Goal:** Refine the application, add advanced gamification, optimize performance, and conduct thorough testing across all target platforms.
**Key Features Addressed:** Enhanced Gamification, UI/UX Polish, Performance.
**Status:** New phase, covers roadmap items.

**Tasks:**

#### 8.1. Advanced Gamification (from README Roadmap)
- [ ] Implement badges or achievements for milestones.
- [ ] Consider opt-in leaderboards for friends (would require a "friends" system).

#### 8.2. UI/UX Polish
- [ ] Add subtle animations and transitions.
- [ ] Conduct user experience reviews and iterate on design.
- [ ] Improve accessibility.

#### 8.3. Performance Optimization
- [ ] Profile application performance, especially with large amounts of data.
- [ ] Optimize Svelte component rendering, data handling, and interactions with `localStorage`/Convex.

#### 8.4. Cross-Platform Testing & Refinements
- [ ] Thoroughly test on all target platforms: Android, iOS, Windows, macOS, and various web browsers.
- [ ] Address any platform-specific bugs or UI inconsistencies.
- [ ] Finalize Tauri build configurations and packaging for each platform.

---

### Phase 9: Future Roadmap Items

**Goal:** Implement features from the longer-term roadmap.
**Key Features Addressed:** Public API, Health App Integrations.
**Status:** Future.

**Tasks:**
- [ ] Public API for integrations.
- [ ] More themes and customization options.
- [ ] Health app integrations (e.g., Apple Health, Google Fit).
- [ ] Community-suggested features.

---
This revised plan provides a more structured approach. Remember that each phase, especially the larger ones, can be broken down further into smaller, manageable iterations. Good luck with Habistat! 😎