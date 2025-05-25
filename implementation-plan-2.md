# **Habistat - Improved Implementation Plan**

This plan builds upon your existing progress, aiming for iterative development with clear outputs.

## **Compatibility with "Prompts" Section**

The "Prompts" section in your original document outlines the desired features. This improved plan maps those features into specific phases:

1.  **Dashboard:**
    *   Summary of habits/progress: **Phase 6**
    *   GitHub-style activity grid: **Phase 8**
    *   Charts/visualizations: Basic in **Phase 6**, Advanced in **Phase 8**
2.  **Habit Management:**
    *   CRUD, name, type (positive/negative), timer, point value: **Phase 4**
    *   Calendar view for habit tracking: **Phase 4** (as part of listing habits within calendars)
3.  **Calendar System:**
    *   Multiple calendars (categories), names, colors, assign habits: **Phase 4**
4.  **Habit Tracking:**
    *   Daily check-off ('Complete'): **Phase 4**
    *   Counters for habit details: **Phase 4**
    *   Dashboard display (activities, garden): Activities in **Phase 6**, Garden in **Phase 8**
    *   Calculate/display points: **Phase 7**
5.  **Gamification:**
    *   Virtual garden: **Phase 8**
    *   Reward system (points, streaks): **Phase 7**
6.  **User Preferences:**
    *   Page header/footer: **Phase 1**
    *   Light/dark mode: **Phase 2**
    *   Multi-language support: **Phase 1**
7.  **Data Management:**
    *   Import/export habit data: **Phase 9**
    *   Offline-first approach: Core principle from **Phase 1** onwards, solidified in **Phase 4**.
8.  **Optional Sync:**
    *   Groundwork in **Phase 3**, initial implementation in **Phase 5**.

---

## **Implementation Phases**

### **Phase 1: UI Foundation & Static Content**
*(Corresponds to your "Phase 1A: Homepage & UI Foundation" - Marked as mostly complete)*

**Goal:** Establish a clean, multilingual, and minimalistic user interface foundation. Simplify the homepage, prepare language support, and streamline header/footer components.

**Tasks:**
*(These are from your existing plan for Phase 1A)*
#### 1.1. Multilingual Support
- [x] Set up internationalization (i18n) with support for: English (en), Spanish (es), Hebrew (he).
- [x] Create or update translation files in `src/i18n/`.
- [x] Implement language switching logic and UI.
- [x] Ensure language preference persists across sessions.
#### 1.2. Simplify Homepage
- [x] Redesign the homepage (`src/routes/+page.svelte`) to be minimal and clean.
- [x] Remove header and footer from the homepage.
- [x] Display a simple welcome message, app logo, and language selector.
- [x] Prepare homepage layout for future onboarding content.
#### 1.3. Refactor Header & Footer
- [x] Simplify existing header (`app-header.svelte`) and footer (`app-footer.svelte`).
- [x] Reduce clutter: keep only essential navigation/actions.
- [x] Ensure responsive design.
- [x] Make header/footer hidden on the homepage but visible on other pages.
#### 1.4. Styling & Layout
- [x] Use **TailwindCSS** for consistent styling.
- [x] Leverage **shadcn-svelte** components.
- [x] Maintain a clean, modern look.
- [x] Prepare base styles for easy extension.
#### 1.5. Offline-First & Static
- [x] Ensure all UI changes work offline without backend dependencies (initial static setup).
- [x] Avoid SSR or dynamic data fetching in this phase.
- [x] Keep everything static and client-rendered.

---

### **Phase 2: App Structure & Settings Shell**
*(Incorporates and expands on your "Phase 1B: Platform Layout UI Improvements")*

**Goal:** Define the overall app navigation, implement the settings page structure, and design the UX for optional authentication and offline-first status.

**Tasks:**
- [ ] **Main Navigation:**
    - [ ] Design and implement the primary navigation structure (e.g., sidebar or tab bar for Dashboard, Calendars, Settings).
    - [ ] Create placeholder Svelte components/pages for these main sections (`/dashboard`, `/calendars`, `/settings`).
- [ ] **Settings Page Structure:**
    - [ ] Implement the main `/settings` page (`src/routes/settings/+page.svelte` and `+layout.svelte`).
    - [ ] Create sub-routes and placeholder pages for:
        - [ ] `/settings/account` (will display user info and auth actions later)
        - [ ] `/settings/customization` (for theme and appearance options)
        - [ ] `/settings/sync` (for sync status and controls later)
        - [ ] `/settings/data` (for import/export UI elements later)
- [ ] **User Preferences - Customization:**
    - [ ] Implement Light/Dark mode switching logic within `/settings/customization`.
    - [ ] Ensure theme preference persists (e.g., using `localStorage` and applying theme on app load).
