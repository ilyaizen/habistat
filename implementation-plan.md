# **Habistat - Implementation Plan**

- Read `@initial-implementation-plan.md` and understand the required tasks.

### **Phase 1: UI Foundation & Static Content**

**Goal**: Establish a clean, multilingual, and minimalistic user interface foundation. Simplify the homepage, prepare language support, and streamline header/footer components.

**Tasks**:

- **1.1. Multilingual Support**:
    - [x] Set up internationalization (i18n) with support for: English (en), Spanish (es), Hebrew (he).
    - [x] Create or update translation files in `src/i18n/`.
    - [x] Implement language switching logic and UI.
    - [x] Ensure language preference persists across sessions.
- **1.2. Simplify Homepage**:
    - [x] Redesign the homepage (`src/routes/+page.svelte`) to be minimal and clean.
    - [x] Remove header and footer from the homepage.
    - [x] Display a simple welcome message, app logo, and language selector.
- **1.3. Refactor Header & Footer**:
    - [x] Simplify existing header (`app-header.svelte`) and footer (`app-footer.svelte`).
    - [x] Reduce clutter: keep only essential navigation/actions.
    - [x] Ensure responsive design.
    - [x] Make header/footer hidden on the homepage but visible on other pages.
- **1.4. Styling & Layout**:
    - [x] Use **TailwindCSS** for consistent styling.
    - [x] Leverage **shadcn-svelte** components.
    - [x] Maintain a clean, modern look.
- **1.5. Offline-First & Static**:
    - [x] Ensure all UI changes work offline without backend dependencies (initial static setup).
    - [x] Avoid SSR or dynamic data fetching in this phase.

---

### **Phase 2: App Structure & Settings Shell**

**Goal**: Define the overall app navigation, implement the settings page structure, and design the UX for optional authentication and offline-first status.

**Tasks**:

- [x] **Main Navigation**:
    - [x] Design and implement the primary navigation structure (Dashboard, Calendars, Stats, Settings).
    - [x] Create placeholder Svelte components/pages for these main sections.
- [x] **Settings Page Structure**:
    - [x] Implement the main `/settings` page and layout.
    - [x] Create sub-routes and placeholder pages for: Account, Customization, Sync, and Data.
- [x] **User Preferences - Customization**:
    - [x] Implement Light/Dark mode switching.
    - [x] Ensure theme preference persists.
- [x] **Offline-First & Auth UX**:
    - [x] Refine and document the strategy for offline data handling.
    - [x] Design and implement UI elements to communicate authentication and sync status.
- [x] **Responsive Layout**: Ensure the main app structure and settings pages are responsive.

---

### **Phase 3: Authentication & User Profile**

**Goal**: Integrate user authentication using Clerk and `svelte-clerk`, set up the Convex backend to store user profiles, and ensure the basic auth flow works on the Web and Tauri.

**Tasks**:

- [ ] **3.1. Clerk Setup & Integration**:
    - [ ] Finalize reactive user state handling in layouts/components using `clerk.user`.
    - [ ] Test and confirm redirection logic for authenticated/unauthenticated users.
- [ ] **3.2. Convex Backend Setup**:
    - [ ] Confirm `users` table schema in `convex/schema.ts` includes `clerkId` (unique index), `email`, `name`, `avatarUrl`.
- [ ] **3.3. Link Clerk Auth to Convex (Webhook)**:
    - [ ] Complete Clerk webhook configuration and the Convex HTTP Action to handle user creation/updates.
- [ ] **3.4. Tauri Specific Adjustments**:
    - [ ] Ensure `allowlist` for HTTP requests is correct in `tauri.conf.json`.
    - [ ] Test OAuth flow in Tauri webview on Windows/Android.
- [ ] **3.5. Auth UI/UX Refinements**:
    - [ ] Ensure Clerk components are styled consistently and handle loading/error states.

---

### **Phase 4: Local-First Core: Calendars & Habits**

**Goal**: Implement full local CRUD operations for calendars and habits, including types and timers, and log completions. All data will persist locally using Svelte stores and `localStorage`.

**Tasks**:

- [ ] **4.1. Data Modeling & Local Persistence (Svelte Stores)**:
    - [ ] Define `Calendar`, `Habit`, `Completion` TypeScript interfaces.
    - [ ] Create Svelte `writable` stores for `calendars`, `habits`, and `completions`.
    - [ ] Implement store logic to load from and persist to `localStorage`.
