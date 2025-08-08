/**
 * Activity History Convex functions for syncing daily app usage data
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
// No need to import getCurrentUser - we'll use auth context directly

/**
 * Get activity history since a specific timestamp for sync
 */
export const getActivityHistorySince = query({
  args: {
    timestamp: v.number(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string())
  },
  handler: async (ctx, { timestamp, limit = 100, cursor }) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Use Clerk user ID directly as userId (no database lookup needed)
    const userId = identity.subject;

    // Build query by user/date and rely on _creationTime for incremental paging
    let query = ctx.db
      .query("activityHistory")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc");

    // Apply pagination
    const paginationResult = await query.paginate({
      cursor: cursor || null,
      numItems: limit
    });

    const filtered = paginationResult.page.filter((row) => row._creationTime >= timestamp);
    return {
      activityHistory: filtered.map((row) => ({
        _id: row._id,
        _creationTime: row._creationTime,
        localUuid: row.localUuid,
        date: row.date
      })),
      nextCursor: paginationResult.continueCursor,
      isDone: paginationResult.isDone
    };
  }
});

/**
 * Batch upsert activity history entries for sync
 */
export const batchUpsertActivityHistory = mutation({
  args: {
    entries: v.array(
      v.object({
        localUuid: v.string(),
        date: v.string()
      })
    )
  },
  handler: async (ctx, { entries }) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Use Clerk user ID directly as userId (no database lookup needed)
    const userId = identity.subject;
    const results: { localUuid: string; action: string }[] = [];

    for (const entry of entries) {
      // Check if entry already exists
      const existing = await ctx.db
        .query("activityHistory")
        .withIndex("by_user_local_uuid", (q) =>
          q.eq("userId", userId).eq("localUuid", entry.localUuid)
        )
        .first();

      if (existing) {
        // Replace localUuid/date to reflect latest association (idempotent)
        await ctx.db.patch(existing._id, { date: entry.date, localUuid: entry.localUuid });
        results.push({ localUuid: entry.localUuid, action: "updated" });
      } else {
        await ctx.db.insert("activityHistory", {
          userId,
          localUuid: entry.localUuid,
          date: entry.date
        });
        results.push({ localUuid: entry.localUuid, action: "created" });
      }
    }

    // Schedule dedupe to enforce one row per (userId, date)
    await ctx.scheduler.runAfter(0, internal.maintenance.dedupeActivityHistoryForUser, { userId });

    return { processed: results.length, results };
  }
});

/**
 * Get all activity history for a user (for migration or full sync)
 */
export const getAllActivityHistory = query({
  args: {},
  handler: async (ctx) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Use Clerk user ID directly as userId (no database lookup needed)
    const userId = identity.subject;

    return await ctx.db
      .query("activityHistory")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  }
});

/**
 * Migrate activity history from firstOpenAt to openedAt field
 * This is a one-time migration function to handle the schema change
 */
export const migrateActivityHistoryFields = mutation({
  args: {},
  handler: async (ctx) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    let migratedCount = 0;

    // Legacy migration retained for compatibility (no-op after R2)
    const records = await ctx.db
      .query("activityHistory")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();

    for (const record of records) {
      // Check if record has firstOpenAt but no openedAt
      // No field migration needed in minimal schema
    }

    return { migratedCount, totalRecords: records.length };
  }
});

/**
 * Delete activity history entry by local UUID
 */
export const deleteActivityHistory = mutation({
  args: {
    localUuid: v.string()
  },
  handler: async (ctx, { localUuid }) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Use Clerk user ID directly as userId (no database lookup needed)
    const userId = identity.subject;

    const entry = await ctx.db
      .query("activityHistory")
      .withIndex("by_user_local_uuid", (q) =>
        q.eq("userId", userId).eq("localUuid", localUuid)
      )
      .first();

    if (entry) {
      await ctx.db.delete(entry._id);
      return { deleted: true };
    }

    return { deleted: false };
  }
});
