/**
 * Safe Query Utilities for Convex
 *
 * This module provides helper functions to safely execute Convex queries and mutations
 * with proper error handling for authentication issues.
 */

import { get } from "svelte/store";
import { authStateStore } from "$lib/stores/auth-state";
import { convex, isAuthReady } from "./convex";

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

  // Check auth state first
  const authState = get(authStateStore);
  if (!authState.clerkUserId) {
    console.log("[SafeQuery] No user authenticated, skipping query");
    return null;
  }

  let attempt = 0;

  while (attempt < opts.retries) {
    try {
      // Check if auth is ready
      if (!isAuthReady()) {
        // If not ready, check if we should wait or fail
        if (attempt < opts.retries - 1) {
          attempt++;
          const delay = BASE_DELAY * 2 ** attempt;
          console.log(
            `[SafeQuery] Auth not ready, waiting ${delay}ms before retry ${attempt}/${opts.retries}`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        } else {
          console.warn("[SafeQuery] Auth not ready after retries");
          return null;
        }
      }

      // Execute the query
      return await convex.query(queryFn, args as any);
    } catch (error) {
      attempt++;

      if (opts.logErrors) {
        console.error(`[SafeQuery] Error on attempt ${attempt}/${opts.retries}:`, error);
      }

      if (error instanceof Error && error.message.includes("Not authenticated")) {
        // Handle auth errors specifically
        if (attempt < opts.retries) {
          const delay = BASE_DELAY * 2 ** attempt;
          console.log(`[SafeQuery] Auth error, retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Trigger a Convex auth check
          authStateStore.checkConvexAuth();
          continue;
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

  // Check auth state first
  const authState = get(authStateStore);
  if (!authState.clerkUserId) {
    console.log("[SafeMutation] No user authenticated, skipping mutation");
    return null;
  }

  let attempt = 0;

  while (attempt < opts.retries) {
    try {
      // Check if auth is ready
      if (!isAuthReady()) {
        // If not ready, check if we should wait or fail
        if (attempt < opts.retries - 1) {
          attempt++;
          const delay = BASE_DELAY * 2 ** attempt;
          console.log(
            `[SafeMutation] Auth not ready, waiting ${delay}ms before retry ${attempt}/${opts.retries}`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        } else {
          console.warn("[SafeMutation] Auth not ready after retries");
          return null;
        }
      }

      // Execute the mutation
      return await convex.mutation(mutationFn, args as any);
    } catch (error) {
      attempt++;

      if (opts.logErrors) {
        console.error(`[SafeMutation] Error on attempt ${attempt}/${opts.retries}:`, error);
      }

      if (error instanceof Error && error.message.includes("Not authenticated")) {
        // Handle auth errors specifically
        if (attempt < opts.retries) {
          const delay = BASE_DELAY * 2 ** attempt;
          console.log(`[SafeMutation] Auth error, retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Trigger a Convex auth check
          authStateStore.checkConvexAuth();
          continue;
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
