import { get, type Writable, writable } from "svelte/store";

export type ConvexAuthStatus = "pending" | "authenticated" | "unauthenticated" | "error";

interface AuthState {
  clerkReady: boolean;
  clerkUserId: string | null;
  convexAuthStatus: ConvexAuthStatus;
  lastAuthCheck: number | null;
  error: string | null;
}

/**
 * Auth state store for managing authentication across Clerk and Convex
 *
 * For static builds (prerender=true, ssr=false), authentication is handled
 * entirely on the client side through Clerk's client SDK.
 */
function createAuthStateStore() {
  const { subscribe, update, set }: Writable<AuthState> = writable({
    clerkReady: false,
    clerkUserId: null,
    convexAuthStatus: "pending",
    lastAuthCheck: null,
    error: null
  });

  const authCheckInProgress = false;

  /**
   * Check Convex authentication status
   * For static builds, we rely on Clerk's client-side authentication
   * and assume Convex auth is ready when Clerk is authenticated
   */
  const checkConvexAuth = async (): Promise<ConvexAuthStatus> => {
    // For static builds, we don't have server-side API routes
    // Instead, we assume Convex auth is ready when Clerk is authenticated
    const state = get({ subscribe });

    if (state.clerkReady && state.clerkUserId) {
      // Debug: Convex auth ready
      // console.log("[Auth] Clerk authenticated, assuming Convex auth is ready");
      return "authenticated";
    }

    return "unauthenticated";
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

        // For static builds, we only need Clerk to be ready
        if (state.clerkReady && state.clerkUserId) {
          clearInterval(checkInterval);
          resolve(true);
          return;
        }
      }, 500); // Check every 500ms
    });
  };

  const store = {
    subscribe,

    /**
     * Set Clerk authentication state
     * For static builds, this is the primary authentication method
     */
    setClerkState: (userId: string | null, ready: boolean = true) => {
      update((state) => ({
        ...state,
        clerkReady: ready,
        clerkUserId: userId,
        // For static builds, Convex auth follows Clerk auth
        convexAuthStatus: userId ? "authenticated" : "unauthenticated"
      }));

      // Only log significant auth state changes
      const state = get({ subscribe });
      const hasChanged = state.clerkUserId !== userId || state.clerkReady !== ready;
      if (hasChanged) {
        console.log(`🔐 Auth: ${userId ? 'signed in' : 'signed out'}`);
      }
    },

    /**
     * Set Convex authentication status directly
     * This is mainly for compatibility with existing code
     */
    setConvexAuthStatus: (status: ConvexAuthStatus) => {
      update((state) => ({
        ...state,
        convexAuthStatus: status,
        lastAuthCheck: Date.now()
      }));
    },

    /**
     * Set error state
     */
    setError: (error: string | null) => {
      update((state) => ({
        ...state,
        error
      }));
    },

    /**
     * Reset the store to initial state
     */
    reset: () => {
      set({
        clerkReady: false,
        clerkUserId: null,
        convexAuthStatus: "pending",
        lastAuthCheck: null,
        error: null
      });
    },

    /**
     * Wait for authentication to be ready
     */
    waitForAuthReady
  };

  return store;
}

export const authState = createAuthStateStore();
