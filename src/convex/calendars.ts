import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { enforceRateLimit } from "./rateLimit";
import type { CalendarColor } from "./constants";

// Phase 3.7: Allowed calendar color names and normalization (server-side Step 1)
const ALLOWED_CALENDAR_COLORS = [
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "red",
  "orange",
  "amber",
  "yellow"
];

function normalizeCalendarColorServer(value: string | null | undefined): CalendarColor {
  const DEFAULT_NAME: CalendarColor = "indigo";
  if (!value) return DEFAULT_NAME;
  const raw = value.trim().toLowerCase();
  if (ALLOWED_CALENDAR_COLORS.includes(raw)) return raw as CalendarColor;
  const base = raw.includes("-") ? raw.split("-")[0] : raw;
  if (ALLOWED_CALENDAR_COLORS.includes(base)) return base as CalendarColor;
  return DEFAULT_NAME;
}

// Helper to get user ID from auth context
// Returns Clerk user ID directly (no database lookup needed)
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
    colorTheme: v.string(), // Accept string input; normalized & schema enforces union
    position: v.number(),
    isEnabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number()
  },
  handler: async (ctx: MutationCtx, args) => {
    const userId = await getUserId(ctx);

    // Normalize colorTheme (Step 1). Log when normalization occurs.
    const normalizedColor = normalizeCalendarColorServer(args.colorTheme);
    if (normalizedColor !== args.colorTheme) {
      console.warn(
        `calendars.createCalendar: normalized colorTheme '${args.colorTheme}' -> '${normalizedColor}'`
      );
    }

    const existing = await ctx.db
      .query("calendars")
      .withIndex("by_user_local_uuid", (q) =>
        q.eq("userId", userId).eq("localUuid", args.localUuid)
      )
      .unique();

    if (existing) {
      if (args.updatedAt > existing.updatedAt) {
        const patchData: {
          name: string;
          colorTheme: CalendarColor;
          position: number;
          isEnabled: boolean;
          updatedAt: number;
        } = {
          name: args.name,
          colorTheme: normalizedColor,
          position: args.position,
          isEnabled: args.isEnabled,
          updatedAt: args.updatedAt
        };
        await ctx.db.patch(existing._id, patchData);
        return existing._id;
      }
      return existing._id;
    }

    // Rate limit on creating calendars to avoid abuse
    await enforceRateLimit(ctx, userId, "calendars.create", {
      limit: 60,
      windowSeconds: 60
    });

    const calendarId = await ctx.db.insert("calendars", {
      userId,
      localUuid: args.localUuid,
      name: args.name,
      colorTheme: normalizedColor,
      position: args.position,
      isEnabled: args.isEnabled,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt
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
    updatedAt: v.number()
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

    if (args.updatedAt <= existingCalendar.updatedAt) {
      return existingCalendar._id;
    }

    // Normalize color if present
    if (typeof updates.colorTheme === "string") {
      const normalized = normalizeCalendarColorServer(updates.colorTheme);
      if (normalized !== updates.colorTheme) {
        console.warn(
          `calendars.updateCalendar: normalized colorTheme '${updates.colorTheme}' -> '${normalized}'`
        );
      }
      (updates as any).colorTheme = normalized as CalendarColor;
    }
    const patchData: {
      name?: string;
      colorTheme?: CalendarColor;
      position?: number;
      isEnabled?: boolean;
      updatedAt: number;
    } = updates as any;
    await ctx.db.patch(existingCalendar._id, patchData);
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
      .withIndex("by_user_position", (q) => q.eq("userId", userId))
      .collect();
  }
});