- [ ] **Offline-First & Auth UX:**
    - [ ] Refine and document the strategy for offline data handling (how data flows from UI to local storage).
    - [ ] Design and implement UI elements to clearly communicate:
        - [ ] Authentication status (Anonymous / Logged In User).
        - [ ] Benefits of creating an account / logging in (e.g., cloud sync).
        - [ ] Sync status (Offline, Syncing, Synced - placeholders for now).
- [ ] **Responsive Layout:** Ensure the main app structure and settings pages are responsive.

---

### **Phase 3: Authentication & User Profile**
*(Corresponds to your "Phase 3: Auth Foundation & Sync Priming" - Marked as mostly complete with some deferred items)*

**Goal:** Integrate user authentication using Clerk and `svelte-clerk`, set up the Convex backend to store user profiles, and ensure basic auth flow works on Web and Tauri.

**Tasks:**
*(These are from your existing plan for Phase 3, ensure all are fully addressed)*
#### 3.1. Clerk Setup & Integration (SvelteKit Frontend with `svelte-clerk`)
- *(Ensure all sub-tasks from your plan are completed, including anonymous session handling, Clerk provider setup, sign-in/up routes, user button, and logout functionality)*
- [ ] Implement `session: RequestState` population in `src/hooks.server.ts` and update `src/app.d.ts`. (Verify if fully done as per your original plan)
- [ ] Finalize reactive user state handling in layouts/components using `clerk.user`.
- [ ] Test and confirm redirection logic for authenticated/unauthenticated users for protected routes (e.g., `/dashboard` should require auth, handled client-side or via server load functions).
#### 3.2. Convex Backend Setup
- *(Ensure Convex project init, `users` schema definition, and `createOrUpdate` mutation are complete)*
- [ ] Confirm `users` table schema in `convex/schema.ts` includes `clerkId` (unique index), `email`, `name`, `avatarUrl`.
#### 3.3. Linking Clerk Auth to Convex User Creation (Webhook Approach)
- *(Ensure Clerk webhook configuration, Convex HTTP Action implementation including signature verification and calling the `createOrUpdate` mutation, are complete)*
#### 3.4. Tauri Specific Adjustments & Testing
- *(Ensure `allowlist` for HTTP requests is correct, and OAuth flow is tested in Tauri webview on Windows/Android)*
- [ ] Address any platform-specific OAuth nuances if standard web flow isn't sufficient (deferred if not immediately problematic).
#### 3.5. UI/UX Refinements for Auth
- *(Ensure Clerk components are styled consistently and loading/error states are handled gracefully)*
#### 3.6. Key Deferred Items from your original Phase 3 (to be addressed in later phases):
-   Data Synchronization (actual habit/calendar data) -> **Phase 5**
-   Anonymous Data Migration -> **Phase 5**
-   Advanced Profile Management -> Later, if needed beyond basic Clerk info.
-   Robust Offline Sync Handling / Conflict Resolution -> Advanced, post-MVP.

---

### **Phase 4: Local-First Core: Calendars & Habits**
*(This phase focuses on the local-only CRUD aspects from your "Phase 4: Multi-Calendar/Habit Core...", separating out sync)*

**Goal:** Implement full local CRUD operations for calendars and habits (including types, timers), and habit completion logging. All data persists locally using Svelte stores and `localStorage`.

**Tasks:**
*(Based on your "Phase 4" tasks, focusing on local-first)*
#### 4.1. Data Modeling & Local Persistence (Svelte Stores)
- [ ] Define `Calendar`, `Habit`, `Completion` TypeScript interfaces in `src/lib/types/index.ts`. (Include `id` (local UUID), `name`, `colorTheme`, `position` for `Calendar`; `id`, `calendarId`, `name`, `type` ('positive'/'negative'), `timerDuration` (optional), `points` (optional), `position` for `Habit`; `id`, `habitId`, `completedAt` for `Completion`).
- [ ] Create Svelte `writable` stores in `src/lib/stores/` for `calendars`, `habits`, and `completions`.
- [ ] Implement store logic:
    - [ ] Load data from `localStorage` on app initialization.
    - [ ] Subscribe to store changes to persist data to `localStorage`.
    - [ ] Provide utility functions for generating local unique IDs (e.g., using `uuid`).
#### 4.2. Calendar Management UI/UX (Local)
- [ ] **Calendar List View** (`/calendars` or integrated into `/dashboard`):
    - [ ] Display calendars from the local `calendars` store, sorted by `position`.
    - [ ] "Create New Calendar" button/form.
- [ ] **`CalendarListItem` Component:**
    - [ ] Display name, color theme.
    - [ ] Buttons: "Edit", "Delete" (with confirmation), "View/Open".
    - [ ] Implement reordering (drag-and-drop or move up/down buttons) updating `position` and persisting.