- [ ] **4.2. Calendar Management UI/UX (Local)**:
    - [ ] Create a `Calendar List View` to display, create, edit, delete, and reorder calendars from the local store.
- [ ] **4.3. Habit Management UI/UX (Local)**:
    - [ ] In the `Calendar Detail View`, manage habits associated with a calendar.
    - [ ] Implement local CRUD and reordering for habits.
- [ ] **4.4. Completion Logging (Local)**:
    - [ ] Implement the "Complete Habit" action to log a new `Completion` object to the local store.

---

### **Phase 5: Basic Cloud Sync & Data Migration**

**Goal**: Implement initial cloud synchronization for authenticated users to Convex and handle the migration of local anonymous data to the cloud upon login.

**Tasks**:

- [ ] **5.1. Convex Schema & Functions**:
    - [ ] Finalize `calendars`, `habits`, `completions` table schemas in `convex/schema.ts`.
    - [ ] Implement Convex mutations for CRUD operations.
    - [ ] Implement Convex queries to fetch user-specific data.
- [ ] **5.2. Sync Logic Implementation**:
    - [ ] **Initial Sync (Pull)**: On app load for an authenticated user, fetch all data from Convex and merge with the local store.
    - [ ] **Ongoing Sync (Push)**: After any local CUD operation, call the corresponding Convex mutation if the user is authenticated.
- [ ] **5.3. Anonymous Data Migration**:
    - [ ] On first sign-in, prompt the user to sync local data.
    - [ ] If confirmed, call Convex mutations to create the items in the cloud.
- [ ] **5.4. UI Feedback for Sync**:
    - [ ] Implement visual indicators for sync status (e.g., "Syncing...", "All changes saved").

---

### **Phase 6: Dashboard Implementation & Basic Visuals**

**Goal**: Create the main dashboard view, displaying habit summaries, today's activity, and initial progress visualizations.

**Tasks**:

- [ ] **6.1. Dashboard Layout**:
    - [ ] Design a user-friendly dashboard layout.
    - [ ] Display a "Today's Habits" section with quick actions.
- [ ] **6.2. Basic Charts**:
    - [ ] Integrate a charting library.
    - [ ] Implement charts for habit completion trends.
- [ ] **6.3. Recent Activity**:
    - [ ] Add a simple feed of recently completed habits.

---

### **Phase 7: Gamification Core (Points & Streaks)**

**Goal**: Introduce core gamification elements like a points system and streak tracking.

**Tasks**:

- [ ] **7.1. Point System**:
    - [ ] Modify the `Habit` model to include `pointValue`.
    - [ ] Update the user's total points upon habit completion.
- [ ] **7.2. Streak System**:
    - [ ] Implement logic to calculate and display streaks for each habit.
- [ ] **7.3. Gamification Feedback**:
    - [ ] Add basic visual feedback for earning points and extending streaks.

---

### **Phase 8: Advanced Visualizations & Virtual Garden**

**Goal**: Enhance the dashboard with advanced visualizations like an activity grid and a virtual garden.

**Tasks**:

- [ ] **8.1. GitHub-Style Activity Grid**:
    - [ ] Implement a component to display daily habit completion activity over a longer period.
- [ ] **8.2. Virtual Garden**:
    - [ ] Design the concept and visuals for the garden.
    - [ ] Implement logic to update the garden's state based on user progress.

---

### **Phase 9: Data Portability & Final Polish**

**Goal**: Implement data import/export functionality, refine the UI/UX, and conduct thorough cross-platform testing.

**Tasks**:

- [ ] **9.1. Data Export/Import**:
    - [ ] Allow users to export and import their data in JSON format.
- [ ] **9.2. UI/UX Polish**:
    - [ ] Conduct a full review of the application for consistency and ease of use.
    - [ ] Refine animations and transitions.
- [ ] **9.3. Performance & Accessibility**:
    - [ ] Profile and optimize performance.
    - [ ] Conduct an accessibility review.
- [ ] **9.4. Cross-Platform Testing**:
    - [ ] Test all features extensively on Web, Windows, macOS, Android, and iOS.
- [ ] **9.5. Documentation**:
    - [ ] Update the `README.md` with final features and instructions.