# **Habistat - Implementation Plan**

First section:

---

## 💾 Prompts

I want to create a habit tracking web application called Habistat. The webapp should be responsive and have a beautiful and modern UI, which is minimalistic and has proper components, a proper color palette, and so on.

I already essentially finished implementing the following:

The basic frontpage with a visible-on-scroll 'More info' drawer button that has the copy ready for initial use.

Things that need some work:

Here's what I want to implement:

1. Dashboard:
   - I want to display a summary of the user's habits and progress.
   - Include a GitHub-style activity grid to show habit completion over time. (Deferred; just use charts for now)
   - Show charts and visualizations of the user's trends and progress.

2. Habit Management:
   - Allow users to create, edit, and delete habits.
   - Each habit should have a name, type (positive or negative), optional timer, and point value.
   - Implement a calendar view for habit tracking.

3. Calendar System:
   - Enable users to create multiple calendars with custom names and colors. (for categories)
   - Allow users to assign habits within these calendars.

4. Habit Tracking:
   - Provide a daily check-off system for habit completion. (call the action 'Complete')
   - Implement appropriate counters for each habit for the habit details page.
   - The Dashboard should display the activities, including the virtual garden on the side.
   - Calculate and display points earned for completed habits.

1. Gamification (Deferred; just use totals chart for that section):
   - Create a virtual garden that grows based on habit completion.
   - Implement a reward system tied to points and streaks.

6. User Preferences:
   - Add a page header and footer
   - Include light and dark mode options.
   - Implement multi-language support.

7. Data Management:
   - Allow users to import and export their habit data.
   - Implement an offline-first approach for data storage.

8. Optional Sync:
   - Provide an option for users to sync their data across devices.

Implementation Phases:

Phase 1: Core Functionality
- Implement the basic dashboard layout.
- Create the habit management system (CRUD operations).
- Develop the daily habit tracking mechanism.

Phase 2: Visual Enhancements
- Add the GitHub-style activity grid to the dashboard.
- Implement charts and visualizations for progress tracking.
- Design and integrate the virtual garden feature.

Phase 3: Advanced Features
- Develop the calendar system for organizing habits.
- Implement the gamification elements (points, rewards).
- Add user preferences (theme switching, language options).

Phase 4: Data Handling
- Create import/export functionality for habit data.
- Implement offline data storage.
- Develop optional sync feature for cross-device usage.

Each phase should be implemented iteratively, with visible outputs after each iteration. The focus should be on creating a functional and visually appealing frontend without concern for backend implementation details.


---

## Phase 1B: Platform Layout UI Improvements (Redesigned Dashboard/Settings)

Inspiration: T3.chat

- Make plan for step 1.5 (Offline-First & Static) of Phase 1A.
- I need to make auth optional while also ensuring that users receive clear feedback about their authentication status.
- Regularizing the theme and connectivity logic, ensuring synchronization between user settings and system defaults.
- Redesign Dashboard with Sidebar.

- [ ] Shadcn Sidebar
- [ ] Setting Subroutes for Account, Customization, History & Sync, Export / Import
- [ ] Curved Header Effect

---

## Phase 1A: Homepage & UI Foundation

**Goal:**

Establish a clean, multilingual, and minimalistic user interface foundation. Simplify the homepage to serve as a distraction-free landing screen, prepare language support, and streamline the header/footer components for future scalability.

**Tasks:**

### 1.1. Multilingual Support

- [x] Set up internationalization (i18n) with support for:
  - [x] **English (en)**
  - [x] **Spanish (es)**
  - [x] **Hebrew (he)**
- [x] Create or update translation files in `src/i18n/`:
  - [x] `en.json`
  - [x] `es.json`
  - [x] `he.json`
- [x] Implement language switching logic and UI (e.g., flag icons or dropdown)
- [x] Ensure language preference persists across sessions (localStorage or cookies)

### 1.2. Simplify Homepage

- [x] Redesign the homepage (`src/routes/+page.svelte`) to be minimal and clean
- [x] Remove header and footer from the homepage entirely
- [x] Display a simple welcome message, app logo, and language selector
- [x] Prepare homepage layout for future onboarding or intro content

### 1.3. Refactor Header & Footer

- [x] Simplify existing header (`app-header.svelte`) and footer (`app-footer.svelte`)
- [x] Reduce clutter: keep only essential navigation/actions
- [x] Ensure responsive design for desktop and mobile
- [x] Make header/footer hidden on the homepage but visible on other pages

### 1.4. Styling & Layout

- [x] Use **TailwindCSS** utility classes for consistent styling
- [x] Leverage **ShadCN-UI** components where appropriate
- [x] Maintain a clean, modern look with minimal distractions
- [x] Prepare base styles for easy extension in later phases

### 1.5. Offline-First & Static

