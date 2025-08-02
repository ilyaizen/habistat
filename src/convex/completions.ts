import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, getCurrentUserOptional } from "./auth_helpers";
// import { api } from "./_generated/api";

/**
 * Create a new completion record on the server.
 * This is called during sync when pushing local changes to cloud.
 */
export const createCompletion = mutation({
  args: {
    localUuid: v.string(),
    habitId: v.string(), // This should be the Convex habit ID, not local UUID
    completedAt: v.number()
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    // Check if completion with this localUuid already exists
    const existing = await ctx.db
      .query("completions")
      .withIndex("by_local_uuid", (q) =>
        q.eq("userId", identity.subject).eq("localUuid", args.localUuid)
      )
      .first();

    if (existing) {
      // For ultra-simple completions, just update the completedAt time
      // (use completedAt as the conflict resolution timestamp)
      if (args.completedAt > existing.completedAt) {
        await ctx.db.patch(existing._id, {
          habitId: args.habitId,
          completedAt: args.completedAt
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
      completedAt: args.completedAt
    });

    return completionId;
  }
});

/**
 * Update an existing completion record.
 * Used primarily for timestamp updates.
 */
export const updateCompletion = mutation({
  args: {
    localUuid: v.string(),
    completedAt: v.number()
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    const completion = await ctx.db
      .query("completions")
      .withIndex("by_local_uuid", (q) =>
        q.eq("userId", identity.subject).eq("localUuid", args.localUuid)
      )
      .first();

    if (!completion) {
      throw new Error("Completion not found");
    }

    // Only update if new completedAt is different (Last Write Wins using completedAt)
    if (args.completedAt !== completion.completedAt) {
      await ctx.db.patch(completion._id, {
        completedAt: args.completedAt
      });
    }

    return completion._id;
  }
});

/**
 * Get completions for the current user with pagination, with optional filter by habit.
 * Used for initial sync and fetching completion history.
 */
export const getUserCompletions = query({
  args: {
    habitId: v.optional(v.string()),
    since: v.optional(v.number()), // Timestamp for incremental sync
    limit: v.optional(v.number()), // Pagination limit (default 100)
    cursor: v.optional(v.string()) // Pagination cursor
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    const limit = args.limit || 100; // Default to 100 items per page

    let query = ctx.db
      .query("completions")
      .withIndex("by_user_completed_at", (q) => q.eq("userId", identity.subject));

    if (args.habitId) {
      query = query.filter((q) => q.eq(q.field("habitId"), args.habitId));
    }

    if (args.since) {
      query = query.filter((q) => q.gt(q.field("completedAt"), args.since!));
    }

    // Apply pagination
    const results = await query.paginate({
      cursor: args.cursor || null,
      numItems: limit
    });

    return {
      completions: results.page.map((completion) => ({
        _id: completion._id,
        localUuid: completion.localUuid,
        habitId: completion.habitId,
        completedAt: completion.completedAt
      })),
      nextCursor: results.continueCursor,
      isDone: results.isDone
    };
  }
});

/**
 * Get completions updated since a specific timestamp with pagination.
 * Used for incremental sync - only fetch changes since last sync.
 */
export const getCompletionsSince = query({
  args: {
    timestamp: v.number(),
    limit: v.optional(v.number()), // Pagination limit (default 100)
    cursor: v.optional(v.string()) // Pagination cursor
  },
  handler: async (ctx, args) => {
    // Use improved auth helper with detailed error reporting
    const identity = await requireAuth(ctx);

    const limit = args.limit || 100; // Default to 100 items per page

    let query = ctx.db
      .query("completions")
      .withIndex("by_user_completed_at", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.gt(q.field("completedAt"), args.timestamp));

    // Apply pagination
    const results = await query.paginate({
      cursor: args.cursor || null,
      numItems: limit
    });

    return {
      completions: results.page.map((completion) => ({
        _id: completion._id,
        localUuid: completion.localUuid,
        habitId: completion.habitId,
        completedAt: completion.completedAt
      })),
      nextCursor: results.continueCursor,
      isDone: results.isDone
    };
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
        completedAt: v.number()
      })
    )
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

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
        // Update if new completedAt is different
        if (completion.completedAt !== existing.completedAt) {
          await ctx.db.patch(existing._id, {
            habitId: completion.habitId,
            completedAt: completion.completedAt
          });
        }
        results.push(existing._id);
      } else {
        // Create new completion
        const completionId = await ctx.db.insert("completions", {
          userId: identity.subject,
          localUuid: completion.localUuid,
          habitId: completion.habitId,
          completedAt: completion.completedAt
        });
        results.push(completionId);
      }
    }

    return results;
  }
});
