# **Habistat - Implementation Plan**

## Phase 0: Implement Now

I'm implementing Phase 3 of the Habistat app's offline-first authentication with Clerk and Svelte 5 and authentication flow. We need to address:

Okay, let's break down the current state of Habistat, specifically focusing on the authentication flow issues you've encountered and how to fix them, based on the provided files and your implementation plan.

**Current State & Issue Analysis**

You're implementing Phase 3, focusing on Clerk authentication and integrating it into the SvelteKit/Tauri structure with an offline-first approach. The key issue is the confusing sign-in flow ("Sign In to Sync Data" -> "Complete Sign In" loop) and the goal to link the anonymous session data.

Based on the code:

1. **Server Hook is Disabled:** In `src/hooks.server.ts`, the `clerkHandle` is commented out (`export const handle: Handle = baseHandle;`). This is the _most likely cause_ of your sign-in redirect issues. Clerk's SvelteKit SDK relies heavily on this server hook to intercept requests on authentication routes (`/sign-in`, `/sign-up`, `/sso-callback`), handle redirects, and make the auth state available via `event.locals.auth`. Without it, Clerk's flow will break, leading to loops or incomplete sessions.
2. **Client-side History Patch:** `src/app.html` contains a critical `script` tag that explicitly overrides `history.pushState` and `history.replaceState` to _block_ calls originating from "clerk". This patch is highly likely to interfere with Clerk's internal navigation and state management, which relies on manipulating browser history during the authentication flow. This should be removed or carefully re-evaluated.
3. **ClerkProvider & Wrapper Complexity:** The root layout (`src/routes/+layout.svelte`) wraps the `children()` inside a `<ClerkWrapper>`, which _then_ wraps the `children()` again inside `<ClerkProvider>`. This nested and conditional wrapping of `ClerkProvider` (`{#if browser} <ClerkProvider> ... </ClerkProvider> {/if}`) might cause issues. Svelte-Clerk typically expects the `ClerkProvider` to wrap the main application content _unconditionally_ at the root layout level in the browser environment, providing context for all Clerk components and hooks. Lazy-loading the _Provider_ itself can break this context. The intention might be to avoid loading Clerk SDK code when strictly offline/anonymous, but the current implementation seems overly complex and fragile for Clerk's standard flow, especially when dealing with redirects.
4. **State Management Mix:** You're using Clerk's Svelte components (`SignedIn`, `SignedOut`, etc.) which derive state from Clerk's SDK (via the `ClerkProvider` context), _and_ custom session state in `src/lib/utils/tracking.ts` (`isAnonymous`, `isClaimed`, `getSessionState`). While the custom state is crucial for the offline-first anonymous aspect, mixing it directly with Clerk's state derivation in components like `ClerkWrapper` can lead to confusion and race conditions, particularly around the transition from anonymous to authenticated.
5. **URL Cleaning Logic:** The manual `cleanClerkParams` and `cleanCurrentUrl` in `ClerkWrapper` attempt to remove Clerk parameters from the URL. While cleaning the URL after a successful sign-in is good, this logic might run _before_ Clerk has had a chance to process those parameters, interrupting its flow. Clerk's SDK usually handles cleaning these parameters itself.

**Proposed Fixes (Addressing the Sign-In Loop and Core Integration)**

Here's a plan to address these issues and fix the authentication flow:

**Step 1: Re-enable Clerk Server Hook (High Priority)**

This is the most critical step for SvelteKit integration.

- **Action:** Uncomment the `handleClerk` in `src/hooks.server.ts`.
- **Code Change (`src/hooks.server.ts`):**

```typescript
import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { dev } from "$app/environment";
import { handleClerk } from "clerk-sveltekit/server";
import { CLERK_SECRET_KEY } from "$env/static/private";

// Create a base handle that always works
const baseHandle: Handle = async ({ event, resolve }) => {
  // Add any custom server-side logic here BEFORE Clerk handles it
  // e.g., checking for offline status based on headers if applicable

  return await resolve(event);
};

// Configure Clerk handle
const clerkHandle = handleClerk(CLERK_SECRET_KEY, {
  debug: dev,
  // Define paths Clerk should *not* protect or process auth for
  // Leave empty if Clerk should manage auth on all non-auth paths by default
  protectedPaths: [], // You can add paths like ['/dashboard'] later if needed
  // Define paths Clerk should ignore entirely (e.g., API endpoints not handled by Clerk)
  ignoredPaths: ["/api/"], // Example: if you have custom API endpoints
  signInUrl: "/sign-in", // Ensure this matches your sign-in route
  signUpUrl: "/sign-up" // Ensure this matches your sign-up route
});

// Add type declarations for locals
declare global {
  namespace App {
    interface Locals {
      auth: import("clerk-sveltekit/server").Auth; // Provides userId, sessionId, getToken
      isAuthenticated?: boolean; // Your custom flag, potentially derived from auth
      isOffline?: boolean; // Your custom flag
    }
  }
}

// Sequence the handles: baseHandle runs first, then clerkHandle
// Clerk needs to run AFTER any base logic but BEFORE SvelteKit resolves the page
export const handle: Handle = sequence(baseHandle, clerkHandle); // <-- Enable Clerk handle
```

