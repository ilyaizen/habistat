import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { enforceRateLimit } from "./rateLimit";
// import type { Id } from "./_generated/dataModel";
import type { Id } from "./_generated/dataModel";

// --- Schema ---
// This is defined in schema.ts, but we reference it here for type safety
// habits: {
//   localUuid: v.string(),
//   userId: v.string(),
//   calendarId: v.string(),
//   name: v.string(),
//   description: v.optional(v.string()),
//   type: v.string(), // 'positive' | 'negative'
//   timerEnabled: v.boolean(),
//   targetDurationSeconds: v.optional(v.number()),
//   pointsValue: v.optional(v.number()),
//   position: v.number(),
//   clientCreatedAt: v.number(),
//   clientUpdatedAt: v.number()
// }

// --- Queries ---

// Get all habits for the current user
export const getUserHabits = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Use index by_user_position and order to ensure deterministic, scalable fetch
    const habits = await ctx.db
      .query("habits")
      .withIndex("by_user_position", (q) => q.eq("userId", identity.subject))
      .order("asc")
      .collect();

    return habits;
  }
});

// Get a habit by its local UUID (used for habit ID mapping in sync)
export const getHabitByLocalUuid = query({
  args: {
    localUuid: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const habit = await ctx.db
      .query("habits")
      .withIndex("by_user_local_uuid", (q) =>
        q.eq("userId", identity.subject).eq("localUuid", args.localUuid)
      )
      .first();

    return habit;
  }
});

// Map Convex habit _ids to localUuid values for the current user.
export const mapLocalUuidsByConvexIds = query({
  args: { habitIds: v.array(v.string()) },
  returns: v.record(v.string(), v.string()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const result: Record<string, string> = {};
    for (const id of args.habitIds) {
      try {
        const habit = await ctx.db.get(id as Id<"habits">);
        if (habit && habit.userId === identity.subject) {
          result[id] = habit.localUuid;
        }
      } catch {
        // Ignore invalid ids
      }
    }
    return result;
  }
});

// --- Mutations ---

// Create a new habit
export const createHabit = mutation({
  args: {
    localUuid: v.string(),
    calendarId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    timerEnabled: v.boolean(),
    targetDurationSeconds: v.optional(v.number()),
    pointsValue: v.optional(v.number()),
    position: v.number(),
    isEnabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Idempotency: if a habit with this localUuid already exists for the user, treat as upsert
    const existing = await ctx.db
      .query("habits")
      .withIndex("by_user_local_uuid", (q) =>
        q.eq("userId", identity.subject).eq("localUuid", args.localUuid)
      )
      .first();

    if (existing) {
      // Only update if incoming is newer (Last-Write-Wins)
      if (args.updatedAt > existing.updatedAt) {
        await ctx.db.patch(existing._id, {
          calendarId: args.calendarId,
          name: args.name,
          description: args.description,
          type: args.type,
          timerEnabled: args.timerEnabled,
          targetDurationSeconds: args.targetDurationSeconds,
          pointsValue: args.pointsValue,
          position: args.position,
          isEnabled: args.isEnabled,
          updatedAt: args.updatedAt
        });
      }
      return existing._id;
    }

    // Basic rate limit to minimize abuse on create
    await enforceRateLimit(ctx, identity.subject, "habits.create", {
      limit: 120, // max creates per minute
      windowSeconds: 60
    });

    const habitId = await ctx.db.insert("habits", {
      localUuid: args.localUuid,
      userId: identity.subject,
      calendarId: args.calendarId,
      name: args.name,
      description: args.description,
      type: args.type,
      timerEnabled: args.timerEnabled,
      targetDurationSeconds: args.targetDurationSeconds,
      pointsValue: args.pointsValue,
      position: args.position,
      isEnabled: args.isEnabled,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt
    });

    // Best-effort dedupe: if multiple docs exist for the same (userId, localUuid),
    // keep the newest by updatedAt and delete others. This eliminates rare races.
    const siblings = await ctx.db
      .query("habits")
      .withIndex("by_user_local_uuid", (q) =>
        q.eq("userId", identity.subject).eq("localUuid", args.localUuid)
      )
      .collect();
    if (siblings.length > 1) {
      let keep = siblings[0];
      for (const h of siblings) {
        if ((h.updatedAt as number) > (keep.updatedAt as number)) keep = h;
      }
      for (const h of siblings) {
        if (h._id !== keep._id) {
          await ctx.db.delete(h._id);
        }
      }
      return keep._id;
    }

    return habitId;
  }
});

