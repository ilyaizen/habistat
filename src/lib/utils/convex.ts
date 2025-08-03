import type { Clerk } from "@clerk/clerk-js";
import { ConvexClient } from "convex/browser";
import { browser } from "$app/environment";

/**
 * Convex client singleton and authentication management
 *
 * This module handles creating and configuring the Convex client with client-side
 * Clerk authentication for static generation compatibility.
 */

// Create a single convex client instance for the application
let convexClient: ConvexClient | null = null;

// Track authentication status
let authenticationInProgress = false;
let lastTokenFetchTime = 0;
let lastSuccessfulToken: string | null = null;
let authReady = false;
let offlineMode = false;

// Type declarations for window.Clerk
declare global {
  interface Window {
    Clerk?: Clerk;
    clerkPublishableKey?: string;
  }
}

// Configure network detection
function isOnline(): boolean {
  return browser ? navigator.onLine : false;
}

/**
 * Check if Clerk is loaded and ready to use with user session
 */
function isClerkReady(): boolean {
  if (!browser || typeof window === "undefined" || !window.Clerk) {
    return false;
  }

  // Check if Clerk is loaded (this is crucial for session readiness)
  return window.Clerk.loaded === true;
}

/**
 * Check if Clerk has a valid user session
 */
function isClerkUserReady(): boolean {
  if (!isClerkReady()) return false;

  // Check for both user object and active session
  return !!(window.Clerk?.user && window.Clerk?.session);
}

/**
 * Wait for Clerk to be loaded and ready with user session
 */
async function waitForClerk(): Promise<boolean> {
  if (!browser) return false;

  // If already ready, return immediately
  if (isClerkReady()) return true;

  console.log("⏳ Convex: Waiting for Clerk...");

  // Wait for Clerk to load with timeout
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn("⚠️ Convex: Clerk load timeout");
      resolve(false);
    }, 15000); // Increased timeout for slower connections

    const checkClerk = () => {
      if (typeof window !== "undefined" && window.Clerk?.loaded === true) {
        clearTimeout(timeout);
        console.log("✅ Convex: Clerk loaded");
        resolve(true);
      }
    };

    // Check immediately
    checkClerk();

    // Listen for Clerk's load event if available
    if (typeof window !== "undefined" && window.Clerk) {
      // Use the correct Clerk listener API
      const handleLoad = () => {
        clearTimeout(timeout);
        // Debug: Clerk load event
        // console.log("[Convex] Clerk load event received");
        resolve(true);
      };
      window.Clerk.addListener(handleLoad);
    }

    // Poll for Clerk with more specific checks
    const pollInterval = setInterval(() => {
      if (typeof window !== "undefined" && window.Clerk?.loaded === true) {
        clearInterval(pollInterval);
        clearTimeout(timeout);
        console.log("✅ Convex: Clerk ready via polling");
        resolve(true);
      }
    }, 100);

    // Clean up polling on timeout
    setTimeout(() => clearInterval(pollInterval), 15000);
  });
}

/**
 * Wait for Clerk user session to be ready
 */
async function waitForClerkUser(): Promise<boolean> {
  if (!browser) return false;

  // First ensure Clerk itself is ready
  const clerkReady = await waitForClerk();
  if (!clerkReady) return false;

  // If user is already ready, return immediately
  if (isClerkUserReady()) return true;

  console.log("⏳ Convex: Waiting for user session...");

  // Wait for user session with timeout
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn("⚠️ Convex: User session timeout");
      resolve(false);
    }, 10000);

    const checkUser = () => {
      if (isClerkUserReady()) {
        clearTimeout(timeout);
        console.log("✅ Convex: User session ready");
        resolve(true);
      }
    };

    // Check immediately
    checkUser();

    // Listen for session events if available
    if (window.Clerk) {
      const handleSessionChange = () => {
        if (isClerkUserReady()) {
          clearTimeout(timeout);
          // Debug: User session ready via event
          // console.log("[Convex] Clerk user session ready via event");
          resolve(true);
        }
      };

      // Note: Clerk's addListener might not support specific event types in all versions
      // We'll rely on polling for now, but keep this structure for future improvements
      window.Clerk.addListener(handleSessionChange);
    }

    // Poll for user session
    const pollInterval = setInterval(() => {
      if (isClerkUserReady()) {
        clearInterval(pollInterval);
        clearTimeout(timeout);
        console.log("✅ Convex: User session via polling");
        resolve(true);
      }
    }, 200);

    // Clean up polling on timeout
    setTimeout(() => clearInterval(pollInterval), 10000);
  });
}

/**
 * Check if the current user should have Convex client initialized
 * Only authenticated users with Clerk should use Convex
 */
