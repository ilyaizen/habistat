import type { LoadedClerk, UserResource } from "@clerk/types";
import { setContext } from "svelte";
import { get, readable, writable } from "svelte/store";
import { browser } from "$app/environment";
import { unifiedSyncService } from "$lib/services/sync-unified";
import { authState } from "$lib/stores/auth-state";
// import { syncIsOnline as networkIsOnline } from "$lib/stores/sync";
import { markSessionAssociated, sessionStore } from "$lib/utils/tracking";

// Debug configuration - set to true to enable verbose logging
const DEBUG_VERBOSE = false;

/**
 * Clerk authentication hook for Habistat application.
 * Manages Clerk user state, context setup, and session association.
 */
export function useClerk() {
  // Create a readable store for the Clerk user state
  // Only initialize this store if online, otherwise ClerkProvider won't be rendered
  const clerkUserStore = readable<UserResource | null>(null, (set) => {
    // if (!browser || !get(networkIsOnline)) return; // Check network status here

    let unsubscribe: (() => void) | null = null;

    // Function to initialize Clerk state from window object
    function initializeClerkStateFromWindow() {
      const clerk = window.Clerk as unknown as LoadedClerk | undefined;
      if (clerk) {
        const user = clerk.user ?? null;
        set(user);

        // Update auth state when Clerk user changes
        authState.setClerkState(user?.id ?? null, true);

        // Add listener to update store on auth changes
        unsubscribe = clerk.addListener(({ user }) => {
          set(user ?? null);
          // Update auth state when Clerk user changes
          authState.setClerkState(user?.id ?? null, true);
        });
      } else {
        // Retry after a short delay
        setTimeout(initializeClerkStateFromWindow, 200);
      }
    }

    // Start initialization
    initializeClerkStateFromWindow();

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  });

  // Create Clerk store for the LoadedClerk instance
  const clerkStore = writable<LoadedClerk | null>(null);

  /**
   * Sets up Clerk contexts for downstream components.
   */
  function setupClerkContexts() {
    if (!browser) return;

    // Make the Clerk user store available via context
    setContext("clerkUser", clerkUserStore);
    setContext("clerk", clerkStore);
  }

  /**
   * Initializes Clerk instance detection and context setup.
   */
  function initializeClerk() {
    if (!browser) return;

    let attempts = 0;
    const maxAttempts = 5; // Max 5 seconds

    const interval = setInterval(() => {
      attempts++;

      if (window.Clerk) {
        const clerk = window.Clerk as unknown as LoadedClerk;
        if (DEBUG_VERBOSE) {
          console.log("✅ Clerk: Instance loaded and ready");
          console.log("🔍 Clerk: SignOut method available:", typeof clerk.signOut === "function");
        }
        clerkStore.set(clerk);
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        console.warn("❌ Clerk: Instance not found after maximum attempts, giving up");
        clearInterval(interval);
      }
    }, 100);
  }

  /**
   * Sets up session association and user sync effects for when user signs in.
   */
  function setupSessionAssociation() {
    let previousUserState: UserResource | null = null;

    // This effect hook runs whenever the Clerk user state changes.
    // It's responsible for associating the anonymous session with the Clerk user
    // and syncing the user to Convex database.
    const unsubscribe = clerkUserStore.subscribe(async (user) => {
      // Skip initial null state and avoid redundant calls
      if (user === previousUserState) return;

      if (user) {
        if (DEBUG_VERBOSE) {
          console.log("✅ Clerk: User authenticated, proceeding with sync");
        }

        const session = get(sessionStore);
        if (session?.state === "anonymous") {
          if (DEBUG_VERBOSE) {
            console.log("🔗 Clerk: Associating anonymous session with authenticated user");
          }
          markSessionAssociated(user.id, user.primaryEmailAddress?.emailAddress);
        }

        // Initialize Convex client now that user is authenticated
        if (DEBUG_VERBOSE) {
          console.log("🔄 Clerk: Initializing Convex client for authenticated user");
        }
        try {
          const { getConvexClientForAuthenticatedUser } = await import("$lib/utils/convex");
          const convexClient = await getConvexClientForAuthenticatedUser();
          if (convexClient) {
            if (DEBUG_VERBOSE) {
              console.log("✅ Clerk: Convex client ready for authenticated user");
            }
          } else {
            console.warn("⚠️ Clerk: Failed to initialize Convex client");
          }
        } catch (error) {
          console.error("❌ Clerk: Convex client initialization error:", error);
        }

        // Note: User sync is automatically handled by UnifiedSyncService auth state subscription
        // No need to manually trigger sync here to avoid duplication
      } else if (previousUserState !== null) {
        // Only handle sign-out if we previously had an authenticated user
        // This prevents unnecessary cleanup calls for anonymous users
        if (DEBUG_VERBOSE) {
          console.log("📤 Clerk: User signed out, sync cleanup handled by UnifiedSyncService");
        }
        // Note: Sign-out cleanup is automatically handled by UnifiedSyncService auth state subscription
      }

      previousUserState = user;
    });

    // Return cleanup function
    return unsubscribe;
  }

  return {
    clerkUserStore,
    clerkStore,
    setupClerkContexts,
    initializeClerk,
    setupSessionAssociation
  };
}
