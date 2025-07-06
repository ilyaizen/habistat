import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Define the 'users' table (SaaS-ready)
  users: defineTable({
    clerkId: v.string(), // From Clerk
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    subscriptionId: v.optional(v.string()), // Stripe Subscription ID
    subscriptionTier: v.optional(
      v.union(v.literal("free"), v.literal("premium_monthly"), v.literal("premium_lifetime"))
    ),
    subscriptionExpiresAt: v.optional(v.number()) // Timestamp
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_subscription_id", ["subscriptionId"]),

  calendars: defineTable({
    userId: v.string(), // Clerk User ID (from identity.subject)
    localUuid: v.string(), // The original UUID from the client/local DB for mapping
    name: v.string(),
    colorTheme: v.string(),
    position: v.number(),
    isEnabled: v.boolean(),
    clientCreatedAt: v.number(), // Timestamp from client for LWW
    clientUpdatedAt: v.number() // Timestamp from client for LWW
  })
    .index("by_user_id_and_pos", ["userId", "position"]) // For sorted fetching by user
    .index("by_user_local_uuid", ["userId", "localUuid"]), // For finding/updating specific item by its local ID

  habits: defineTable({
    userId: v.string(), // Clerk User ID (from identity.subject)
    localUuid: v.string(), // The original UUID from the client/local DB for mapping
    calendarId: v.string(), // Reference to the calendar this habit belongs to
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(), // 'positive' | 'negative'
    timerEnabled: v.boolean(),
    targetDurationSeconds: v.optional(v.number()),
    pointsValue: v.optional(v.number()),
    position: v.number(),
    isEnabled: v.boolean(),
    clientCreatedAt: v.number(), // Timestamp from client for LWW
    clientUpdatedAt: v.number() // Timestamp from client for LWW
  })
    .index("by_user_id_and_pos", ["userId", "position"]) // For sorted fetching by user
    .index("by_user_local_uuid", ["userId", "localUuid"]), // For finding/updating specific item by its local ID

  // Completions table - ultra-simplified for basic habit tracking
  completions: defineTable({
    userId: v.string(), // Clerk User ID (from identity.subject)
    localUuid: v.string(), // Maps to local completion.id
    habitId: v.string(), // Maps to the Convex habit ID
    completedAt: v.number() // The only timestamp we need - when habit was completed
  })
    .index("by_user_habit", ["userId", "habitId"])
    .index("by_user_date", ["userId", "completedAt"])
    .index("by_local_uuid", ["userId", "localUuid"])
    .index("by_user_completed_at", ["userId", "completedAt"]), // For sync conflict resolution

  activeTimers: defineTable({
    userId: v.string(), // Clerk User ID (from identity.subject)
    localUuid: v.string(), // Maps to local activeTimer.id
    habitId: v.string(), // Maps to the Convex habit ID
    startTime: v.number(), // Timestamp when timer started
    pausedTime: v.optional(v.number()), // Timestamp when timer was paused
    totalPausedDurationSeconds: v.number(),
    status: v.string(), // 'running' | 'paused'
    clientCreatedAt: v.number(), // Timestamp from client for LWW
    clientUpdatedAt: v.number() // Timestamp from client for LWW
  })
    .index("by_user_habit", ["userId", "habitId"])
    .index("by_local_uuid", ["userId", "localUuid"])
    .index("by_status", ["userId", "status"])
});