- **Explanation:** Re-enabling `handleClerk` allows Clerk's middleware to properly process requests, especially those involving redirects from the OAuth flow. It also makes `event.locals.auth` available for server-side checks if you implement them later (though your current setup avoids SSR dependence).

**Step 2: Remove Client-side History Patch (High Priority)**

This patch directly interferes with Clerk's navigation.

- **Action:** Delete or comment out the `<script>` block in `src/app.html` that overrides `history.pushState` and `history.replaceState`.
- **Code Change (`src/app.html` - DELETE/COMMENT OUT THIS BLOCK):**

```html
<!-- Critical fix for Clerk/SvelteKit integration issues -->
<!-- This block should likely be removed as it interferes with Clerk's navigation -->
<!--
    <script>
      (function () {
        // Ensure this runs as early as possible
        if (typeof window !== "undefined") {
          console.log("Applying Clerk compatibility patches");

          // Store original methods
          const originalPushState = history.pushState;
          const originalReplaceState = history.replaceState;

          // Override history.pushState to block Clerk calls
          history.pushState = function (...args) {
            try {
              const stack = new Error().stack || "";
              const isClerkCall =
                stack.includes("clerk") ||
                (args[2] &&
                  typeof args[2] === "string" &&
                  (args[2].includes("__clerk") || args[2].includes("clerk")));

              if (isClerkCall) {
                console.log("Blocked Clerk pushState call:", args[2]);
                return;
              }
            } catch (e) {
              console.error("Error in pushState override:", e);
            }

            // For non-Clerk calls, use the original method
            return originalPushState.apply(history, args);
          };

          // Override history.replaceState to block Clerk calls
          history.replaceState = function (...args) {
            try {
              const stack = new Error().stack || "";
              const isClerkCall =
                stack.includes("clerk") ||
                (args[2] &&
                  typeof args[2] === "string" &&
                  (args[2].includes("__clerk") || args[2].includes("clerk")));

              if (isClerkCall) {
                console.log("Blocked Clerk replaceState call:", args[2]);
                return;
              }
            } catch (e) {
              console.error("Error in replaceState override:", e);
            }

            // For non-Clerk calls, use the original method
            return originalReplaceState.apply(history, args);
          };

          // Store a flag in window to indicate we've applied the patch
          window.__clerkPatchApplied = true;
        }
      })();
    </script>
    -->
```

- **Explanation:** Clerk needs to use history API calls to manage redirects and process callback parameters after authentication flows (like OAuth). Blocking these calls prevents Clerk from completing its process.

**Step 3: Simplify ClerkProvider & Wrapper Usage (High Priority)**

The `<ClerkProvider>` needs to be consistently available to its children components when running in the browser.

- **Action:**
  - Remove the nested `<ClerkProvider>` and the `loadClerk` logic from `ClerkWrapper.svelte`.
  - Move the `<ClerkProvider>` up to `+layout.svelte` and wrap the main content div _conditionally on `browser`_.
  - Refactor `ClerkWrapper` to be simpler, maybe just handling the `initiateAuth` logic or becoming a regular component that checks Clerk's state using Svelte-Clerk's `user` store (`import { user } from 'svelte-clerk'`).
  - Remove manual URL cleaning from `ClerkWrapper` and `SignedInWrapper`. Clerk should handle this.
- **Code Change (`src/routes/+layout.svelte`):**

