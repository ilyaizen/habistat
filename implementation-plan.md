# **Habistat - Implementation Plan**

## ~~DONE: Phase 1: Homepage & UI Foundation~~

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

- [x] Ensure all UI changes work offline without backend dependencies
- [x] Avoid SSR or dynamic data fetching in this phase
- [x] Keep everything static and client-rendered

---

## ~~DONE: Phase 2: Activity Visualization & Session Info Display~~

(...)

---

## Phase 3: Auth Foundation & Sync Priming

**Goal:**

Integrate user authentication using Clerk (including OAuth) and set up the Convex backend to store user profiles, preparing for future data synchronization. Ensure basic auth flow works on Web and Tauri (Win/Android focus first).

**Tasks:**

### 3.1. Clerk Setup & Integration (SvelteKit Frontend)

- [x] Implement anonymous session store in `src/lib/utils/tracking.ts`:
  - [x] Generate and store a unique `anonymousId` in localStorage on first app load
  - [x] Track session creation timestamp and last modified date
  - [x] Add functions to check if session is anonymous vs. claimed
- [x] Create a Clerk application in the Clerk dashboard
- [x] Configure required OAuth providers (e.g., Google, GitHub) in the Clerk dashboard
- [x] Install Clerk SvelteKit SDK: `pnpm add @clerk/sveltekit-clerk`
- [x] Configure Clerk environment variables in `.env`
- [x] Create a custom `ClerkWrapper` component that:
  - [x] Only loads Clerk when user explicitly initiates sign-in/sign-up
  - [ ] ~~Deferred: Handles offline mode gracefully~~ (TODO)
  - [ ] 👉 Manages the transition between anonymous and authenticated states:
	  - [ ] Simplify the whole "claim session" / sign-in/up process, the app flow should just get back authenticated and claimed to the dashboard, there is not supposed to be "pending" state. After authentication, make sure we are associated / migrated from the anonymous local-only session, we will later implement sync with Convex.
	  - [ ] App flow testing does not make sense, perhaps delete it.
- [x] Implement "Claim Session" button/flow:
  - [ ] Replace standard sign-up with "Claim Session" UI when in anonymous mode
  - [x] Hide claim button when already authenticated
  - [ ] Show regular profile menu when authenticated
- [x] Create session migration utilities:
  - [x] Functions to associate anonymous data with authenticated user
  - [ ] Conflict resolution strategy for merging data
  - [ ] Rollback capability if claiming fails
- [x] Wrap the SvelteKit root layout (`src/routes/+layout.svelte`) with the Clerk provider (`<ClerkProvider>`). You might need to adjust your root layout to handle potential SSR limitations if any arise, but Clerk's SDK is generally client-side friendly.
- [x] Implement basic sign-in and sign-up routes/components using Clerk's managed components (e.g., `<SignIn>`, `<SignUp>`) or build custom flows using Clerk hooks. Place these within your SvelteKit routing structure (e.g., `src/routes/sign-in/+page.svelte`).
- [ ] Add user profile button/menu (`<UserButton>`) to the main app layout (e.g., in a header component), conditionally rendered based on authentication state.
- [ ] Protect dashboard or authenticated-only routes using SvelteKit's layout load functions or Clerk's helpers to check authentication status and redirect if necessary.
- [ ] Utilize Clerk's SvelteKit utilities (e.g., accessing session/user data via `$page.data.session` or Clerk's specific stores/hooks) to manage and display user state (ID, name, email, avatar) within the application UI.

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
- [ ] **Anonymous Data Migration:** Designing and implementing the flow for an anonymous user (with local data) to sign up/in and associate ("claim") their existing local data with their new cloud account. This involves merging or uploading local data post-authentication.
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
  - [ ] Add a "Create New Calendar" `Button` triggering a dialog.
- [ ] **`CalendarListItem` Component:**
  - [ ] Display calendar `name` and a visual indicator for `colorTheme`.
  - [ ] Include `Button`s for "Edit" (opens dialog), "Delete" (opens confirmation), and potentially "View" (navigates to `/[calendarId]`).
  - [ ] Add basic "Move Up" / "Move Down" buttons (for reordering).
- [ ] **Calendar CRUD Dialog:** Create a reusable `CalendarDialog` component (`src/lib/components/calendars/calendar-dialog.svelte`).
  - [ ] Use `shadcn-svelte` `Dialog`, `Input` (for name), `Select` or custom component (for colorTheme).
  - [ ] Handle both "Create" and "Edit" modes. On Edit, pre-fill with existing data.
- [ ] **Calendar Logic (Stores & Components):**
  - [ ] Implement `addCalendar`, `updateCalendar`, `deleteCalendar`, `moveCalendarUp/Down` functions in `src/lib/stores/calendars.ts`.
  - [ ] These functions must:
    - [ ] Modify the store's array data.
    - [ ] Recalculate `position` values for affected items (add = append, delete = shift up, move = swap/shift).
    - [ ] Trigger `localStorage` save implicitly via store update.
  - [ ] Connect UI buttons/dialogs to call these store functions.

### 3. Habit Management UI/UX (Within Calendar Context)

- [ ] **Calendar Detail View:** Create a route like `/calendars/[calendarId]` (or integrate into the main list view if preferred initially).
  - [ ] Fetch the specific calendar data from the `calendars` store.
  - [ ] Fetch habits associated with this `calendarId` using a `derived` store that filters the main `habits` store.
  - [ ] Display the calendar name/theme.
  - [ ] List associated habits, sorted by `position`, using `{#each}` and a `HabitListItem` component (`src/lib/components/habits/habit-list-item.svelte`).
  - [ ] Add a "Create New Habit" button (scoped to the current calendar) triggering a dialog.
- [ ] **`HabitListItem` Component:**
  - [ ] Display habit `name` and potentially `timerDuration` indicator.
  - [ ] Include `Button`s for "Edit" (opens dialog), "Delete" (opens confirmation).
  - [ ] Add basic "Move Up" / "Move Down" buttons for reordering within the calendar list.
  - [ ] Add a "Log Completion (+)" button.
  - [ ] Display the count of completions for _today_ next to the habit name (use a `derived` store based on `completions` store).
- [ ] **Habit CRUD Dialog:** Create a reusable `HabitDialog` component (`src/lib/components/habits/habit-dialog.svelte`).
  - [ ] Use `shadcn-svelte` `Dialog`, `Input` (for name), optional `Input type=number` (for `timerDuration`).
  - [ ] Handle both "Create" and "Edit" modes. Needs the `calendarId` context.
- [ ] **Habit Logic (Stores & Components):**
  - [ ] Implement `addHabit`, `updateHabit`, `deleteHabit`, `moveHabitUp/Down` functions in `src/lib/stores/habits.ts`.
  - [ ] These functions must:
    - [ ] Modify the store's array data, ensuring `calendarId` is set correctly.
    - [ ] Recalculate `position` values _within the scope of the parent calendar_.
    - [ ] Trigger `localStorage` save.
  - [ ] Connect UI buttons/dialogs to call these store functions.

### 4. Completion Logging

- [ ] **Log Completion Logic:**
  - [ ] Implement `addCompletion` function in `src/lib/stores/completions.ts`.
  - [ ] Takes `habitId` as input.
  - [ ] Creates a new `Completion` object with the `habitId` and `completedAt: Date.now()`.
  - [ ] Adds the new completion object to the `completions`