// --- Health/maintenance utilities ---

// Report duplicate habits per current user by localUuid
export const findHabitDuplicateLocalUuids = query({
  args: {},
  returns: v.array(
    v.object({
      localUuid: v.string(),
      count: v.number()
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const all = await ctx.db
      .query("habits")
      .withIndex("by_user_position", (q) => q.eq("userId", identity.subject))
      .collect();

    const counts = new Map<string, number>();
    for (const h of all) {
      counts.set(h.localUuid, (counts.get(h.localUuid) ?? 0) + 1);
    }
    const result: Array<{ localUuid: string; count: number }> = [];
    for (const [localUuid, count] of counts) {
      if (count > 1) result.push({ localUuid, count });
    }
    return result;
  }
});

// Deduplicate habits by keeping the most recently updated doc for each localUuid
export const dedupeHabitsForCurrentUser = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const all = await ctx.db
      .query("habits")
      .withIndex("by_user_position", (q) => q.eq("userId", identity.subject))
      .collect();

    const byLocal = new Map<string, typeof all>();
    for (const h of all) {
      const arr = byLocal.get(h.localUuid) ?? [];
      arr.push(h);
      byLocal.set(h.localUuid, arr);
    }

    let deleted = 0;
    for (const [, arr] of byLocal) {
      if (arr.length <= 1) continue;
      // Keep the document with the greatest updatedAt; delete others
      let keep = arr[0];
      for (const h of arr) {
        if ((h.updatedAt as number) > (keep.updatedAt as number)) keep = h;
      }
      for (const h of arr) {
        if (h._id !== keep._id) {
          await ctx.db.delete(h._id);
          deleted += 1;
        }
      }
    }
    return deleted;
  }
});

// Update an existing habit
export const updateHabit = mutation({
  args: {
    localUuid: v.string(),
    calendarId: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.string()),
    timerEnabled: v.optional(v.boolean()),
    targetDurationSeconds: v.optional(v.number()),
    pointsValue: v.optional(v.number()),
    position: v.optional(v.number()),
    isEnabled: v.optional(v.boolean()),
    updatedAt: v.number()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const habit = await ctx.db
      .query("habits")
      .withIndex("by_user_local_uuid", (q) =>
        q.eq("userId", identity.subject).eq("localUuid", args.localUuid)
      )
      .first();

    if (!habit) {
      throw new Error("Habit not found");
    }

    await ctx.db.patch(habit._id, {
      calendarId: args.calendarId,
      name: args.name,
      description: args.description,
      type: args.type,
      timerEnabled: args.timerEnabled,
      targetDurationSeconds: args.targetDurationSeconds,
      pointsValue: args.pointsValue,
      position: args.position,
      isEnabled: args.isEnabled,
      updatedAt: args.updatedAt
    });

    return habit._id;
  }
});

// Delete a habit
export const deleteHabit = mutation({
  args: {
    localUuid: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const habit = await ctx.db
      .query("habits")
      .withIndex("by_user_local_uuid", (q) =>
        q.eq("userId", identity.subject).eq("localUuid", args.localUuid)
      )
      .first();

    if (!habit) {
      throw new Error("Habit not found");
    }

    // Cascade-delete: remove all completions for this habit for the current user.
    // We don't have a dedicated index by (userId, habitId), so we leverage the
    // by_user_completed_at index and filter by habitId. This keeps correctness with
    // acceptable performance for typical user datasets.
    const completionsForHabit = await ctx.db
      .query("completions")
      .withIndex("by_user_completed_at", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("habitId"), habit._id))
      .collect();

    for (const c of completionsForHabit) {
      await ctx.db.delete(c._id);
    }

    await ctx.db.delete(habit._id);
    return habit._id;
  }
});
