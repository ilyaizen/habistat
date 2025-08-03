/**
 * Authentication helper functions for Convex backend
 * Provides better error handling and debugging for auth issues
 */

import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";

/**
 * Get current user identity with detailed error reporting
 * Helps debug authentication issues by providing specific error messages
 */
export async function getCurrentUserIdentity(ctx: QueryCtx | MutationCtx | ActionCtx) {
  try {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      console.log("🔐 Auth: No user identity found");
      return null;
    }

    console.log("✅ Auth: User identity found");
    return identity;
  } catch (error) {
    console.error("❌ Auth: Error getting user identity:", error);
    throw new ConvexError("Authentication system error");
  }
}

/**
 * Require authentication or throw detailed error
 * Use this in functions that must have an authenticated user
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const identity = await getCurrentUserIdentity(ctx);

  if (!identity) {
    console.log("🔒 Auth: Authentication required but user not authenticated");
    throw new ConvexError("Not authenticated - please sign in to continue");
  }

  return identity;
}

/**
 * Get current user identity with optional fallback
 * Returns null if not authenticated, throws only on system errors
 */
export async function getCurrentUserOptional(ctx: QueryCtx | MutationCtx | ActionCtx) {
  try {
    return await getCurrentUserIdentity(ctx);
  } catch (error) {
    console.error("❌ Auth: System error during authentication check:", error);
    return null;
  }
}