- [ ] Ensure all UI changes work offline without backend dependencies
- [x] Avoid SSR or dynamic data fetching in this phase
- [x] Keep everything static and client-rendered

## ~~DONE: Phase 2: Activity Visualization & Session Info Display~~

(...)

---

## Phase 3: Auth Foundation & Sync Priming

**Goal:**

Integrate user authentication using Clerk (**now using `svelte-clerk` community library**) and set up the Convex backend to store user profiles, preparing for future data synchronization. Ensure basic auth flow works on Web and Tauri (Win/Android focus first).

**Tasks:**

### 3.1. Clerk Setup & Integration (SvelteKit Frontend with `svelte-clerk`)

- [x] Implement anonymous session store in `src/lib/utils/tracking.ts`:
  - [x] Generate and store a unique `anonymousId` in localStorage on first app load
  - [x] Track session creation timestamp and last modified date
- [x] Add functions to check if session is anonymous vs. associated
- [x] Create a Clerk application in the Clerk dashboard
- [x] Configure required OAuth providers (e.g., Google, GitHub) in the Clerk dashboard
- [x] Install `svelte-clerk`, `@clerk/clerk-js`, `@clerk/backend`, `@clerk/types`.
- [x] Configure Clerk environment variables (`VITE_PUBLIC_...` for client, `PUBLIC_...` & `CLERK_SECRET_KEY` for server) in `.env`.
- [x] Implement server hook (`src/hooks.server.ts`) using `@clerk/backend` `createClerkClient` and `authenticateRequest` to populate `event.locals.session`.
- [x] Update `src/app.d.ts` to include `session: RequestState` in `App.Locals`.
- [ ] ~~Deferred: Handles offline mode gracefully~~ (TODO)
- [x] Wrap the SvelteKit root layout (`src/routes/+layout.svelte`) with `<ClerkProvider>` from `svelte-clerk`.
- [x] Use `getContext` and `clerk.addListener` in layout/components (`+layout.svelte`, `session-info.svelte`) to reactively access user state (`clerk.user`).
- [x] Implement session association logic (`markSessionAssociated`) in `src/lib/utils/tracking.ts`, triggered by `$effect` in `+layout.svelte` reacting to user state changes.
- [x] Implement basic sign-in (`/sign-in/+page.svelte`) and sign-up (`/sign-up/+page.svelte`) routes using Clerk components (`<SignIn>`, `<SignUp>`) from `svelte-clerk`.
- [x] Add server-side load functions (`+page.server.ts`) to `/sign-in` and `/sign-up` routes to redirect authenticated users to `/dashboard`.
- [x] ~~Add server-side layout load function (`+layout.server.ts`) to `/dashboard` (and potentially other protected routes) to redirect unauthenticated users to `/sign-in`.~~ (Removed: Handled client-side in dashboard page)
- [ ] Add user profile button/menu (`<UserButton>`) to the main app layout, conditionally rendered (Consider using `{#if $user}` with context-derived store).
- [x] Update logout utility (`src/lib/utils/auth.ts`) to call `clerk.signOut()`.
- [x] Utilize Clerk user data (e.g., `clerk.user.id`, `clerk.user.primaryEmailAddress.emailAddress`) derived via context (using `readable` and `clerk.addListener`) to display user state in the UI (e.g., in `session-info.svelte`).

### 3.2. Convex Backend Setup

- [x] Install Convex CLI: `pnpm add convex`.
- [x] Initialize a Convex project within your monorepo or as a separate linked project: Run `npx convex dev` in the desired directory (e.g., a new `convex/` folder at the root) and follow the setup prompts. Link it to your Convex cloud account.
- [ ] Define the initial `users` table schema in `convex/schema.ts`. Include fields like `clerkId` (string, unique index), `email` (string), `name` (optional string), `avatarUrl` (optional string).
- [ ] Create a Convex mutation function (e.g., `convex/users.ts` -> `createOrUpdate`) that accepts user data (Clerk ID, email, name, avatar) and either creates a new user record or updates an existing one based on the `clerkId`.

### 3.3. Linking Clerk Auth to Convex User Creation (Webhook Approach)

- [ ] Configure a Clerk Webhook in the Clerk dashboard. Set it to trigger on `user.created` and `user.updated` events.
- [ ] Create a Convex HTTP Action endpoint in `convex/http.ts`. This function will serve as the target URL for the Clerk webhook.
- [ ] Implement the logic within the Convex HTTP Action:
  - [ ] Verify the incoming webhook request signature using your Clerk webhook signing secret (use `Webhook` helper from `convex/http`).
  - [ ] Parse the event payload (user data) from the verified request body.
  - [ ] Call the `createOrUpdate` Convex mutation (defined previously) using an internal context (`ctx.runMutation`) passing the relevant user details extracted from the webhook payload.
  - [ ] Ensure the HTTP action returns appropriate success/error responses to Clerk.
