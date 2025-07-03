import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";

// Helper to get user ID from auth context
async function getUserId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("User not authenticated. Unable to process request.");
  }
  return identity.subject;
}

export const createCalendar = mutation({
  args: {
    localUuid: v.string(),
    name: v.string(),
    colorTheme: v.string(),
    position: v.number(),
    isEnabled: v.boolean(),
    clientCreatedAt: v.number(),
    clientUpdatedAt: v.number()
  },
  handler: async (ctx: MutationCtx, args) => {
    const userId = await getUserId(ctx);

    const existing = await ctx.db
      .query("calendars")
      .withIndex("by_user_local_uuid", (q) =>
        q.eq("userId", userId).eq("localUuid", args.localUuid)
      )
      .unique();

    if (existing) {
      if (args.clientUpdatedAt > existing.clientUpdatedAt) {
        await ctx.db.patch(existing._id, {
          name: args.name,
          colorTheme: args.colorTheme,
          position: args.position,
          isEnabled: args.isEnabled,
          clientUpdatedAt: args.clientUpdatedAt
        });
        return existing._id;
      }
      return existing._id;
    }

    const calendarId = await ctx.db.insert("calendars", {
      userId,
      localUuid: args.localUuid,
      name: args.name,
      colorTheme: args.colorTheme,
      position: args.position,
      isEnabled: args.isEnabled,
      clientCreatedAt: args.clientCreatedAt,
      clientUpdatedAt: args.clientUpdatedAt
    });
    return calendarId;
  }
});

export const updateCalendar = mutation({
  args: {
    localUuid: v.string(),
    name: v.optional(v.string()),
    colorTheme: v.optional(v.string()),
    position: v.optional(v.number()),
    isEnabled: v.optional(v.boolean()),
    clientUpdatedAt: v.number()
  },
  handler: async (ctx: MutationCtx, args) => {
    const userId = await getUserId(ctx);
    const { localUuid, ...updates } = args;

    const existingCalendar = await ctx.db
      .query("calendars")
      .withIndex("by_user_local_uuid", (q) => q.eq("userId", userId).eq("localUuid", localUuid))
      .unique();

    if (!existingCalendar) {
      throw new Error(`Calendar with localUuid '''${localUuid}''' not found for user.`);
    }

    if (args.clientUpdatedAt <= existingCalendar.clientUpdatedAt) {
      return existingCalendar._id;
    }

    await ctx.db.patch(existingCalendar._id, updates);
    return existingCalendar._id;
  }
});

export const deleteCalendar = mutation({
  args: {
    localUuid: v.string()
  },
  handler: async (ctx: MutationCtx, args) => {
    const userId = await getUserId(ctx);
    const existingCalendar = await ctx.db
      .query("calendars")
      .withIndex("by_user_local_uuid", (q) =>
        q.eq("userId", userId).eq("localUuid", args.localUuid)
      )
      .unique();

    if (!existingCalendar) {
      return null;
    }
    await ctx.db.delete(existingCalendar._id);
    return existingCalendar._id;
  }
});

export const getUserCalendars = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const userId = identity.subject;
    return await ctx.db
      .query("calendars")
      .withIndex("by_user_id_and_pos", (q) => q.eq("userId", userId))
      .collect();
  }
});
