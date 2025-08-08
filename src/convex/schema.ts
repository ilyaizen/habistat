import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { calendarColorValidator } from "./constants";

/**
 * Minimal, essential Convex schema for Habistat
 * Focus: Efficient bidirectional sync with local SQLite database
 * Principles:
 * - Use localUuid for mapping to local records (no separate convexId needed)
 * - Consistent field naming with local schema
 * - Essential indexing for sync performance
 * - Last-Write-Wins conflict resolution via clientUpdatedAt timestamps
 */

export default defineSchema({
  // Users table - manages authenticated user profiles
  users: defineTable({
    clerkId: v.string(), // From Clerk authentication
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    subscriptionId: v.optional(v.string()), // Stripe subscription ID
    subscriptionTier: v.optional(
      v.union(
        v.literal("free"),
        v.literal("premium_monthly"),
        v.literal("premium_lifetime")
      )
    ),
    subscriptionExpiresAt: v.optional(v.number()), // Unix timestamp
    firstAppOpenAt: v.optional(v.number()), // Unix timestamp of very first app open (stored once)
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_subscription_id", ["subscriptionId"]),

  // Calendars table - organizational containers for habits
  calendars: defineTable({
    userId: v.string(), // Clerk User ID (from identity.subject)
    localUuid: v.string(), // Maps to local calendars.id for sync correlation
    name: v.string(),
    // Phase 3.7 Step 2: tighten to allowed named colors only
    colorTheme: calendarColorValidator,
    position: v.number(),
    isEnabled: v.boolean(),
    createdAt: v.number(), // Unix timestamp from client
    updatedAt: v.number(), // Unix timestamp from client for Last-Write-Wins
  })
    .index("by_user_position", ["userId", "position"]) // For sorted fetching
    .index("by_user_local_uuid", ["userId", "localUuid"]), // For sync operations

  // Habits table - core habit definitions
  habits: defineTable({
    userId: v.string(), // Clerk User ID (from identity.subject)
    localUuid: v.string(), // Maps to local habits.id for sync correlation
    calendarId: v.string(), // References local calendar UUID
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(), // 'positive' | 'negative'
    timerEnabled: v.boolean(),
    targetDurationSeconds: v.optional(v.number()),
    pointsValue: v.optional(v.number()),
    position: v.number(),
    isEnabled: v.boolean(),
    createdAt: v.number(), // Unix timestamp from client
    updatedAt: v.number(), // Unix timestamp from client for Last-Write-Wins
  })
    .index("by_user_position", ["userId", "position"]) // For sorted fetching
    .index("by_user_local_uuid", ["userId", "localUuid"]) // For sync operations
    .index("by_user_calendar", ["userId", "calendarId"]), // For calendar-based queries

  // Completions table - minimal habit completion tracking
  completions: defineTable({
    userId: v.string(), // Clerk User ID (from identity.subject)
    localUuid: v.string(), // Maps to local completions.id for sync correlation
    habitId: v.string(), // References local habit UUID
    completedAt: v.number(), // Unix timestamp when habit was completed
    clientUpdatedAt: v.number(), // Unix timestamp for Last-Write-Wins conflict resolution
  })
    .index("by_user_habit", ["userId", "habitId"]) // For habit-specific queries
    .index("by_user_local_uuid", ["userId", "localUuid"]) // For sync operations
    .index("by_user_completed_at", ["userId", "completedAt"]) // For time-based queries
    .index("by_user_updated_at", ["userId", "clientUpdatedAt"]), // For sync conflict resolution

  // Active timers table - tracks running habit timers
  activeTimers: defineTable({
    userId: v.string(), // Clerk User ID (from identity.subject)
    localUuid: v.string(), // Maps to local activeTimers.id for sync correlation
    habitId: v.string(), // References local habit UUID
    startTime: v.number(), // Unix timestamp when timer started
    pausedTime: v.optional(v.number()), // Unix timestamp when timer was paused
    totalPausedDurationSeconds: v.number(),
    status: v.string(), // 'running' | 'paused'
    createdAt: v.number(), // Unix timestamp from client
    updatedAt: v.number(), // Unix timestamp from client for Last-Write-Wins
  })
    .index("by_user_habit", ["userId", "habitId"]) // For habit-specific queries
    .index("by_user_local_uuid", ["userId", "localUuid"]) // For sync operations
    .index("by_user_status", ["userId", "status"]), // For status-based queries

  // Activity history table - daily app usage tracking (minimal)
  activityHistory: defineTable({
    userId: v.string(), // Clerk User ID (from identity.subject)
    localUuid: v.string(), // Maps to local activityHistory.id for sync correlation
    date: v.string() // YYYY-MM-DD format (one row per day)
  })
    .index("by_user_date", ["userId", "date"]) // For date-specific queries
    .index("by_user_local_uuid", ["userId", "localUuid"]), // For sync operations
});