- [ ] Set the Convex HTTP Action endpoint URL (obtained via `npx convex dev` or dashboard) as the target URL for the webhook in the Clerk dashboard.

### 3.4. Tauri Specific Adjustments & Testing

- [ ] Review Tauri's `allowlist` in `src-tauri/tauri.conf.json` under `tauri > allowlist > http`. Ensure `scope` allows requests to your Convex backend URL and Clerk domains if direct calls are made. For OAuth, Clerk typically handles redirects, but ensure `protocol > assetScope` in `tauri.conf.json` is configured if you need to serve assets differently.
- [ ] Test the OAuth flow within the Tauri webview (Windows/Android):
  - [ ] Initiate sign-in with OAuth (e.g., Google) from within the Tauri app.
  - [ ] Verify that the Clerk redirect/popup flow completes successfully and the user session is established within the SvelteKit frontend running inside Tauri.
  - [ ] (Self-Correction/Note): Clerk's default web OAuth flow often works inside webviews without deep linking, as it opens the system browser or uses redirects that land back in the app's context via standard HTTP redirects. Explicit deep linking might only be needed for more complex native integrations, which we're avoiding for now. Focus on testing the standard web flow first.
- [ ] Ensure the user state (logged-in/logged-out, user info) persists correctly across app restarts within Tauri (Clerk SDK typically handles this via local storage/cookies within the webview).

### 3.5. UI/UX Refinements

- [ ] Style the Clerk components (`<SignIn>`, `<SignUp>`, `<UserButton>`) or your custom auth UI using `shadcn-svelte` themes and components for a consistent look and feel.
- [ ] Implement clear visual states (e.g., loading spinners during auth operations, distinct views for logged-in vs. logged-out users) in relevant parts of the UI.

### 3.6. Deferred to Later Phases

- [ ] **Data Synchronization:** Implementing the actual sync logic for habits, usage monitor data, etc., between local storage (offline-first) and the Convex backend tables.
- [ ] **Anonymous Data Migration:** Designing and implementing the flow for an anonymous user (with local data) to sign up/in and associate their existing local data with their new cloud account. This involves merging or uploading local data post-authentication.
- [ ] **Advanced Profile Management:** Features beyond displaying basic info from Clerk (e.g., user settings specific to Habistat stored in Convex).
- [ ] **Offline Sync Handling:** Robust conflict resolution strategies when synchronizing data that might have changed both locally and on the server while offline.
- [ ] **Platform-Specific OAuth Nuances:** Deeper investigation into custom URL schemes/deep linking for Tauri if the standard web flow proves insufficient on certain platforms or for specific OAuth providers.
- [ ] **Full iOS/macOS Support:** Dedicated testing and potential adjustments for Tauri OAuth flows on Apple platforms.

---

## Phase 4: Multi-Calendar/Habit Core & Basic Cloud Sync (Revised v2)

**Goal:**

Implement core functionality for managing multiple calendars (with customizable color themes) and multiple habits (that support both positive "Do" and negative "Don't Do" types of habits) within each calendar. Enable basic CRUD operations, reordering, and logging of timestamped completions locally first. Introduce foundational cloud sync for authenticated users to Convex.

**Inspiration:**

Draws on "Streak Calendar" structure, adapted for SvelteKit/Shadcn-Svelte, local-first, and considering two habit types (positive and negative).

**Tasks:**

### 1. Data Modeling & Local Persistence (SvelteKit Stores & Convex Schema)

- [ ] **Convex Schema:** Define/update `calendars`, `habits`, and `completions` tables in `convex/schema.ts`.
  - [ ] `calendars`: Include `userId` (indexed), `name` (string), `colorTheme` (string), `position` (number).
  - [ ] `habits`: Include `userId` (indexed), `calendarId` (indexed, `Id<"calendars">`), `name` (string), `timerDuration` (optional number), `position` (number).
  - [ ] `completions`: Include `userId` (indexed), `habitId` (`Id<"habits">`), `completedAt` (number, timestamp). Add a compound index on `userId` and `completedAt`.
- [ ] **TypeScript Interfaces:** Define `Calendar`, `Habit`, `Completion` interfaces in `src/lib/types/index.ts` mirroring the Convex schema, including `_id`, `_creationTime`.
- [ ] **Svelte Stores:** Create/update Svelte stores (`src/lib/stores/`) for `calendars`, `habits`, and `completions`.
  - [ ] Use `writable` stores.
  - [ ] Implement load logic: On app start, load data from `localStorage` into the stores.
  - [ ] Implement save logic: Subscribe to store changes and persist the entire store content to `localStorage` whenever it's updated.
  - [ ] Store data as arrays: `Writable<Calendar[]>`, `Writable<Habit[]>`, `Writable<Completion[]>`.

