import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Lightweight telemetry counters stored in `maintenanceMetrics`.
 * Use to monitor normalization events and dedupe outcomes during Phase 3.7 rollout.
 */
export const incrementMetric = internalMutation({
  args: {
    key: v.string(),
    delta: v.optional(v.number())
  },
  returns: v.null(),
  handler: async (ctx, { key, delta }) => {
    const incrementBy = typeof delta === "number" ? delta : 1;
    const existing = await ctx.db
      .query("maintenanceMetrics")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        count: existing.count + incrementBy,
        lastUpdatedAt: Date.now()
      });
      return null;
    }
    await ctx.db.insert("maintenanceMetrics", {
      key,
      count: incrementBy,
      lastUpdatedAt: Date.now()
    });
    return null;
  }
});

/**
 * Dedupe activityHistory by (userId, date), keeping the row with max clientUpdatedAt.
 * Returns stats for telemetry.
 */
export const dedupeActivityHistoryForUser = internalMutation({
  args: { userId: v.string() },
  returns: v.object({ deleted: v.number(), kept: v.number(), touchedDates: v.number() }),
  handler: async (ctx, { userId }) => {
    // Load all rows for this user ordered by date to facilitate grouping
    const rows = await ctx.db
      .query("activityHistory")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();

    if (rows.length === 0) return { deleted: 0, kept: 0, touchedDates: 0 };

    // Group by date and choose winner by clientUpdatedAt
    const byDate = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = (byDate.get(row.date) as typeof rows | undefined) ?? [];
      list.push(row);
      byDate.set(row.date, list);
    }

    let deleted = 0;
    let kept = 0;
    for (const [date, list] of byDate) {
      if (list.length === 1) {
        kept += 1;
        continue;
      }
      // Pick the row with highest clientUpdatedAt; if tie, keep the newest _creationTime
      let winner = list[0];
      for (let i = 1; i < list.length; i++) {
        const row = list[i];
        if (
          row.clientUpdatedAt > winner.clientUpdatedAt ||
          (row.clientUpdatedAt === winner.clientUpdatedAt && row._creationTime > winner._creationTime)
        ) {
          winner = row;
        }
      }
      kept += 1;
      // Delete all non-winners
      for (const row of list) {
        if (row._id !== winner._id) {
          await ctx.db.delete(row._id);
          deleted += 1;
        }
      }
    }

    // Telemetry: increment deletions
    if (deleted > 0) {
      await ctx.runMutation(internal.maintenance.incrementMetric, {
        key: "activity_dedupe_deleted",
        delta: deleted
      });
    }
    return { deleted, kept, touchedDates: byDate.size };
  }
});

/**
 * Iterate all users and dedupe their activity history.
 * Implemented as an action to orchestrate per-user mutations.
 */
export const dedupeAllActivityHistory = internalAction({
  args: {},
  returns: v.object({ usersProcessed: v.number(), totalDeleted: v.number() }),
  handler: async (ctx) => {
    "use node";
    let usersProcessed = 0;
    let totalDeleted = 0;

    // Iterate users table using pagination to avoid timeouts
    let cursor: string | undefined = undefined;
    do {
      const page: { users: Array<{ clerkId: string }>; nextCursor: string | null } =
        await ctx.runQuery(internal.maintenance.listUsersPage, { cursor });
      for (const user of page.users) {
        const result = await ctx.runMutation(internal.maintenance.dedupeActivityHistoryForUser, {
          userId: user.clerkId
        });
        usersProcessed += 1;
        totalDeleted += result.deleted;
      }
      cursor = page.nextCursor ?? undefined;
    } while (cursor !== undefined);

    return { usersProcessed, totalDeleted };
  }
});

export const listUsersPage = internalQuery({
  args: { cursor: v.optional(v.string()) },
  returns: v.object({
    users: v.array(
      v.object({ clerkId: v.string() })
    ),
    nextCursor: v.union(v.string(), v.null())
  }),
  handler: async (ctx, { cursor }) => {
    // Page through users to collect their Clerk IDs
    const q = ctx.db.query("users");
    const page = await q.paginate({ cursor: cursor ?? null, numItems: 100 });
    return {
      users: page.page.map((u) => ({ clerkId: u.clerkId })),
      nextCursor: page.continueCursor
    };
  }
});


