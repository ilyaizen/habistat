/**
 * Centralized Convex Operations
 *
 * This module provides DRY utilities for Convex operations across all stores.
 * Uses safe query/mutation wrappers to handle authentication and retries consistently.
 */

import { safeMutation, safeQuery } from "./safe-query";

/**
 * Safe Convex query wrapper for store operations
 *
 * @param queryFn - The Convex query function
 * @param args - Query arguments
 * @param options - Additional options
 * @returns Promise resolving to query result or null
 */
export async function convexQuery<T = unknown, A = unknown>(
  queryFn: any,
  args?: A,
  options?: {
    retries?: number;
    logErrors?: boolean;
    throwErrors?: boolean;
  }
): Promise<T | null> {
  return safeQuery<T, A>(queryFn, args, options);
}

/**
 * Safe Convex mutation wrapper for store operations
 *
 * @param mutationFn - The Convex mutation function
 * @param args - Mutation arguments
 * @param options - Additional options
 * @returns Promise resolving to mutation result or null
 */
export async function convexMutation<T = unknown, A = unknown>(
  mutationFn: any,
  args?: A,
  options?: {
    retries?: number;
    logErrors?: boolean;
    throwErrors?: boolean;
  }
): Promise<T | null> {
  return safeMutation<T, A>(mutationFn, args, options);
}

/**
 * Convex subscription wrapper for store operations
 * Uses the Convex client directly since subscriptions require the raw client
 *
 * @param queryFn - The Convex query function to subscribe to
 * @param args - Query arguments
 * @param callback - Callback function for subscription updates
 * @returns Unsubscribe function or null if client unavailable
 */
export function convexSubscription<T = unknown, A = unknown>(
  queryFn: any,
  args: A,
  callback: (result: T) => void
): (() => void) | null {
  // For subscriptions, we still need to use the raw Convex client
  // since safe-query doesn't support subscriptions
  const { getConvexClient } = require("./convex");
  const convexClient = getConvexClient();

  if (!convexClient) {
    console.warn("Convex client not available for subscription");
    return null;
  }

  try {
    return convexClient.onUpdate(queryFn, args, callback);
  } catch (error) {
    console.error("Failed to create Convex subscription:", error);
    return null;
  }
}
