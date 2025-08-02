/**
 * Authenticated query hooks that prevent race conditions
 * These hooks ensure queries only execute when authentication is fully ready
 */

import {
  type OptionalRestArgsOrSkip,
  type PaginatedQueryArgs,
  type PaginatedQueryReference,
  useConvexAuth,
  usePaginatedQuery,
  useQuery
} from "convex/react";
import type { FunctionReference } from "convex/server";

/**
 * Hook that waits for authentication before executing a query
 * Prevents the race condition where queries execute before auth is ready
 */
export function useAuthenticatedQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: OptionalRestArgsOrSkip<Query>[0] | "skip"
) {
  const { isLoading, isAuthenticated } = useConvexAuth();

  // Only execute query when authentication is confirmed
  return useQuery(query, isAuthenticated ? args : "skip");
}

/**
 * Hook for paginated queries that waits for authentication
 */
export function useAuthenticatedPaginatedQuery<Query extends PaginatedQueryReference>(
  query: Query,
  args: PaginatedQueryArgs<Query> | "skip",
  options: { initialNumItems: number }
) {
  const { isLoading, isAuthenticated } = useConvexAuth();

  // Only execute query when authentication is confirmed
  return usePaginatedQuery(query, isAuthenticated ? args : "skip", options);
}

/**
 * Hook that provides authentication status with better loading states
 */
export function useAuthenticationStatus() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  return {
    isLoading,
    isAuthenticated,
    isReady: !isLoading && isAuthenticated,
    canQuery: !isLoading && isAuthenticated
  };
}