### 2. Calendar Management UI/UX (SvelteKit Frontend)

- [ ] **Calendar List View:** Create a main view (e.g., `/dashboard` or `/calendars`) displaying the list of calendars.
  - [ ] Fetch data _from the local `calendars` store_.
  - [ ] Sort calendars based on their `position` field before rendering.
  - [ ] Use `{#each}` to render `CalendarListItem` components (`src/lib/components/calendars/calendar-list-item.svelte`).
  - [ ] Add a "Create New Calendar" `Button` linking to `/calendars/new`.
- [ ] **`CalendarListItem` Component:**
  - [ ] Display calendar `name` and a visual indicator for `colorTheme`.
  - [ ] Include `Button`s for "Edit" (links to `/calendars/[id]/edit`), "Delete" (opens confirmation), and "View" (navigates to `/calendars/[id]`).
  - [ ] Add basic "Move Up" / "Move Down" buttons (for reordering).
- [ ] **Calendar CRUD Pages:** Create the following routes:
  - [ ] `/calendars/new` (`src/routes/calendars/new/+page.svelte`): New calendar creation form
  - [ ] `/calendars/[id]/edit` (`src/routes/calendars/[id]/edit/+page.svelte`): Edit existing calendar form
  - [ ] Both pages should:
    - [ ] Use `shadcn-svelte` `Form`, `Input` (for name), `Select` or custom component (for colorTheme)
    - [ ] Include validation and error handling
    - [ ] Redirect back to calendar list on success
- [ ] **Calendar Logic (Stores & Components):**
  - [ ] Implement `addCalendar`, `updateCalendar`, `deleteCalendar`, `moveCalendarUp/Down` functions in `src/lib/stores/calendars.ts`.
  - [ ] These functions must:
    - [ ] Modify the store's array data.
    - [ ] Recalculate `position` values for affected items (add = append, delete = shift up, move = swap/shift).
    - [ ] Trigger `localStorage` save implicitly via store update.
  - [ ] Connect form submissions to call these store functions.

### 3. Habit Management UI/UX (Within Calendar Context)

- [ ] **Calendar Detail View:** Create a route like `/calendars/[calendarId]` (or integrate into the main list view if preferred initially).
  - [ ] Fetch the specific calendar data from the `calendars` store.
  - [ ] Fetch habits associated with this `calendarId` using a `derived` store that filters the main `habits` store.
  - [ ] Display the calendar name/theme.
  - [ ] List associated habits, sorted by `position`, using `{#each}` and a `HabitListItem` component (`src/lib/components/habits/habit-list-item.svelte`).
  - [ ] Add a "Create New Habit" button linking to `/calendars/[calendarId]/habits/new`.
- [ ] **`HabitListItem` Component:**
  - [ ] Display habit `name` and potentially `timerDuration` indicator.
  - [ ] Include `Button`s for "Edit" (links to `/calendars/[calendarId]/habits/[id]/edit`), "Delete" (opens confirmation).
  - [ ] Add basic "Move Up" / "Move Down" buttons for reordering within the calendar list.
  - [ ] Add a "Log Completion (+)" button.
  - [ ] Display the count of completions for _today_ next to the habit name (use a `derived` store based on `completions` store).
- [ ] **Habit CRUD Pages:** Create the following routes:
  - [ ] `/calendars/[calendarId]/habits/new` (`src/routes/calendars/[calendarId]/habits/new/+page.svelte`): New habit creation form
  - [ ] `/calendars/[calendarId]/habits/[id]/edit` (`src/routes/calendars/[calendarId]/habits/[id]/edit/+page.svelte`): Edit existing habit form
  - [ ] Both pages should:
    - [ ] Use `shadcn-svelte` `Form`, `Input` (for name), optional `Input type=number` (for `timerDuration`)
    - [ ] Include validation and error handling
    - [ ] Redirect back to calendar detail view on success
- [ ] **Habit Logic (Stores & Components):**
  - [ ] Implement `addHabit`, `updateHabit`, `deleteHabit`, `moveHabitUp/Down` functions in `src/lib/stores/habits.ts`.
  - [ ] These functions must:
    - [ ] Modify the store's array data, ensuring `calendarId` is set correctly.
    - [ ] Recalculate `position` values _within the scope of the parent calendar_.
    - [ ] Trigger `localStorage` save.
  - [ ] Connect form submissions to call these store functions.

### 4. Completion Logging

- [ ] **Log Completion Logic:**
  - [ ] Implement `addCompletion` function in `src/lib/stores/completions.ts`.
  - [ ] Takes `habitId` as input.
  - [ ] Creates a new `Completion` object with the `habitId` and `completedAt: Date.now()`.
  - [ ] Adds the new completion object to the `completions`