```svelte
<script lang="ts">
  // ... existing imports (keep onMount, setContext, get, writable, theme, resetMode, setMode, waitLocale, initializeTracking, goto)
  import { ClerkProvider } from "svelte-clerk"; // Keep ClerkProvider import
  // import ClerkWrapper from "$lib/components/auth/clerk-wrapper.svelte"; // <-- Remove this import
  import MotionWrapper from "$lib/components/motion-wrapper.svelte"; // Keep MotionWrapper import
  import {
    getSessionState,
    markSessionAuthInitiated,
    isSessionMigrated
  } from "$lib/utils/tracking"; // Keep tracking imports

  import "../app.css";

  import AppHeader from "$lib/components/app-header.svelte";
  import AppFooter from "$lib/components/app-footer.svelte";
  import { browser } from "$app/environment";
  import { page } from "$app/stores"; // Import page store

  // Props from parent component using Svelte 5 syntax
  let { children } = $props();

  // Hide header/footer on the landing page (/)
  // Derive from page store for reactivity
  let showHeaderFooter = $derived(() => $page.url.pathname !== "/"); // <-- Use derived

  // Stores for managing authentication and connectivity state
  const authMode = writable<"offline" | "online">("offline");
  const isOnline = writable(true);

  setContext("authMode", authMode);
  setContext("isOnline", isOnline);

  // State for tracking initialization progress
  // Simpler state, let Clerk handle its own loading
  let i18nReady = $state(false);
  let trackingInitialized = $state(false);

  // Theme management (Keep existing theme logic: applySystemTheme, setupSystemListener, cleanupSystemListener, selectTheme)
  let media: MediaQueryList | null = null;
  let systemListener: (() => void) | null = null;

  // ... applySystemTheme, setupSystemListener, cleanupSystemListener, selectTheme functions ...

  /**
   * Updates online/offline status and auth mode based on network connectivity
   */
  function updateOnlineStatus() {
    const online = navigator.onLine;
    isOnline.set(online);
    authMode.set(online ? "online" : "offline");
  }

  // Removed handleInitiateAuth as ClerkWrapper will be simplified or removed

  /**
   * Initializes the application core setup:
   * - Theme configuration
   * - Analytics tracking
   * - Online/offline detection
   * - Internationalization
   */
  async function initializeAppCore() {
    if (!browser) return;

    try {
      // Initialize theme
      const currentTheme = get(theme);
      selectTheme(currentTheme);

      // Initialize tracking (moved out of +layout.ts load function to ensure client-side)
      initializeTracking();
      trackingInitialized = true;

      // Set up online/offline handlers
      window.addEventListener("online", updateOnlineStatus);
      window.addEventListener("offline", updateOnlineStatus);

      // Initial online status check
      updateOnlineStatus();

      // Initialize i18n
      try {
        await waitLocale();
      } catch (error) {
        console.error("Error initializing i18n:", error);
      }
      i18nReady = true;

      console.log("+layout.svelte: App core initialized");
    } catch (error) {
      console.error("Error during core initialization:", error);
      // Still mark as initialized to prevent getting stuck
      trackingInitialized = true;
      i18nReady = true;
    }
  }

  onMount(() => {
    initializeAppCore();

    // No need for safety timeout if i18n and tracking initialization are handled robustly
    // Removed safety timeout

    // Cleanup function to remove event listeners and theme watchers
    return () => {
      if (browser) {
        window.removeEventListener("online", updateOnlineStatus);
        window.removeEventListener("offline", updateOnlineStatus);
      }
      cleanupSystemListener();
    };
  });

  // No need for handleClerkNavigation, SvelteKit/Clerk handle redirects
</script>

<!-- Loading state while i18n initializes -->
<!-- Added trackingInitialized check -->
{#if !i18nReady || !trackingInitialized}
  <div class="flex min-h-screen items-center justify-center">
    <p>Loading...</p>
  </div>
{:else}
  <!-- Wrap main content with ClerkProvider -->
  <!-- ClerkProvider must be in the browser environment -->
  {#if browser}
    <ClerkProvider
      publishableKey={import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""}
      appearance={{
        layout: {
          logoPlacement: "inside",
          showOptionalFields: true,
          socialButtonsVariant: "iconButton"
        },
        variables: {
          colorPrimary: "rgb(59, 130, 246)"
        }
      }}
    >
      <div class="flex min-h-screen flex-col">
        <!-- Conditional header rendering -->
        {#if showHeaderFooter}
          <AppHeader />
        {/if}
        <main class="flex-1">
          <!-- Offline status notification -->
          {#if !$isOnline && $authMode === "online"}
            <div class="container mx-auto flex items-center justify-center p-4">
              <p class="text-muted-foreground text-sm">
                You are offline. Your data will be stored locally.
              </p>
            </div>
          {/if}
          <!-- Apply motion wrapper around the content but not the header/footer -->
          <MotionWrapper>
            <!-- Render child components directly -->
            {@render children()}
          </MotionWrapper>
        </main>
        <!-- Conditional footer rendering -->
        {#if showHeaderFooter}
          <AppFooter />
        {/if}
      </div>
    </ClerkProvider>
  {:else}
    <!-- Server-side rendering fallback -->
    <div class="flex min-h-screen flex-col">
      <!-- Conditional header rendering -->
      {#if showHeaderFooter}
        <AppHeader />
      {/if}
      <main class="flex-1">
        <!-- Motion wrapper (will be skipped server-side) -->
        <MotionWrapper>
          {@render children()}
        </MotionWrapper>
      </main>
      <!-- Conditional footer rendering -->
      {#if showHeaderFooter}
        <AppFooter />
      {/if}
    </div>
  {/if}
{/if}
```