function shouldInitializeConvex(): boolean {
  if (!browser) return false;

  // Check if Clerk is loaded and user is authenticated
  return isClerkReady() && isClerkUserReady();
}

/**
 * Gets or initializes the Convex client with improved authentication handling
 * Only initializes for authenticated users to prevent timeout errors for anonymous users
 *
 * @returns The Convex client instance or null if unavailable or user is anonymous
 */
export function getConvexClient(): ConvexClient | null {
  if (!browser) {
    return null; // SSR safety
  }

  // Don't initialize Convex for anonymous users
  if (!shouldInitializeConvex()) {
    return null;
  }

  // Initialize client if not already done
  if (!convexClient) {
    initializeConvexClient();
  }

  return convexClient;
}

/**
 * Gets the Convex client for authenticated users only
 * This is a safer alternative that ensures the user is authenticated before returning the client
 *
 * @returns Promise resolving to the Convex client or null
 */
export async function getConvexClientForAuthenticatedUser(): Promise<ConvexClient | null> {
  if (!browser) {
    return null;
  }

  // Wait for user to be authenticated
  const userReady = await waitForClerkUser();
  if (!userReady) {
    return null;
  }

  // Now get the client
  return getConvexClient();
}

/**
 * Initialize the Convex client with authentication and proper error handling
 */