- [ ] **Calendar CRUD Forms/Modals:** For creating and editing calendars (name, colorTheme).
- [ ] **Store Logic for Calendars:** `addCalendar`, `updateCalendar`, `deleteCalendar`, `reorderCalendars` functions operating on the local store.
#### 4.3. Habit Management UI/UX (Local, within Calendar Context)
- [ ] **Calendar Detail View** (when a calendar is selected/viewed):
    - [ ] Display habits for the selected calendar, filtered from the local `habits` store, sorted by `position`.
    - [ ] "Create New Habit" button/form within the context of the current calendar.
- [ ] **`HabitListItem` Component:**
    - [ ] Display name, type indicator (positive/negative), optional timer.
    - [ ] Buttons: "Edit", "Delete" (with confirmation), "Complete Habit".
    - [ ] Implement reordering within the calendar, updating `position` and persisting.
    - [ ] Display completion count for today (derived from `completions` store).
- [ ] **Habit CRUD Forms/Modals:** For creating/editing habits (name, type, timer, points, assigned calendar).
- [ ] **Store Logic for Habits:** `addHabit`, `updateHabit`, `deleteHabit`, `reorderHabits` functions operating on the local store.
#### 4.4. Completion Logging (Local)
- [ ] **"Complete Habit" Action:**
    - [ ] When clicked on a `HabitListItem`, call `addCompletion` store function.
- [ ] **Store Logic for Completions:** `addCompletion(habitId)` function:
    - [ ] Creates a new `Completion` object with `habitId` and `completedAt: Date.now()`.
    - [ ] Adds it to the `completions` store.
    - [ ] (Optional) For negative habits, "completion" might mean "marked as avoided" or "failed" depending on UX choice. Define this clearly.

---

### **Phase 5: Basic Cloud Sync & Data Migration**
*(This is the "Basic Cloud Sync" part from your original "Phase 4" plus data migration for newly authenticated users)*

**Goal:** Implement initial cloud synchronization for authenticated users (calendars, habits, completions) to Convex. Handle migration of local anonymous data to the cloud upon user login/signup.

**Tasks:**
#### 5.1. Convex Schema & Functions
- [ ] Finalize `calendars`, `habits`, `completions` table schemas in `convex/schema.ts`. Ensure they include `userId` (indexed), `clerkId` (if different from `userId`), timestamps (`_creationTime`, `updatedAt`), `position`, and all necessary fields. Consider soft deletes.
- [ ] Implement Convex mutations for CRUD operations (e.g., `createCalendar`, `updateHabit`, `logCompletion`, `deleteCalendarAndItsHabits`).
- [ ] Implement Convex queries to fetch user-specific data (e.g., `getCalendarsForUser`, `getHabitsByCalendar`, `getCompletionsForHabit`).
#### 5.2. Sync Logic Implementation
- [ ] **Initial Sync (Pull):** On app load for an authenticated user (or after login):
    - [ ] Fetch all relevant data (calendars, habits, completions) from Convex.
    - [ ] Strategy for merging/replacing local store data (e.g., server authoritative for first pull).
- [ ] **Ongoing Sync (Push):** After any local CUD operation (Create, Update, Delete) on calendars, habits, or completions:
    - [ ] If the user is authenticated, call the corresponding Convex mutation.
    - [ ] Handle Convex responses (success/failure). Consider optimistic updates in the UI.
- [ ] **Conflict Resolution (Basic):** Start with a simple strategy (e.g., last write wins based on an `updatedAt` timestamp, or server authoritative). More complex resolution can be future work.
#### 5.3. Anonymous Data Migration to Cloud
- [ ] When an anonymous user with existing local data (in `localStorage`) signs in or signs up for the first time:
    - [ ] Detect local data and authenticated status.
    - [ ] Prompt the user: "Sync your existing local data to your new account?"
    - [ ] If confirmed, iterate through local calendars, habits, and completions:
        - [ ] Call Convex mutations to create these items in the cloud, associating them with the now-authenticated `userId` / `clerkId`.
        - [ ] Handle potential duplicates if any rudimentary sync occurred before full migration logic.
        - [ ] After successful migration, local data can be cleared or marked as synced.
#### 5.4. UI Feedback for Sync
- [ ] Implement visual indicators for sync status (e.g., "Syncing...", "All changes saved", "Offline, changes will sync later").
- [ ] Provide a manual "Sync Now" option in settings, if desired.

---

### **Phase 6: Dashboard Implementation & Basic Visuals**

**Goal:** Create the main dashboard view displaying habit summaries, today's activity, and initial progress visualizations (charts).

**Tasks:**
- [ ] **Dashboard Layout & Structure (`/dashboard`):**
    - [ ] Design a user-friendly dashboard layout.
    - [ ] Display a welcome message, user stats overview.
