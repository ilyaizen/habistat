import { ConvexClient } from "convex/browser";
import { browser } from "$app/environment";

/**
 * Convex client singleton and authentication management
 *
 * This module handles creating and configuring the Convex client with proper
 * authentication token fetching, retries, and error handling to ensure a more
 * robust connection between the client and Convex backend.
 */

// Create a single convex client instance for the application
let convexClient: ConvexClient | null = null;

// Track authentication status
let authenticationInProgress = false;
let lastTokenFetchTime = 0;
let lastSuccessfulToken: string | null = null;
let authReady = false;
let offlineMode = false;

// Add token verification tracking
let tokenVerificationInProgress = false;
let lastVerifyAttemptTime = 0;
let lastSuccessfulVerifyTime = 0;

// Configure network detection
function isOnline(): boolean {
  return browser ? navigator.onLine : false;
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
      console.log("[Convex] Offline mode detected, some operations may be unavailable");
    }

    // Configure auth with robust token handling
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
          console.log(`[Convex] Fetching auth token (attempt ${attempts + 1}/${maxAttempts})`);
          const response = await fetch("/api/auth/token");

          if (response.ok) {
            const token = await response.text();
            if (token) {
              console.log("[Convex] Authentication successful");
              lastSuccessfulToken = token;
              authenticationInProgress = false;

              // Start token verification immediately and allow optimistic auth
              // This helps prevent race conditions between token fetch and usage
              authReady = true; // Set optimistically

              // Verify token asynchronously
              tokenVerificationInProgress = true;
              lastVerifyAttemptTime = Date.now();

              verifyTokenWorks()
                .then((isValid) => {
                  tokenVerificationInProgress = false;
                  if (isValid) {
                    lastSuccessfulVerifyTime = Date.now();
                    console.log("[Convex] Authentication verified and working");
                  } else {
                    console.warn("[Convex] Authentication token may not be valid");
                    // Only set authReady to false if verification explicitly fails
                    // This reduces disruption to ongoing operations
                    if (Date.now() - lastSuccessfulVerifyTime > 30000) {
                      // Allow a grace period
                      authReady = false;
                    }
                  }
                })
                .catch(() => {
                  tokenVerificationInProgress = false;
                  console.warn("[Convex] Failed to verify token, will retry on next operation");
                });
              offlineMode = false;
              return token;
            }
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

      // Return last successful token as a fallback
      return lastSuccessfulToken;
    });
  } catch (error) {
    console.error("[Convex] Failed to initialize client:", error);
    convexClient = null;
  }
}

/**
 * Verify that the current token actually works with Convex
 * @returns Promise resolving to true if token works
 */
async function verifyTokenWorks(): Promise<boolean> {
  if (!convexClient || !lastSuccessfulToken) {
    return false;
  }

  try {
    // Make a direct token check request instead of using query
    // This avoids circular dependencies with the API
    const response = await fetch("/api/auth/check", {
      headers: {
        Authorization: `Bearer ${lastSuccessfulToken}`
      }
    });

    if (response.ok) {
      return true;
    }
    return false;
  } catch (error) {
    console.warn("[Convex] Token verification failed:", error);
    return false;
  }
}

/**
 * Check if authentication is ready
 * @returns Boolean indicating if auth is ready
 */
export function isAuthReady(): boolean {
  // Return true if we have a token AND auth is marked ready
  if (authReady && !offlineMode && !!lastSuccessfulToken) {
    return true;
  }

  // If token verification is in progress, give it the benefit of the doubt
  // This helps prevent race conditions during initial auth
  if (tokenVerificationInProgress && lastSuccessfulToken && !offlineMode) {
    // But only if we fetched the token recently
    const timeSinceLastFetch = Date.now() - lastTokenFetchTime;
    if (timeSinceLastFetch < 10000) {
      // 10 second grace period
      return true;
    }
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