- **Code Change (`src/lib/components/auth/clerk-wrapper.svelte` - SIMPLIFIED OR REMOVE):** The `ClerkWrapper`'s logic of conditionally rendering `<ClerkProvider>` is problematic. It's better to remove this component or refactor it significantly. If you want to show different content based on whether auth is "possible" (online) or "needed" (user clicks sign-in), you can do this with state in the page or layout, and use Clerk's `SignedIn`/`SignedOut` components or the `user` store.
  - **Recommendation:** For now, delete `clerk-wrapper.svelte` and use `SignedIn`/`SignedOut` directly in your pages (`+page.svelte`, `/dashboard/+page.svelte`) or in the main layout if you want global auth-dependent UI. The `handleInitiateAuth` function seems to serve a purpose related to showing the sign-in UI; this logic should be moved to where the sign-in button is rendered (e.g., the dashboard page).
  - If you decide to keep a wrapper, it should _not_ contain `<ClerkProvider>`. Its role might be to decide _whether_ to show UI that _initiates_ Clerk flows (like the "Claim Session" card) or to wrap components that _use_ Clerk's state, handling edge cases like offline mode.
- **Code Change (`src/lib/components/auth/signed-in-wrapper.svelte` - Keep but Simplify URL Clean):** The logic to mark the session as claimed is important for your offline state. The URL cleaning inside it should be removed as Clerk handles this. The use of `MutationObserver` might be a workaround for the previous `ClerkWrapper`'s lazy loading; it might not be necessary once the Provider is always present. Relying on Clerk's `user` store reactivity might be sufficient.

```svelte
<!-- src/lib/components/auth/signed-in-wrapper.svelte -->
<script lang="ts">
  import { SignedIn, user } from "svelte-clerk"; // Import user store
  import { onMount } from "svelte";
  import { markSessionClaimed, isSessionClaimed } from "$lib/utils/tracking";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";

  const { children } = $props<{
    children: () => unknown;
  }>();

  // Reactively mark session as claimed when Clerk user state becomes available and not already claimed
  $effect(() => {
    if (browser && $user && $user.id && !isSessionClaimed()) {
      markSessionClaimed();
      console.log("Clerk user detected, session marked as claimed locally");
    }
  });

  // URL cleaning logic removed - Clerk should handle this post-auth

  // Remove the onMount logic with MutationObserver as it's likely no longer needed
  // once ClerkProvider is always present and we use reactive user store.
</script>

<!-- Simple wrapper around SignedIn component -->
<SignedIn>
  {@render children()}
</SignedIn>
```

- **Explanation:** Placing `ClerkProvider` higher up ensures that Clerk's context is available to all descendant components in the browser. Refactoring/removing the complex `ClerkWrapper` and removing the manual URL cleaning allows Clerk's SDK to manage the authentication flow and redirects as designed. Using Svelte 5's `$effect` with Clerk's `$user` store is a reactive way to trigger your local `markSessionClaimed` logic once Clerk has successfully authenticated the user.

**Step 4: Adjust Pages Using Clerk Components**

Update pages like `/sign-in` and `/dashboard` to use `SignedIn`/`SignedOut` directly or handle the auth state based on `$page.data.session` or Clerk's stores/hooks.

- **Code Change (`src/routes/sign-in/+page.svelte`):** Ensure `routing="path"` is correct and remove any custom logic that might interfere.

```svelte
<!-- src/routes/sign-in/+page.svelte -->
<script lang="ts">
  import { SignIn } from "svelte-clerk";
  import { page } from "$app/stores";

  // Ensure path prop uses the dynamic lang parameter
  const currentPath = $derived(() => `/${$page.params.lang}/sign-in`);
</script>

<div class="container mx-auto flex min-h-screen items-center justify-center">
  <!-- Use the derived path -->
  <SignIn routing="path" path={currentPath} />
</div>
```

- **Code Change (`src/routes/dashboard/+page.svelte`):** The "Claim Session" card logic should likely be conditionally displayed based on your local session state (`isSessionClaimed()`) and potentially Clerk's state (`$user` or `$page.data.session`) rather than relying on `ClerkWrapper`.

