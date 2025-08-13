import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";

/**
 * Simple per-user action rate limiting using a windowed counter in Convex.
 *
 * Why: Throttle abusive clients and reduce the chance of DDOSing write paths.
 * How: Maintain counters keyed by (userId, action, windowStartSeconds).
 * This is coarse but effective and has minimal storage and CPU overhead.
 */

export type Ctx = MutationCtx;

/** Compute the start of the current window in seconds. Extracted for testability. */
export function computeWindowStart(nowSeconds: number, windowSeconds: number): number {
  if (windowSeconds <= 0) return nowSeconds;
  return nowSeconds - (nowSeconds % windowSeconds);
}

/**
 * Enforce a rate limit for a given user and action.
 * - If the request budget is exhausted for the current window, throws an Error.
 * - Otherwise increments the counter.
 */
export async function enforceRateLimit(
  ctx: Ctx,
  userId: string,
  action: string,
  {
    limit,
    windowSeconds
  }: {
    limit: number; // max requests per window
    windowSeconds: number; // e.g., 60
  }
): Promise<void> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = computeWindowStart(nowSeconds, windowSeconds);

  // Lookup the current counter for this (userId, action, windowStart)
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_action_window", (q) =>
      q.eq("userId", userId).eq("action", action).eq("windowStart", windowStart)
    )
    .first();

  if (existing) {
    const next = (existing.count as number) + 1;
    if (next > limit) {
      throw new Error(`Rate limit exceeded for ${action}. Try again later.`);
    }
    await ctx.db.patch(existing._id, { count: next });
    return;
  }

  // Create first counter for this window
  await ctx.db.insert("rateLimits", {
    userId,
    action,
    windowStart,
    count: 1
  });
}


