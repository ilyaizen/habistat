/**
 * Activity History Convex functions for syncing daily app usage data
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
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
    
    // Build the base query
    let query = ctx.db
      .query("activityHistory")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("clientUpdatedAt"), timestamp))
      .order("desc");

    // Apply pagination
    const paginationResult = await query.paginate({
      cursor: cursor || null,
      numItems: limit
    });
    
    return {
      activityHistory: paginationResult.page,
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
    entries: v.array(v.object({
      localUuid: v.string(),
      date: v.string(),
      openedAt: v.number(),
      clientUpdatedAt: v.number()
    }))
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
        // Update if client timestamp is newer (Last Write Wins)
        if (entry.clientUpdatedAt > existing.clientUpdatedAt) {
          await ctx.db.patch(existing._id, {
            date: entry.date,
            openedAt: entry.openedAt,
            clientUpdatedAt: entry.clientUpdatedAt
          });
          results.push({ localUuid: entry.localUuid, action: "updated" });
        } else {
          results.push({ localUuid: entry.localUuid, action: "skipped" });
        }
      } else {
        // Create new entry
        await ctx.db.insert("activityHistory", {
          userId,
          localUuid: entry.localUuid,
          date: entry.date,
          openedAt: entry.openedAt,
          clientUpdatedAt: entry.clientUpdatedAt
        });
        results.push({ localUuid: entry.localUuid, action: "created" });
      }
    }

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
    
    // Find all records with firstOpenAt but missing openedAt
    const records = await ctx.db
      .query("activityHistory")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();
    
    for (const record of records) {
      // Check if record has firstOpenAt but no openedAt
      if ((record as any).firstOpenAt && !(record as any).openedAt) {
        await ctx.db.patch(record._id, {
          openedAt: (record as any).firstOpenAt,
          firstOpenAt: undefined // Remove the old field
        });
        migratedCount++;
      }
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
