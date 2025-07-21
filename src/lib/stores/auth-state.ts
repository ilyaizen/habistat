import { derived, get, writable } from "svelte/store";
import { browser } from "$app/environment";
import { getConvexClient, isAuthReady, isOfflineMode } from "$lib/utils/convex";

/**
 * Authentication state types
 */
export type ConvexAuthStatus = "pending" | "authenticated" | "unauthenticated" | "error";

interface AuthState {
  clerkReady: boolean;
  clerkUserId: string | null;
  convexAuthStatus: ConvexAuthStatus;
  lastAuthCheck: number | null;
  error: string | null;
}

/**
 * Centralized authentication state management
 * Coordinates between Clerk and Convex authentication
 */
function createAuthStateStore() {
  const { subscribe, update } = writable<AuthState>({
    clerkReady: false,
    clerkUserId: null,
    convexAuthStatus: "pending",
    lastAuthCheck: null,
    error: null
  });

  let authCheckInProgress = false;

  /**
   * Check if Convex client is authenticated using enhanced client utils
   *
   * This leverages the improved client's authentication state tracking and
   * provides a more reliable check for auth readiness.
   */
  const checkConvexAuth = async (): Promise<ConvexAuthStatus> => {
    if (!browser) return "unauthenticated";

    const convexClient = getConvexClient();
    if (!convexClient) return "unauthenticated";

    // Use the enhanced client's auth readiness check
    if (isOfflineMode()) {
      console.log("[Auth] In offline mode, considering unauthenticated");
      return "unauthenticated";
    }

    if (isAuthReady()) {
      console.log("[Auth] Convex auth is ready");
      return "authenticated";
    }

    try {
      // Fallback to direct token check
      const response = await fetch("/api/auth/token");
      if (response.ok) {
        const token = await response.text();
        if (token) {
          console.log("[Auth] Token check successful");
          return "authenticated";
        }
      }
      return "unauthenticated";
    } catch (error) {
      console.warn("[Auth] Failed to check Convex auth:", error);
      return "error";
    }
  };

  /**
   * Wait for both Clerk and Convex to be ready
   */
  const waitForAuthReady = async (timeoutMs = 10000): Promise<boolean> => {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        const state = get({ subscribe });

        // Check if we've timed out
        if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          resolve(false);
          return;
        }

        // Check if both Clerk and Convex are ready
        if (state.clerkReady && state.clerkUserId && state.convexAuthStatus === "authenticated") {
          clearInterval(checkInterval);
          resolve(true);
          return;
        }

        // If Clerk is ready but Convex isn't, check Convex auth
        if (state.clerkReady && state.clerkUserId && state.convexAuthStatus !== "authenticated") {
          if (!authCheckInProgress) {
            authCheckInProgress = true;
            const convexStatus = await checkConvexAuth();
            update((s) => ({
              ...s,
              convexAuthStatus: convexStatus,
              lastAuthCheck: Date.now()
            }));
            authCheckInProgress = false;
          }
        }
      }, 500); // Check every 500ms
    });
  };

  const store = {
    subscribe,

    /**
     * Set Clerk authentication state with improved coordination
     *
     * This enhanced version coordinates better with the Convex client
     * and implements a progressive checking strategy to ensure
     * both authentication systems are properly synchronized.
     */
    setClerkState: (userId: string | null, ready: boolean = true) => {
      update((state) => ({
        ...state,
        clerkReady: ready,
        clerkUserId: userId,
        // Reset Convex auth status when Clerk state changes
        convexAuthStatus: userId ? "pending" : "unauthenticated"
      }));

      // If user is set, start checking Convex auth with progressive checks
      if (userId && ready) {
        // Initial check with delay to allow Convex client initialization
        setTimeout(async () => {
          const convexStatus = await checkConvexAuth();
          update((s) => ({
            ...s,
            convexAuthStatus: convexStatus,
            lastAuthCheck: Date.now()
          }));

          // If not authenticated on first try, schedule follow-up checks
          if (convexStatus !== "authenticated") {
            const checkTimes = [1000, 2000, 4000, 8000]; // Progressive backoff

            // Schedule progressive auth checks
            checkTimes.forEach((delay, index) => {
              setTimeout(async () => {
                const state = get({ subscribe });

                // Skip if we've already authenticated or no longer have a user
                if (state.convexAuthStatus === "authenticated" || !state.clerkUserId) {
                  return;
                }

                console.log(`[Auth] Follow-up check ${index + 1}/${checkTimes.length}`);
                const convexStatus = await checkConvexAuth();

                update((s) => ({
                  ...s,
                  convexAuthStatus: convexStatus,
                  lastAuthCheck: Date.now()
                }));
              }, delay);
            });
          }
        }, 500);
      }
    },

    /**
     * Manually trigger Convex auth check
     */
    checkConvexAuth: async () => {
      if (authCheckInProgress) return;

      authCheckInProgress = true;
      const status = await checkConvexAuth();
      update((state) => ({
        ...state,
        convexAuthStatus: status,
        lastAuthCheck: Date.now()
      }));
      authCheckInProgress = false;
    },

    /**
     * Wait for authentication to be fully ready
     */
    waitForAuthReady,

    /**
     * Check if authentication is fully ready
     */
    isAuthReady: () => {
      const state = get({ subscribe });
      return state.clerkReady && state.clerkUserId && state.convexAuthStatus === "authenticated";
    }
  };

  return store;
}

export const authStateStore = createAuthStateStore();

/**
 * Derived store that indicates when authentication is fully ready
 */
export const authReady = derived(
  authStateStore,
  (state) => state.clerkReady && state.clerkUserId && state.convexAuthStatus === "authenticated"
);
