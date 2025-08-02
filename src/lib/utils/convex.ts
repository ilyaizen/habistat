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
 * Check if Clerk is loaded and ready to use
 */
function isClerkReady(): boolean {
  return browser && typeof window !== "undefined" && window.Clerk !== undefined;
}

/**
 * Wait for Clerk to be loaded and ready
 */
async function waitForClerk(): Promise<boolean> {
  if (!browser) return false;

  // If already ready, return immediately
  if (isClerkReady()) return true;

  // Wait for Clerk to load with timeout
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn("[Convex] Timeout waiting for Clerk to load");
      resolve(false);
    }, 10000);

    const checkClerk = () => {
      if (typeof window !== "undefined" && window.Clerk) {
        clearTimeout(timeout);
        console.log("[Convex] Clerk is now ready");
        resolve(true);
      }
    };

    // Check immediately
    checkClerk();

    // Poll for Clerk
    const pollInterval = setInterval(() => {
      if (typeof window !== "undefined" && window.Clerk) {
        clearInterval(pollInterval);
        clearTimeout(timeout);
        console.log("[Convex] Clerk detected via polling");
        resolve(true);
      }
    }, 100);

    // Clean up polling on timeout
    setTimeout(() => clearInterval(pollInterval), 10000);
  });
}

/**
 * Gets or initializes the Convex client with improved authentication handling
 *
 * @returns The Convex client instance or null if unavailable
 */
export function getConvexClient(): ConvexClient | null {
  if (!browser) {
    return null; // SSR safety
  }

  // Initialize client if not already done
  if (!convexClient) {
    initializeConvexClient();
  }

  return convexClient;
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
      console.log(
        "[Convex] Offline mode detected, some operations may be unavailable"
      );
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
        console.log("[Convex] Auth in progress, using cached token");
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
          console.log(
            `[Convex] Fetching auth token from Clerk (attempt ${attempts + 1}/${maxAttempts})`
          );

          // Wait for Clerk to be ready
          const clerkAvailable = await waitForClerk();
          if (!clerkAvailable) {
            console.warn("[Convex] Clerk not available, cannot authenticate");
            break;
          }

          // Check if user is signed in
          if (!window.Clerk?.user) {
            console.log("[Convex] No user signed in to Clerk");
            authenticationInProgress = false;
            return null;
          }

          // Get token from Clerk session
          const token = await window.Clerk?.session?.getToken({
            template: "convex",
          });

          if (token) {
            console.log("[Convex] Authentication successful via Clerk");
            lastSuccessfulToken = token;
            authenticationInProgress = false;
            authReady = true;
            offlineMode = false;
            return token;
          } else {
            console.warn("[Convex] Failed to get token from Clerk session");
          }

          attempts++;
          if (attempts < maxAttempts) {
            const delay = Math.min(1000 * 2 ** attempts, 8000); // Exponential backoff
            console.log(`[Convex] Retrying in ${delay}ms...`);
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
 * Check if user is authenticated in Clerk
 * @returns Promise resolving to true if user is authenticated
 */
async function isUserAuthenticated(): Promise<boolean> {
  if (!browser) return false;

  const clerkAvailable = await waitForClerk();
  if (!clerkAvailable) return false;

  return !!window.Clerk?.user && !!window.Clerk?.session;
}

/**
 * Check if authentication is ready
 * @returns Boolean indicating if auth is ready
 */
export function isAuthReady(): boolean {
  // Must have Clerk ready and user authenticated
  if (!isClerkReady() || offlineMode) {
    return false;
  }

  // Check if we have a valid token and recent fetch
  if (authReady && lastSuccessfulToken) {
    const timeSinceLastFetch = Date.now() - lastTokenFetchTime;
    // Token is valid for a reasonable time period
    return timeSinceLastFetch < 300000; // 5 minutes
  }

  return false;
}

/**
 * Check if we're operating in offline mode
 * @returns Boolean indicating offline status
 */
export function isOfflineMode(): boolean {
  return offlineMode;
}

/**
 * Initialize client with a delay to allow authentication systems to load
 */
if (browser) {
  // Small delay to ensure other systems are ready
  setTimeout(() => {
    console.log("[Convex] Initializing client...");
    getConvexClient();
  }, 100);

  // Listen for online/offline events
  window.addEventListener("online", () => {
    console.log("[Convex] Network connection restored");
    offlineMode = false;
    // Re-initialize client to trigger auth
    if (!convexClient) {
      getConvexClient();
    }
  });

  window.addEventListener("offline", () => {
    console.log("[Convex] Network connection lost");
    offlineMode = true;
  });
}

// Export the client instance for convenience
export const convex = getConvexClient();