```svelte
<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
  // ... existing imports (keep onMount, anonymousUserId, logAppOpenIfNeeded, getAppOpenHistory, hasExistingSession, isSessionMigrated, SESSION_USER_ID_KEY, goto, ActivityMonitor, Alert, Card, _, getContext, writable, browser, page)
  import { user as clerkUser } from "svelte-clerk"; // Import Clerk user store
  import { getSessionState } from "$lib/utils/tracking"; // Import getSessionState

  // ... existing state variables (currentUserId, activeDates, fetchError, earliestActivityDate, loadingState, authChecked, retryCount, maxRetries)

  // Get auth mode and online status from context (keep)
  const authMode = getContext<Writable<"offline" | "online">>("authMode");
  const isOnline = getContext<Writable<boolean>>("isOnline");

  // Function to format date (keep)
  function formatDate(date: Date): string {
    /* ... */
  }

  onMount(() => {
    if (browser) {
      // Initial check and data load
      loadData();

      // React to Clerk user changes to update state and potentially trigger data load
      const unsubscribeClerk = clerkUser.subscribe(($user) => {
        console.log("Clerk user subscription update:", !!$user);
        // If a Clerk user becomes available and we haven't checked auth yet
        if ($user && !authChecked) {
          loadData(); // Re-evaluate session and load data
        }
      });

      // Cleanup subscription
      return () => unsubscribeClerk();
    }
  });

  function loadData() {
    if (!browser) return;
    if (retryCount >= maxRetries) {
      console.error("Max retries reached for loading dashboard data");
      fetchError = $_("errors.dashboard_load"); // Assuming you add this translation
      loadingState = false;
      return;
    }

    loadingState = true;
    authChecked = true; // Mark that we've attempted to check auth

    // Determine user ID: Prefer Clerk ID if available and session is claimed, else use anonymous ID
    const sessionState = getSessionState();
    let userId: string | null = null;

    if (sessionState === "claimed" && $clerkUser?.id) {
      userId = $clerkUser.id;
      console.log("Using claimed Clerk user ID:", userId);
    } else if ($anonymousUserId) {
      userId = $anonymousUserId;
      console.log("Using anonymous user ID:", userId);
    } else if (hasExistingSession()) {
      // If no anonymous ID or Clerk user but localStorage user_id exists,
      // it might be a pending migration or a state issue.
      // Try to get it from localStorage as a fallback, but this might be fragile.
      userId = localStorage.getItem(SESSION_USER_ID_KEY);
      console.log("Using localStorage user ID fallback:", userId);
    }

    currentUserId = userId;

    // Redirect to home if no session ID could be determined after checks
    if (!userId) {
      console.log("No user ID determined, redirecting to home");
      goto("/"); // Redirect if no user ID exists (new user needs to 'Start')
      return;
    }

    // Proceed with activity tracking and data loading if a user ID is available
    logAppOpenIfNeeded();
    loadActivityData(); // This function now uses the `currentUserId` derived above

    // Reset retry count on successful determination of user ID
    retryCount = 0;
  }

  function loadActivityData() {
    // Ensure we have a currentUserId before loading data
    if (!currentUserId) {
      console.warn("loadActivityData called without currentUserId");
      loadingState = false; // Or handle as an error state
      return;
    }
    // ... rest of the function remains the same, using currentUserId ...
    try {
      const historyTimestamps = getAppOpenHistory();
      const dates = new Set<string>();
      let minTimestamp = Infinity;

      if (historyTimestamps.length > 0) {
        for (const ts of historyTimestamps) {
          dates.add(formatDate(new Date(ts)));
          if (ts < minTimestamp) {
            minTimestamp = ts;
          }
        }
        earliestActivityDate = formatDate(new Date(minTimestamp));
      } else {
        earliestActivityDate = null;
      }

      activeDates = dates;
      fetchError = null;
      loadingState = false;
      console.log("Activity data loaded for user:", currentUserId);
    } catch (error) {
      console.error("Failed to process activity history:", error);
      fetchError = $_("errors.activity_load");
      activeDates = new Set();
      loadingState = false;
    }
  }

  // Logic to show the "Claim Session" card
  const showClaimSessionCard = $derived(
    () => browser && getSessionState() === "anonymous" && $anonymousUserId !== null
  ); // Only show if anonymous, in browser, and have an anonymous ID

  // Function to initiate sign-in from the dashboard card
  function initiateDashboardSignIn() {
    if (browser && $isOnline) {
      // Mark session as initiated locally
      markSessionAuthInitiated();
      console.log("Initiating sign-in from dashboard...");
      // Redirect to your sign-in page
      goto("/sign-in");
    } else {
      // Handle offline case - perhaps show a message or disable the button
      console.log("Sign-in cannot be initiated offline.");
    }
  }
</script>

<div class="flex flex-col">
  <main class="flex-1 p-4 md:p-6 lg:p-8">
    <div class="container mx-auto max-w-6xl">
      {#if browser}
        {#if loadingState && currentUserId === null}
          <!-- Show loading state specifically while *trying* to determine user ID -->
          <div class="flex min-h-[60vh] items-center justify-center">
            <p class="text-muted-foreground text-lg">Loading dashboard...</p>
          </div>
        {:else if currentUserId === null}
          <!-- If loading is done but no user ID was found, redirect should have happened.
               This might indicate an error state not handled by redirect. -->
          <div class="flex min-h-[60vh] items-center justify-center">
            <p class="text-muted-foreground text-lg">Could not load session. Please try again.</p>
          </div>
        {:else}
          <!-- Content when user ID is determined -->
          <div class="mb-6 flex items-center justify-between">
            <h1 class="text-3xl font-bold">{$_("dashboard.title")}</h1>
            {#if !$isOnline && $authMode === "online"}
              <!-- Offline alert -->
              <Alert.Root variant="destructive" class="max-w-md">
                <Alert.Description>
                  You are currently offline. Your data will be stored locally and synced when you're
                  back online.
                </Alert.Description>
              </Alert.Root>
            {/if}
          </div>

          {#if fetchError}
            <!-- Fetch error alert -->
            <Alert.Root variant="destructive" class="mb-4">
              <Alert.Title>{$_("common.error")}</Alert.Title>
              <Alert.Description>{fetchError}</Alert.Description>
            </Alert.Root>
          {/if}

          <!-- Activity Monitor Card -->
          {#if !fetchError}
            <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
              <Card.Root class="md:col-span-3">
                <Card.Header>
                  <Card.Title class="text-xl">{$_("dashboard.activity_title")}</Card.Title>
                </Card.Header>
                <Card.Content>
                  {#if activeDates.size > 0}
                    <ActivityMonitor {activeDates} sessionStartDate={earliestActivityDate} />
                  {:else}
                    <p class="text-muted-foreground">{$_("dashboard.no_activity")}</p>
                  {/if}
                </Card.Content>
              </Card.Root>
            </div>
          {/if}

          <!-- Show Claim Session Card if applicable -->
          {#if showClaimSessionCard}
            <div class="claim-session-container mt-6">
              <Card.Root class="mx-auto w-full max-w-md">
                <Card.Header>
                  <Card.Title>Account Sync</Card.Title>
                  <Card.Description>
                    You're currently using Habistat anonymously with ID {currentUserId}. Sign in to
                    sync your data across devices.
                  </Card.Description>
                </Card.Header>
                <Card.Content>
                  {#if !$isOnline}
                    <Alert.Root variant="destructive" class="mb-4">
                      <Alert.Description>
                        You are offline. Connect to the internet to sign in and sync.
                      </Alert.Description>
                    </Alert.Root>
                  {/if}
                  <Button
                    variant="default"
                    class="w-full"
                    onclick={initiateDashboardSignIn}
                    disabled={!$isOnline}
                  >
                    {$isOnline ? "Sign In to Sync Data" : "Offline Mode"}
                  </Button>
                </Card.Content>
              </Card.Root>
            </div>
          {/if}
        {/if}
      {:else}
        <!-- Server-side loading state -->
        <div class="flex min-h-[60vh] items-center justify-center">
          <p class="text-muted-foreground text-lg">Loading dashboard...</p>
        </div>
      {/if}
    </div>
  </main>
</div>
```

