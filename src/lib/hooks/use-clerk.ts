import type { LoadedClerk, UserResource } from "@clerk/types";
import { setContext } from "svelte";
import { get, readable, writable } from "svelte/store";
import { browser } from "$app/environment";
import { authStateStore } from "$lib/stores/auth-state";
// import { syncIsOnline as networkIsOnline } from "$lib/stores/sync";
import { markSessionAssociated, sessionStore } from "$lib/utils/tracking";

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
        authStateStore.setClerkState(user?.id ?? null, true);

        // Add listener to update store on auth changes
        unsubscribe = clerk.addListener(({ user }) => {
          set(user ?? null);
          // Update auth state when Clerk user changes
          authStateStore.setClerkState(user?.id ?? null, true);
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
    const maxAttempts = 50; // Max 5 seconds

    const interval = setInterval(() => {
      attempts++;

      if (window.Clerk) {
        const clerk = window.Clerk as unknown as LoadedClerk;
        // console.log("[DEBUG] Clerk loaded, setting context:", clerk);
        // console.log("[DEBUG] Clerk has signOut method:", typeof clerk.signOut === "function");
        clerkStore.set(clerk);
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        console.warn("[DEBUG] Clerk not found after maximum attempts, giving up");
        clearInterval(interval);
      }
    }, 100);
  }

  /**
   * Sets up session association effect for when user signs in.
   */
  function setupSessionAssociation() {
    // This effect hook runs whenever the Clerk user state changes.
    // It's responsible for associating the anonymous session with the Clerk user.
    const unsubscribe = clerkUserStore.subscribe((user) => {
      if (user) {
        const session = get(sessionStore);
        if (session?.state === "anonymous") {
          console.log("[Session] Associating anonymous session with Clerk user:", user.id);
          markSessionAssociated(user.id, user.primaryEmailAddress?.emailAddress);
        }
      }
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
