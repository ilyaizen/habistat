/**
 * Safe Query Utilities for Convex
 *
 * This module provides helper functions to safely execute Convex queries and mutations
 * with proper error handling for authentication issues.
 */

import { get } from "svelte/store";
import { authState } from "$lib/stores/auth-state";
import { convex, isAuthReady, refreshConvexToken } from "./convex";

// Maximum number of retry attempts
const MAX_RETRIES = 3;

// Base delay for exponential backoff (in ms)
const BASE_DELAY = 1000;

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

  // Wait for Convex authentication to be ready (this is the critical fix for race conditions)
  if (!isAuthReady()) {
    console.log("⏳ Query: Waiting for auth...");

    // Give Convex auth some time to complete (up to 10 seconds)
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

    console.log("✅ Query: Auth ready");
  }

  let attempt = 0;

  while (attempt < opts.retries) {
    try {
      // Add a small delay before executing the query to ensure auth is ready
      if (attempt > 0) {
        const delay = BASE_DELAY * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Execute the query - let Convex client handle auth internally
      // This allows the Convex client to retry auth as needed
      // Debug: Query attempt details
      if (attempt > 0) console.log(`🔄 Query: Retry ${attempt + 1}/${opts.retries}`);

      // Ensure the auth token is fresh before executing the query
      await refreshConvexToken();
      return await convex.query(queryFn, args as any);
    } catch (error) {
      attempt++;

      if (opts.logErrors) {
        console.error(`[SafeQuery] Error on attempt ${attempt}/${opts.retries}:`, error);
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

          // Handle auth errors specifically
          if (attempt < opts.retries) {
            const delay = BASE_DELAY * 2 ** attempt;
            console.log(`⚠️ Query: ${errorDetails}, retrying...`);
            await new Promise((resolve) => setTimeout(resolve, delay));

            // Trigger a Convex auth check
            authState.setConvexAuthStatus("pending");
            continue;
          }
        }
      }

      if (attempt >= opts.retries || !opts.throwErrors) {
        return null;
      }

      if (opts.throwErrors) {
        throw error;
      }
    }
  }

  return null;
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

  // Wait for Convex authentication to be ready (this is the critical fix for race conditions)
  if (!isAuthReady()) {
    console.log("⏳ Mutation: Waiting for auth...");

    // Give Convex auth some time to complete (up to 10 seconds)
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

    console.log("✅ Mutation: Auth ready");
  }

  let attempt = 0;

  while (attempt < opts.retries) {
    try {
      // Add a small delay before executing the mutation to ensure auth is ready
      if (attempt > 0) {
        const delay = BASE_DELAY * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Execute the mutation - let Convex client handle auth internally
      // This allows the Convex client to retry auth as needed
      // Debug: Mutation attempt details
      if (attempt > 0) console.log(`🔄 Mutation: Retry ${attempt + 1}/${opts.retries}`);

      // Ensure the auth token is fresh before executing the mutation
      await refreshConvexToken();
      return await convex.mutation(mutationFn, args as any);
    } catch (error) {
      attempt++;

      if (opts.logErrors) {
        console.error(`[SafeMutation] Error on attempt ${attempt}/${opts.retries}:`, error);
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

          // Handle auth errors specifically
          if (attempt < opts.retries) {
            const delay = BASE_DELAY * 2 ** attempt;
            console.log(`⚠️ Mutation: ${errorDetails}, retrying...`);
            await new Promise((resolve) => setTimeout(resolve, delay));

            // Trigger a Convex auth check
            authState.setConvexAuthStatus("pending");
            continue;
          }
        }
      }

      if (attempt >= opts.retries || !opts.throwErrors) {
        return null;
      }

      if (opts.throwErrors) {
        throw error;
      }
    }
  }

  return null;
}