- **Explanation:** Pages now directly use Clerk's components or state where needed. The dashboard page determines the user ID based on your local state and Clerk's state, redirects if necessary, and conditionally shows the "Claim Session" card based on the `getSessionState()`. The sign-in button on this card directly navigates to the `/sign-in` page, which is handled by Clerk's server hook and client component.

**Step 5: Review `tracking.ts` Migration Logic (Medium Priority)**

The `migrateSession` function and related flags (`SESSION_MIGRATED_KEY`, `MIGRATED_SESSION_KEY`) are crucial for linking anonymous data.

- **Action:** Review `src/lib/utils/tracking.ts` to ensure `markSessionClaimed` is called reliably _after_ Clerk confirms authentication, and `migrateSession` (which you planned to implement later) is called at the appropriate time (e.g., immediately after `markSessionClaimed` successfully runs, or when the user logs in for the first time with a non-anonymous account while having local anonymous data). The current logic in `migrateSession` just sets flags and simulates; the actual data transfer to Convex and merging logic needs to be added according to your plan (Task 3.6 & Phase 4).
- **Code Change (`src/lib/utils/tracking.ts`):**
  - Ensure `markSessionClaimed` is called by `SignedInWrapper` (already implemented in the suggested change above).
  - Add a placeholder or actual logic for the data transfer within `migrateSession` when you reach that phase.
  - The logic in `isSessionMigrated` checking `localStorage.getItem(SESSION_MIGRATED_KEY) === "1"` seems correct for tracking local migration status.
  - The `migrateSession` function currently seems to _mark_ the session as migrated and claimed but doesn't _do_ the data migration yet. That's okay for now as per your plan, but be aware it's the next big piece.