function initializeConvexClient() {
  const convexUrl = browser ? import.meta.env.VITE_CONVEX_URL : null;

  if (!convexUrl) {
    console.warn("[Convex] VITE_CONVEX_URL environment variable is not set");
    return;
  }

  try {
    // Create and configure client
    convexClient = new ConvexClient(convexUrl);

    // Check online status before configuring auth
    offlineMode = !isOnline();
    if (offlineMode) {
      console.log("🚫 Convex: Offline mode");
    }

    // Configure auth with client-side Clerk token handling
    convexClient.setAuth(async () => {
      // If we're offline, don't attempt auth
      if (!isOnline()) {
        offlineMode = true;
        return null;
      }

      // Don't retry too frequently
      const now = Date.now();
      const timeSinceLastFetch = now - lastTokenFetchTime;
      if (authenticationInProgress && timeSinceLastFetch < 5000) {
        // Debug: Auth in progress, using cached token
        // console.log("[Convex] Auth in progress, using cached token");
        return lastSuccessfulToken;
      }

      // Start auth process
      authenticationInProgress = true;
      lastTokenFetchTime = now;
      authReady = false; // Reset auth status until we get a successful token

      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          // Debug: Only log retries
          if (attempts > 0) {
            console.log(`🔄 Convex: Auth retry ${attempts + 1}/${maxAttempts}`);
          }

          // Wait for Clerk to be fully loaded and user session to be ready
          const userReady = await waitForClerkUser();
          if (!userReady) {
            console.warn("⚠️ Convex: User session not ready");
            break;
          }

          // Double-check user and session state with detailed logging
          if (!window.Clerk?.user) {
            console.warn("⚠️ Convex: No user object");
            // Debug: Detailed Clerk state (only for errors)
            // console.log("[Convex] Debug - Clerk state:", {
            //   clerkExists: !!window.Clerk,
            //   clerkLoaded: window.Clerk?.loaded,
            //   hasUser: !!window.Clerk?.user,
            //   hasSession: !!window.Clerk?.session,
            //   userId: window.Clerk?.user?.id
            // });
            break;
          }

          if (!window.Clerk?.session) {
            console.warn("⚠️ Convex: No session object");
            break;
          }

          console.log("✅ Convex: Getting auth token...");

          // Get token from Clerk session
          const token = await window.Clerk.session.getToken({
            template: "convex"
          });

          if (token) {
            console.log("✅ Convex: Auth successful");
            lastSuccessfulToken = token;
            authenticationInProgress = false;
            authReady = true;
            offlineMode = false;
            return token;
          } else {
            console.warn("⚠️ Convex: Null token returned");
          }

          attempts++;
          if (attempts < maxAttempts) {
            const delay = Math.min(1000 * 2 ** attempts, 8000); // Exponential backoff
            // Debug: retry delay
            // console.log(`[Convex] Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } catch (error) {
          console.error("[Convex] Auth error:", error);
          attempts++;
          if (attempts < maxAttempts) {
            const delay = Math.min(1000 * 2 ** attempts, 8000);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      console.warn("[Convex] Authentication failed after multiple attempts");
      authenticationInProgress = false;

      // Return null instead of cached token on failure
      return null;
    });
  } catch (error) {
    console.error("[Convex] Failed to initialize client:", error);
    convexClient = null;
  }
}

/**
 * Check if user is authenticated in Clerk with session
 * @returns Promise resolving to true if user is authenticated
 */
async function isUserAuthenticated(): Promise<boolean> {
  if (!browser) return false;

  const userReady = await waitForClerkUser();
  if (!userReady) return false;

  return isClerkUserReady();
}

/**
 * Check if authentication is ready for Convex queries
 * @returns boolean indicating if auth is ready
 */
export function isAuthReady(): boolean {
  return authReady;
}

/**
 * Manually refresh the Convex auth token
 * This can be used to ensure a fresh token before making API calls
 */
export async function refreshConvexToken(): Promise<string | null> {
  if (!browser) {
    console.warn("[Convex] Cannot refresh token: Not in browser environment");
    return null;
  }

  // Wait for Clerk user session to be ready
  const userReady = await waitForClerkUser();
  if (!userReady) {
    console.warn("[Convex] Cannot refresh token: Clerk user session not ready");
    return null;
  }

  if (!window.Clerk?.session) {
    console.warn("[Convex] Cannot refresh token: No Clerk session available");
    return null;
  }

  try {
    console.log("🔄 Convex: Refreshing token");

    // Get a fresh token from Clerk
    const token = await window.Clerk.session.getToken({
      template: "convex"
    });

    if (token) {
      lastSuccessfulToken = token;
      lastTokenFetchTime = Date.now();
      authReady = true;

      // Debug token info (only partial info for security)
      try {
        // Only decode and log parts of the JWT, never the full token
        const tokenParts = token.split(".");
        if (tokenParts.length === 3) {
          const header = JSON.parse(atob(tokenParts[0]));
          const payload = JSON.parse(atob(tokenParts[1]));

          // Debug: Token info (only for debugging auth issues)
          // console.log("[Convex] Token debug info:", {
          //   alg: header.alg,
          //   typ: header.typ,
          //   iss: payload.iss,
          //   aud: payload.aud,
          //   subject: payload.sub || payload.user_id || "missing"
          // });
        }
      } catch (decodeError) {
        console.warn("[Convex] Could not decode token for debug info:", decodeError);
      }

      return token;
    } else {
      console.warn("⚠️ Convex: Clerk returned null token");
    }
  } catch (error) {
    console.error("[Convex] Failed to refresh token:", error);
  }

  return null;
}

/**
 * Check if we're operating in offline mode
 * @returns Boolean indicating offline status
 */
export function isOfflineMode(): boolean {
  return offlineMode;
}

/**
 * Debug function to get comprehensive auth state information
 * Useful for troubleshooting authentication issues
 */
export async function debugConvexAuthState(): Promise<void> {
  console.group("[Convex] Debug Auth State");

  console.log("Environment:", {
    browser,
    online: isOnline(),
    offlineMode
  });

  console.log("Convex Client State:", {
    clientExists: !!convexClient,
    authReady,
    authenticationInProgress,
    lastTokenFetchTime:
      lastTokenFetchTime > 0 ? new Date(lastTokenFetchTime).toISOString() : "never",
    hasLastSuccessfulToken: !!lastSuccessfulToken
  });

  if (browser && typeof window !== "undefined") {
    console.log("Clerk State:", {
      clerkExists: !!window.Clerk,
      clerkLoaded: window.Clerk?.loaded,
      hasUser: !!window.Clerk?.user,
      hasSession: !!window.Clerk?.session,
      userId: window.Clerk?.user?.id,
      isClerkReady: isClerkReady(),
      isClerkUserReady: isClerkUserReady()
    });

    // Test Clerk readiness functions
    console.log("Testing Clerk readiness...");
    const clerkReady = await waitForClerk();
    console.log("waitForClerk() result:", clerkReady);

    const userReady = await waitForClerkUser();
    console.log("waitForClerkUser() result:", userReady);

    // Test token retrieval
    if (userReady) {
      console.log("Testing token retrieval...");
      const token = await refreshConvexToken();
      console.log("Token retrieval result:", token ? "SUCCESS" : "FAILED");
    }
  }

  console.groupEnd();
}

/**
 * Initialize client with a delay to allow authentication systems to load
 * Only initialize if there's an authenticated user to prevent timeout errors
 */
if (browser) {
  // Listen for online/offline events
  window.addEventListener("online", () => {
    console.log("🔌 Convex: Network restored");
    offlineMode = false;
    // Re-initialize client only if user is authenticated
    if (!convexClient && shouldInitializeConvex()) {
      getConvexClient();
    }
  });

  window.addEventListener("offline", () => {
    console.log("🚫 Convex: Network lost");
    offlineMode = true;
  });
}

// Export the client getter for convenience (lazy initialization)
export const convex = () => getConvexClient();

// Export debug function to global scope for easy console access
if (browser && typeof window !== "undefined") {
  (window as any).debugConvexAuth = debugConvexAuthState;
}