- [ ] **"Today's Habits" Section:**
    - [ ] List habits scheduled or relevant for today.
    - [ ] Show completion status for each.
    - [ ] Quick actions (e.g., "Complete" button).
- [ ] **Habit Summary/Overview:**
    - [ ] Display overall progress metrics (e.g., total habits tracked, overall completion rate).
- [ ] **Basic Charts & Visualizations:**
    - [ ] Integrate a charting library (e.g., `chart.js` with a Svelte wrapper, or a native Svelte chart library).
    - [ ] Implement charts for:
        - [ ] Habit completion trends (e.g., completions per day/week for the last 30 days).
        - [ ] Points accumulation over time (if points are implemented in Phase 4/7).
        - [ ] Streaks overview (placeholder if streaks not yet implemented).
- [ ] **Recent Activity Feed:** A simple list of recently completed habits.

---

### **Phase 7: Gamification Core (Points & Streaks)**

**Goal:** Introduce core gamification elements: points system for habits and streak tracking.

**Tasks:**
- [ ] **Point System:**
    - [ ] If not already done: Modify `Habit` model (local and Convex) to include `pointValue` (positive or negative).
    - [ ] Update Habit CRUD forms to set point values.
    - [ ] When a habit is completed, update user's total points (locally and sync to Convex if applicable).
    - [ ] Display total points on the Dashboard and/or User Profile.
- [ ] **Streak System:**
    - [ ] Implement logic to calculate streaks for each habit (consecutive days of completion for positive habits, or non-completion for negative habits if designed that way).
        - [ ] This requires analyzing `completions` data. Store streak count on the `Habit` object or calculate dynamically.
    - [ ] Display current streak on `HabitListItem` components and on the Dashboard.
- [ ] **Gamification Feedback:**
    - [ ] Basic visual feedback for completing habits, earning points, or extending streaks (e.g., toasts, small animations).

---

### **Phase 8: Advanced Visualizations & Virtual Garden**

**Goal:** Enhance the dashboard with more advanced visualizations like the GitHub-style activity grid and implement the virtual garden feature.

**Tasks:**
- [ ] **GitHub-Style Activity Grid:**
    - [ ] Design and implement a component to display daily habit completion activity over a longer period (e.g., past year) similar to GitHub's contribution graph.
    - [ ] Each cell could represent a day, colored by completion intensity.
- [ ] **Virtual Garden Feature:**
    - [ ] **Concept Design:** Define how the virtual garden grows (e.g., based on total points, longest streak, number of habits consistently completed).
    - [ ] **Visuals:** Create or source simple plant/garden graphics (SVG or simple images).
    - [ ] **Implementation:**
        - [ ] Component to display the garden.
        - [ ] Logic to update the garden's state (e.g., plant growth stages) based on user progress.
        - [ ] Display the garden on the Dashboard or a dedicated section.
- [ ] **More Detailed Charts:**
    - [ ] Progress per habit (e.g., completion history for a specific habit).
    - [ ] Comparison charts (e.g., positive vs. negative habit trends).
    - [ ] Other insightful visualizations based on user data.

---

### **Phase 9: Data Portability & Final Polish**

**Goal:** Implement data import/export functionality, refine the entire UI/UX, and conduct thorough cross-platform testing.

**Tasks:**
- [ ] **Data Export Functionality (`/settings/data`):**
    - [ ] Allow users to export their data (calendars, habits, completions) in a user-friendly format (e.g., JSON).
    - [ ] Implement the export logic, ensuring all relevant data is included.
- [ ] **Data Import Functionality (`/settings/data`):**
    - [ ] Allow users to import data from a previously exported file.
    - [ ] Implement parsing logic and handle potential data conflicts or merging strategies (e.g., skip duplicates, overwrite, or merge).
- [ ] **UI/UX Polish:**
    - [ ] Conduct a full review of the application for UI consistency, clarity, and ease of use.
    - [ ] Refine animations, transitions, and visual feedback.
    - [ ] Improve error handling and user messages.
- [ ] **Performance Optimization:**
    - [ ] Profile the app and optimize any performance bottlenecks, especially with large datasets.
- [ ] **Accessibility (A11y) Review:**
    - [ ] Test with screen readers and keyboard navigation.
    - [ ] Ensure adequate color contrast and ARIA attributes where necessary.
- [ ] **Thorough Cross-Platform Testing:**
    - [ ] Test all features extensively on:
        - [ ] Web (various browsers)
        - [ ] Windows (Tauri app)
        - [ ] macOS (Tauri app)
        - [ ] Android (Tauri app)
        - [ ] iOS (Tauri app)
- [ ] **Documentation:**
    - [ ] Update README with final features and usage instructions.
    - [ ] Consider a simple user guide or FAQ if needed.