```typescript
// src/lib/utils/tracking.ts

// ... existing constants and interfaces ...

export const SESSION_MIGRATED_KEY = "habistat_session_migrated";
export const SESSION_USER_ID_KEY = "habistat_session_user_id";
export const SESSION_USER_EMAIL_KEY = "habistat_session_user_email"; // Ensure this is here

// ... createSessionStore, isAnonymous, isClaimed, getSessionState functions ...

export function markSessionAuthInitiated() {
  if (browser) {
    localStorage.setItem(AUTH_INITIATED_KEY, "true");
    console.log("Session marked auth initiated"); // Added log
  }
}

export function markSessionClaimed() {
  if (browser) {
    localStorage.setItem(AUTH_INITIATED_KEY, "true"); // Keep initiated as true
    localStorage.setItem(AUTH_CLAIMED_KEY, "true");
    console.log("Session marked as claimed locally at", new Date().toISOString()); // Added log
  }
}

// markSessionMigrated -> Renamed/merged into migrateSession for clarity?
// Let's keep markSessionMigrated as a separate flag for data migration completion vs auth claim completion
export function markSessionMigratedDataTransfer() {
  if (browser) {
    localStorage.setItem(SESSION_MIGRATED_KEY, "1");
    console.log("Session data migration marked as completed locally"); // Added log
  }
}

export function isSessionMigrated(): boolean {
  if (typeof localStorage === "undefined") return false;
  // Checks if the *data migration process* has been marked complete
  return localStorage.getItem(SESSION_MIGRATED_KEY) === "1";
}

// getMigrationDetails (Keep as is)

/**
 * Migrates an anonymous session to an authenticated user session
 * Handles linking the new user ID locally and eventually transferring data to Convex
 *
 * @param userId The authenticated user ID to associate with the session
 * @param email Optional email to associate with the session
 * @returns true if local state was updated (marked claimed/migrated), false otherwise or if already done
 */
export async function migrateSession(userId: string, email?: string): Promise<boolean> {
  // Safety check for browser environment
  if (!browser) {
    console.warn("Cannot migrate session on server side");
    return false;
  }

  // If session is already claimed and data migration is marked complete, do nothing
  if (isSessionClaimed() && isSessionMigrated()) {
    console.log("Session already claimed and data migrated, skipping migration for user", userId);
    // Update user ID and email just in case they changed (e.g., user merged accounts)
    if (userId) localStorage.setItem(SESSION_USER_ID_KEY, userId);
    if (email) localStorage.setItem(SESSION_USER_EMAIL_KEY, email);
    return false;
  }

  // Mark session as claimed *first* if not already claimed
  if (!isSessionClaimed()) {
    markSessionClaimed();
  }

  // Update the user ID and email regardless of migration status
  if (userId) {
    localStorage.setItem(SESSION_USER_ID_KEY, userId);
  }
  if (email) {
    localStorage.setItem(SESSION_USER_EMAIL_KEY, email);
  }

  // If data migration is NOT yet marked complete, proceed with the migration process
  if (!isSessionMigrated()) {
    try {
      console.log("Starting data migration process for user:", userId);

      // --- Placeholder for actual data migration logic ---
      // TODO: Implement actual data transfer to Convex here (Phase 4 Task 4.3)
      // Example: Read local data from localStorage/SQLite, upload to Convex, handle conflicts.
      // await transferLocalDataToConvex(userId);
      // --- End Placeholder ---

      // Simulate async operation if actual transfer is complex/async
      // await new Promise((resolve) => setTimeout(resolve, 500));

      // Mark data migration as completed locally after successful transfer/linking
      markSessionMigratedDataTransfer();

      // Create migration details (update if already exists)
      try {
        const existingDetails = getMigrationDetails();
        localStorage.setItem(
          MIGRATED_SESSION_KEY,
          JSON.stringify({
            anonymousId: existingDetails?.anonymousId || get(anonymousUserId) || "unknown",
            claimedUserId: userId,
            userEmail: email || existingDetails?.userEmail,
            migratedAt: Date.now()
          })
        );
      } catch (detailsError) {
        // If storing details fails, it's not critical
        console.warn("Failed to store/update migration details:", detailsError);
      }

      console.log("Session migration process finished for user:", userId);
      return true; // Indicates a new migration process was initiated/completed
    } catch (error) {
      console.error("Error during session data migration:", error);

      // Decide how to handle failure: retry later? leave anonymous data?
      // For now, log and mark it as failed, but DON'T set SESSION_MIGRATED_KEY to prevent retries
      // unless you have robust failure handling.
      // If you want to retry, DON'T set the flag here on error.
      // localStorage.setItem(SESSION_MIGRATED_KEY, "1"); // <-- Do NOT do this on error if you want retries

      return false; // Indicates migration failed
    }
  } else {
    console.log(
      "Session is claimed and data migration was previously marked complete for user",
      userId
    );
    return false; // Indicates no new migration process was initiated
  }
}

// ... rest of tracking.ts (USER_ID_KEY, anonymousUserId, initializeTracking, createUserSession, logAppOpen, logAppOpenIfNeeded, deleteUserSession, getAppOpenHistory, hasExistingSession)
```

