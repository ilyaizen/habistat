import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Minimal, essential database schema for Habistat
 * Focus: Local-first with efficient bidirectional sync
 * Principles:
 * - Remove unnecessary fields (convexId removed - localUuid handles mapping)
 * - Consistent integer timestamps throughout
 * - Streamlined completions table with only essential data
 * - Consolidated activity tracking
 */

// Calendars table - organizational containers for habits
export const calendars = sqliteTable("calendars", {
  id: text("id").primaryKey(), // Local UUID
  userId: text("userId"), // Nullable for anonymous/local users
  localUuid: text("localUuid").notNull().unique(), // UUID for sync correlation with Convex
  name: text("name").notNull(),
  colorTheme: text("colorTheme").notNull(),
  position: integer("position").notNull(),
  isEnabled: integer("isEnabled").notNull().default(1), // 0/1 boolean
  createdAt: integer("createdAt").notNull(), // Unix timestamp
  updatedAt: integer("updatedAt").notNull() // Unix timestamp
});

// Habits table - core habit definitions
export const habits = sqliteTable("habits", {
  id: text("id").primaryKey(), // Local UUID
  userId: text("userId"), // Nullable for anonymous/local users
  localUuid: text("localUuid").notNull().unique(), // UUID for sync correlation with Convex
  calendarId: text("calendarId").notNull(), // References calendars.id
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'positive' | 'negative'
  timerEnabled: integer("timerEnabled").notNull().default(0), // 0/1 boolean
  targetDurationSeconds: integer("targetDurationSeconds"),
  pointsValue: integer("pointsValue").default(0),
  position: integer("position").notNull(),
  isEnabled: integer("isEnabled").notNull().default(1), // 0/1 boolean
  createdAt: integer("createdAt").notNull(), // Unix timestamp
  updatedAt: integer("updatedAt").notNull() // Unix timestamp
});

// Completions table - minimal habit completion tracking
export const completions = sqliteTable("completions", {
  id: text("id").primaryKey(), // Local UUID (no separate localUuid needed - id serves as correlation)
  userId: text("userId"), // Nullable for anonymous/local users
  habitId: text("habitId").notNull(), // References habits.id
  completedAt: integer("completedAt").notNull(), // Unix timestamp when habit was completed
  clientUpdatedAt: integer("clientUpdatedAt").notNull() // Unix timestamp for Last-Write-Wins conflict resolution
});

// Active timers table - tracks running habit timers
export const activeTimers = sqliteTable("activeTimers", {
  id: text("id").primaryKey(), // Local UUID
  userId: text("userId"), // Nullable for anonymous/local users
  habitId: text("habitId").notNull(), // References habits.id
  startTime: integer("startTime").notNull(), // Unix timestamp
  pausedTime: integer("pausedTime"), // Unix timestamp when paused
  totalPausedDurationSeconds: integer("totalPausedDurationSeconds").notNull().default(0),
  status: text("status").notNull(), // 'running' | 'paused'
  createdAt: integer("createdAt").notNull(), // Unix timestamp
  updatedAt: integer("updatedAt").notNull() // Unix timestamp
});

// User profile table - stores global user settings and first app open timestamp
export const userProfile = sqliteTable("userProfile", {
  id: text("id").primaryKey(), // User session ID or "anonymous"
  userId: text("userId"), // Clerk user ID when authenticated
  firstAppOpenAt: integer("firstAppOpenAt"), // Unix timestamp of very first app open (stored once)
  createdAt: integer("createdAt").notNull(), // Unix timestamp
  updatedAt: integer("updatedAt").notNull() // Unix timestamp
});

// Activity history table - simplified daily app usage tracking
export const activityHistory = sqliteTable("activityHistory", {
  id: text("id").primaryKey(), // Local UUID
  userId: text("userId"), // Nullable for anonymous/local users
  localUuid: text("localUuid").notNull().unique(), // UUID for sync correlation with Convex
  date: text("date").notNull(), // YYYY-MM-DD format for easy querying
  openedAt: integer("openedAt").notNull(), // Unix timestamp of this specific app open
  clientUpdatedAt: integer("clientUpdatedAt").notNull() // Unix timestamp for Last-Write-Wins conflict resolution
},
// Add composite uniqueness to enforce at most one entry per (userId, date).
// Note: SQLite treats NULLs as distinct in UNIQUE constraints; anonymous entries
// (userId IS NULL) are additionally guarded by app-level upsert helpers.
(table) => ({
  userDateUnique: uniqueIndex("idx_activityHistory_user_date").on(table.userId, table.date)
}));

// Sync metadata table - tracks sync state per table
export const syncMetadata = sqliteTable("syncMetadata", {
  id: text("id").primaryKey(), // Table name (calendars, habits, completions, activityHistory)
  lastSyncTimestamp: integer("lastSyncTimestamp").notNull().default(0) // Unix timestamp of last successful sync
});
