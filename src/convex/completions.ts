import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Create a new completion record on the server.
 * This is called during sync when pushing local changes to cloud.
 */
export const createCompletion = mutation({
  args: {
    localUuid: v.string(),
    habitId: v.string(), // This should be the Convex habit ID, not local UUID
    completedAt: v.number(),
    notes: v.optional(v.string()),
    durationSpentSeconds: v.optional(v.number()),
    isDeleted: v.boolean(),
    clientCreatedAt: v.number(),
    clientUpdatedAt: v.number()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if completion with this localUuid already exists
    const existing = await ctx.db
      .query("completions")
      .withIndex("by_local_uuid", (q) =>
        q.eq("userId", identity.subject).eq("localUuid", args.localUuid)
      )
      .first();

    if (existing) {
      // Update existing record if client version is newer
      if (args.clientUpdatedAt > existing.clientUpdatedAt) {
        await ctx.db.patch(existing._id, {
          habitId: args.habitId,
          completedAt: args.completedAt,
          notes: args.notes,
          durationSpentSeconds: args.durationSpentSeconds,
          isDeleted: args.isDeleted,
          clientUpdatedAt: args.clientUpdatedAt
        });
        return existing._id;
      }
      return existing._id;
    }

    // Create new completion
    const completionId = await ctx.db.insert("completions", {
      userId: identity.subject,
      localUuid: args.localUuid,
      habitId: args.habitId,
      completedAt: args.completedAt,
      notes: args.notes,
      durationSpentSeconds: args.durationSpentSeconds,
      isDeleted: args.isDeleted,
      clientCreatedAt: args.clientCreatedAt,
      clientUpdatedAt: args.clientUpdatedAt
    });

    return completionId;
  }
});

/**
 * Update an existing completion record.
 * Used primarily for soft deletes and note updates.
 */
export const updateCompletion = mutation({
  args: {
    localUuid: v.string(),
    notes: v.optional(v.string()),
    durationSpentSeconds: v.optional(v.number()),
    isDeleted: v.boolean(),
    clientUpdatedAt: v.number()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const completion = await ctx.db
      .query("completions")
      .withIndex("by_local_uuid", (q) =>
        q.eq("userId", identity.subject).eq("localUuid", args.localUuid)
      )
      .first();

    if (!completion) {
      throw new Error("Completion not found");
    }

    // Only update if client version is newer (Last Write Wins)
    if (args.clientUpdatedAt > completion.clientUpdatedAt) {
      await ctx.db.patch(completion._id, {
        notes: args.notes,
        durationSpentSeconds: args.durationSpentSeconds,
        isDeleted: args.isDeleted,
        clientUpdatedAt: args.clientUpdatedAt
      });
    }

    return completion._id;
  }
});

/**
 * Get all completions for the current user, with optional filter by habit.
 * Used for initial sync and fetching completion history.
 */
export const getUserCompletions = query({
  args: {
    habitId: v.optional(v.string()),
    since: v.optional(v.number()) // Timestamp for incremental sync
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    let query = ctx.db
      .query("completions")
      .withIndex("by_user_habit", (q) => q.eq("userId", identity.subject));

    if (args.habitId) {
      query = query.filter((q) => q.eq(q.field("habitId"), args.habitId));
    }

    if (args.since) {
      query = query.filter((q) => q.gt(q.field("clientUpdatedAt"), args.since!));
    }

    const completions = await query.collect();

    return completions.map((completion) => ({
      _id: completion._id,
      localUuid: completion.localUuid,
      habitId: completion.habitId,
      completedAt: completion.completedAt,
      notes: completion.notes,
      durationSpentSeconds: completion.durationSpentSeconds,
      isDeleted: completion.isDeleted,
      clientCreatedAt: completion.clientCreatedAt,
      clientUpdatedAt: completion.clientUpdatedAt
    }));
  }
});

/**
 * Get completions updated since a specific timestamp.
 * Used for incremental sync - only fetch changes since last sync.
 */
export const getCompletionsSince = query({
  args: {
    timestamp: v.number()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const completions = await ctx.db
      .query("completions")
      .withIndex("by_user_updated_at", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.gt(q.field("clientUpdatedAt"), args.timestamp))
      .collect();

    return completions.map((completion) => ({
      _id: completion._id,
      localUuid: completion.localUuid,
      habitId: completion.habitId,
      completedAt: completion.completedAt,
      notes: completion.notes,
      durationSpentSeconds: completion.durationSpentSeconds,
      isDeleted: completion.isDeleted,
      clientCreatedAt: completion.clientCreatedAt,
      clientUpdatedAt: completion.clientUpdatedAt
    }));
  }
});

/**
 * Batch upsert completions for efficient sync.
 * Accepts multiple completion records and upserts them using Last Write Wins.
 */
export const batchUpsertCompletions = mutation({
  args: {
    completions: v.array(
      v.object({
        localUuid: v.string(),
        habitId: v.string(),
        completedAt: v.number(),
        notes: v.optional(v.string()),
        durationSpentSeconds: v.optional(v.number()),
        isDeleted: v.boolean(),
        clientCreatedAt: v.number(),
        clientUpdatedAt: v.number()
      })
    )
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const results = [];

    for (const completion of args.completions) {
      // Check if completion already exists
      const existing = await ctx.db
        .query("completions")
        .withIndex("by_local_uuid", (q) =>
          q.eq("userId", identity.subject).eq("localUuid", completion.localUuid)
        )
        .first();

      if (existing) {
        // Update if client version is newer
        if (completion.clientUpdatedAt > existing.clientUpdatedAt) {
          await ctx.db.patch(existing._id, {
            habitId: completion.habitId,
            completedAt: completion.completedAt,
            notes: completion.notes,
            durationSpentSeconds: completion.durationSpentSeconds,
            isDeleted: completion.isDeleted,
            clientUpdatedAt: completion.clientUpdatedAt
          });
        }
        results.push(existing._id);
      } else {
        // Create new completion
        const completionId = await ctx.db.insert("completions", {
          userId: identity.subject,
          localUuid: completion.localUuid,
          habitId: completion.habitId,
          completedAt: completion.completedAt,
          notes: completion.notes,
          durationSpentSeconds: completion.durationSpentSeconds,
          isDeleted: completion.isDeleted,
          clientCreatedAt: completion.clientCreatedAt,
          clientUpdatedAt: completion.clientUpdatedAt
        });
        results.push(completionId);
      }
    }

    return results;
  }
});
