/**
 * Safe Query Utilities for Convex
 *
 * This module provides helper functions to safely execute Convex queries and mutations
 * with proper error handling for authentication issues.
 */

import { get } from "svelte/store";
import { authState } from "$lib/stores/auth-state";
// Centralized debug flag
import { DEBUG_VERBOSE } from "$lib/utils/debug";
import { convex, isAuthReady, refreshConvexToken } from "./convex";

// Debug configuration - reduce console verbosity

// No retries - single attempt only to prevent app overload
const MAX_RETRIES = 0;

/**
 * Safe wrapper for Convex query operations with error handling and retries
 *
 * @param queryFn - The Convex query function to execute
 * @param args - Arguments to pass to the query
 * @param options - Additional options for the query execution
 * @returns Result of the query or null if failed
 */
export async function safeQuery<T = unknown, A = unknown>(
  queryFn: any, // Using any for convex function type compatibility - required for generic function references
  args?: A,
  options?: {
    retries?: number;
    logErrors?: boolean;
    throwErrors?: boolean;
  }
): Promise<T | null> {
  const opts = {
    retries: MAX_RETRIES,
    logErrors: true,
    throwErrors: false,
    ...options
  };

  if (!convex) {
    console.warn("[SafeQuery] Convex client not initialized");
    return null;
  }

  // Check Clerk auth state first
  const authStateData = get(authState);
  if (!authStateData.clerkUserId) {
    // Debug: No user authenticated for query
    // console.log("[SafeQuery] No user authenticated, skipping query");
    return null;
  }

  // Ensure Convex auth is actually initiated before waiting.
  // Without this, callers could wait for isAuthReady() forever without triggering token fetches.
  if (!isAuthReady()) {
    if (DEBUG_VERBOSE) {
      console.log("⏳ Query: Auth not ready, triggering token fetch...");
    }
    // Fire a token refresh to kick off Convex's setAuth flow
    await refreshConvexToken();

    // Wait for Convex authentication to be ready (bounded wait)
    const maxWaitTime = 10000;
    const startTime = Date.now();
    while (!isAuthReady() && Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!isAuthReady()) {
      console.warn(
        "[SafeQuery] Convex authentication still not ready after waiting, skipping query"
      );
      authState.setError("Convex authentication timed out - please refresh the page");
      return null;
    }

    if (DEBUG_VERBOSE) {
      console.log("✅ Query: Auth ready");
    }
  }

  // Single attempt execution - no retries to prevent app overload
  try {
    // Avoid forcing token refresh here; convex client setAuth already caches
    // and refreshes as needed. This prevents duplicate refresh logs.
    const convexClient = convex();
    if (!convexClient) {
      console.warn("[SafeQuery] Convex client not available at query time");
      return null;
    }
    return await convexClient.query(queryFn, args as any);
  } catch (error) {
    if (opts.logErrors) {
      console.error("[SafeQuery] Error:", error);
    }

    if (error instanceof Error) {
      // Extract more detailed error information
      let errorDetails = "";
      if (error.message.includes("Not authenticated")) {
        errorDetails = "Authentication error: JWT token may be invalid or expired";

        // Check for more specific error details
        if (error.message.includes("JWT")) {
          errorDetails = `JWT validation error: ${error.message}`;
        } else if (error.message.includes("token")) {
          errorDetails = `Token error: ${error.message}`;
        }

        // Record the error in auth state for UI display
        authState.setError(errorDetails);
      }
    }

    if (opts.throwErrors) {
      throw error;
    }

    return null;
  }
}

/**
 * Safe wrapper for Convex mutation operations with error handling and retries
 *
 * @param mutationFn - The Convex mutation function to execute
 * @param args - Arguments to pass to the mutation
 * @param options - Additional options for the mutation execution
 * @returns Result of the mutation or null if failed
 */
export async function safeMutation<T = unknown, A = unknown>(
  mutationFn: any, // Using any for convex function type compatibility - required for generic function references
  args?: A,
  options?: {
    retries?: number;
    logErrors?: boolean;
    throwErrors?: boolean;
  }
): Promise<T | null> {
  const opts = {
    retries: MAX_RETRIES,
    logErrors: true,
    throwErrors: false,
    ...options
  };

  if (!convex) {
    console.warn("[SafeMutation] Convex client not initialized");
    return null;
  }

  // Check Clerk auth state first
  const authStateData = get(authState);
  if (!authStateData.clerkUserId) {
    // Debug: No user authenticated for mutation
    // console.log("[SafeMutation] No user authenticated, skipping mutation");
    return null;
  }

  // Ensure Convex auth is actually initiated before waiting to avoid deadlock.
  if (!isAuthReady()) {
    if (DEBUG_VERBOSE) {
      console.log("⏳ Mutation: Auth not ready, triggering token fetch...");
    }
    await refreshConvexToken();

    // Bounded wait for Convex auth to be ready
    const maxWaitTime = 10000;
    const startTime = Date.now();
    while (!isAuthReady() && Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!isAuthReady()) {
      console.warn(
        "[SafeMutation] Convex authentication still not ready after waiting, skipping mutation"
      );
      authState.setError("Convex authentication timed out - please refresh the page");
      return null;
    }

    if (DEBUG_VERBOSE) {
      console.log("✅ Mutation: Auth ready");
    }
  }

  // Single attempt execution - no retries to prevent app overload
  try {
    // Avoid forcing token refresh here; convex client setAuth already caches
    // and refreshes as needed. This prevents duplicate refresh logs.
    const convexClient = convex();
    if (!convexClient) {
      console.warn("[SafeMutation] Convex client not available at mutation time");
      return null;
    }
    return await convexClient.mutation(mutationFn, args as any);
  } catch (error) {
    if (opts.logErrors) {
      console.error("[SafeMutation] Error:", error);
    }

    if (error instanceof Error) {
      // Extract more detailed error information
      let errorDetails = "";
      if (error.message.includes("Not authenticated")) {
        errorDetails = "Authentication error: JWT token may be invalid or expired";

        // Check for more specific error details
        if (error.message.includes("JWT")) {
          errorDetails = `JWT validation error: ${error.message}`;
        } else if (error.message.includes("token")) {
          errorDetails = `Token error: ${error.message}`;
        }

        // Record the error in auth state for UI display
        authState.setError(errorDetails);
      }
    }

    if (opts.throwErrors) {
      throw error;
    }

    return null;
  }
}