- **Explanation:** The `migrateSession` function's role is refined to handle the _data transfer_ aspect. Local flags (`AUTH_CLAIMED_KEY`, `SESSION_MIGRATED_KEY`) track the _state_ of the session transition. `isSessionClaimed` checks if Clerk has authenticated a user, and `isSessionMigrated` checks if the _data_ from the anonymous session has been processed/transferred to the claimed account.

**Summary of Core Fixes:**

1. Enable `handleClerk` in `hooks.server.ts`.
2. Remove the history patch in `app.html`.
3. Move `<ClerkProvider>` to `+layout.svelte`, wrapping main content conditionally on `browser`.
4. Remove or refactor `ClerkWrapper.svelte` to not contain `<ClerkProvider>` or URL cleaning.
5. Ensure `SignedInWrapper` uses Clerk's `$user` store reactivity to trigger local state updates (`markSessionClaimed`) and removes URL cleaning.
6. Update dashboard and sign-in pages to work with the new `ClerkProvider` setup.
7. Refine `migrateSession` and related tracking states to clearly distinguish authentication state from data migration state.

**Why this should fix the loop:**

- Enabling the server hook allows Clerk to correctly handle the redirects and callbacks that occur during the sign-in process.
- Removing the history patch allows Clerk's client-side SDK to manage browser history as intended.
- Placing `ClerkProvider` correctly ensures that all Clerk components and hooks have the necessary context to function.

This revised structure adheres better to how Svelte-Clerk is designed to be integrated and should resolve the redirect loop you're experiencing.

**Linking Anonymous Data in Settings:**

Your idea to link the anonymous UUID session with the Clerk email in settings is good. Once the authentication flow is fixed and a user logs in (marking the session as `claimed` and potentially `migrated`), the `SessionInfo.svelte` component can be updated to display both the anonymous ID (from local storage/store) and the claimed user's email/ID (from Clerk's `$user` store, available via the `ClerkProvider` context). You can access the Clerk user details via the `user` store (`import { user } from 'svelte-clerk'`) within components nested inside `ClerkProvider`.

**Next Steps Based on Implementation Plan:**

1. **Apply Proposed Fixes (High Priority):** Implement the code changes outlined above (Steps 1-6). Test the sign-in flow again thoroughly. Verify that signing in from the dashboard card or directly visiting `/sign-in` works, the user is correctly identified, and there are no redirect loops.
2. **Complete Task 3.1 (Clerk Setup & Integration):** Ensure all sub-points related to Clerk are functioning after applying the fixes (anonymous session ID creation/storage, session state tracking, "Claim Session" UI logic is correct based on local state + Clerk state).
3. **Refine UI/UX (Task 3.5):** Style the Clerk components or your custom auth UI consistently using ShadCN-Svelte.
4. **Continue with Phase 3 Tasks:**
   - **Task 3.2. Convex Backend Setup:** Set up your Convex project and define schemas.
   - **Task 3.3. Linking Clerk Auth to Convex User Creation (Webhook Approach):** Implement the Convex webhook endpoint and mutation to create/update user records in Convex when users are created/updated in Clerk. This runs server-to-server, so it doesn't rely on your frontend's online status, only on Convex/Clerk webhooks.
   - **Task 3.4. Tauri Specific Adjustments & Testing:** Test the auth flow specifically within Tauri on Windows/Android. Ensure OAuth works as expected in the webview. The fixes above should generally work, but platform-specific webview quirks might exist.
5. **Begin Phase 4: Data Modeling & Local Persistence:** Once auth is solid and Convex users are created via webhooks, start implementing the local SQLite/Drizzle data models (`calendars`, `habits`, `completions`) and the Svelte stores that load/save data to `localStorage` (or SQLite via Tauri commands later).
6. **Implement Anonymous Data Migration (Phase 4):** This is a key task. The `migrateSession` function started in `tracking.ts` will need the actual logic to read the anonymous data (currently in `localStorage`), structure it according to your Convex schema, and upload it to the newly authenticated user's records in Convex.

Let me know if you'd like detailed code snippets for any of these next steps or require further clarification on the proposed fixes. I recommend tackling the high-priority fixes first, as they are likely blocking the current issue.

---

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
  - [ ] Handles offline mode gracefully
  - [ ] Manages the transition between anonymous and authenticated states
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

- [ ] Install Convex CLI: `pnpm add convex`.
- [ ] Initialize a Convex project within your monorepo or as a separate linked project: Run `npx convex dev` in the desired directory (e.g., a new `convex/` folder at the root) and follow the setup prompts. Link it to your Convex cloud account.
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
