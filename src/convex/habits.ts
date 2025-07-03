import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
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

    const habits = await ctx.db
      .query("habits")
      .withIndex("by_user_id_and_pos", (q) => q.eq("userId", identity.subject))
      .collect();

    return habits;
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
    clientCreatedAt: v.number(),
    clientUpdatedAt: v.number()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

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
      clientCreatedAt: args.clientCreatedAt,
      clientUpdatedAt: args.clientUpdatedAt
    });

    return habitId;
  }
});

// Update an existing habit
export const updateHabit = mutation({
  args: {
    localUuid: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.string()),
    timerEnabled: v.optional(v.boolean()),
    targetDurationSeconds: v.optional(v.number()),
    pointsValue: v.optional(v.number()),
    position: v.optional(v.number()),
    isEnabled: v.optional(v.boolean()),
    clientUpdatedAt: v.number()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const habit = await ctx.db
      .query("habits")
      .filter((q) => q.eq(q.field("localUuid"), args.localUuid))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!habit) {
      throw new Error("Habit not found");
    }

    await ctx.db.patch(habit._id, {
      name: args.name,
      description: args.description,
      type: args.type,
      timerEnabled: args.timerEnabled,
      targetDurationSeconds: args.targetDurationSeconds,
      pointsValue: args.pointsValue,
      position: args.position,
      isEnabled: args.isEnabled,
      clientUpdatedAt: args.clientUpdatedAt
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
      .filter((q) => q.eq(q.field("localUuid"), args.localUuid))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!habit) {
      throw new Error("Habit not found");
    }

    await ctx.db.delete(habit._id);
    return habit._id;
  }
});
