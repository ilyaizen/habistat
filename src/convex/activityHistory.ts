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
    
    // Get user from database using clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    
    if (!user) {
      throw new Error("User not found in database");
    }
    
    const userId = user._id;
    
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
      timestamp: v.number(),
      clientUpdatedAt: v.number()
    }))
  },
  handler: async (ctx, { entries }) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    // Get user from database using clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    
    if (!user) {
      throw new Error("User not found in database");
    }
    
    const userId = user._id;
    const results = [];

    for (const entry of entries) {
      // Check if entry already exists
      const existing = await ctx.db
        .query("activityHistory")
        .withIndex("by_local_uuid", (q) => 
          q.eq("userId", userId).eq("localUuid", entry.localUuid)
        )
        .first();

      if (existing) {
        // Update if client timestamp is newer (Last Write Wins)
        if (entry.clientUpdatedAt > existing.clientUpdatedAt) {
          await ctx.db.patch(existing._id, {
            date: entry.date,
            timestamp: entry.timestamp,
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
          timestamp: entry.timestamp,
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
    
    // Get user from database using clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    
    if (!user) {
      throw new Error("User not found in database");
    }
    
    const userId = user._id;
    
    return await ctx.db
      .query("activityHistory")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
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
    
    // Get user from database using clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    
    if (!user) {
      throw new Error("User not found in database");
    }
    
    const userId = user._id;
    
    const entry = await ctx.db
      .query("activityHistory")
      .withIndex("by_local_uuid", (q) => 
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
