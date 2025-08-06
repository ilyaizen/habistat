import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Calendars table
export const calendars = sqliteTable("calendars", {
  id: text("id").primaryKey(),
  userId: text("userId"), // nullable for anonymous/local
  name: text("name").notNull(),
  colorTheme: text("colorTheme").notNull(),
  position: integer("position").notNull(),
  isEnabled: integer("isEnabled").notNull().default(1), // 0/1 boolean, default true
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt").notNull()
});

// Habits table
export const habits = sqliteTable("habits", {
  id: text("id").primaryKey(),
  convexId: text("convexId"), // Nullable until synced
  userId: text("userId"),
  calendarId: text("calendarId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'positive' | 'negative'
  timerEnabled: integer("timerEnabled").notNull().default(0), // 0/1 boolean
  targetDurationSeconds: integer("targetDurationSeconds"),
  pointsValue: integer("pointsValue").default(0),
  position: integer("position").notNull(),
  isEnabled: integer("isEnabled").notNull().default(1),
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt").notNull()
});

// Completions table - ultra-simplified for basic habit tracking
export const completions = sqliteTable("completions", {
  id: text("id").primaryKey(),
  userId: text("userId"), // nullable for anonymous/local
  habitId: text("habitId").notNull(),
  completedAt: integer("completedAt").notNull(), // The only timestamp we need
  clientUpdatedAt: text("clientUpdatedAt").notNull() // For conflict resolution (Last-Write-Wins)
});

// ActiveTimers table
export const activeTimers = sqliteTable("activeTimers", {
  id: text("id").primaryKey(),
  userId: text("userId"),
  habitId: text("habitId").notNull(),
  startTime: integer("startTime").notNull(),
  pausedTime: integer("pausedTime"),
  totalPausedDurationSeconds: integer("totalPausedDurationSeconds").notNull().default(0),
  status: text("status").notNull(), // 'running' | 'paused'
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt").notNull()
});

// App Opens table (tracks app open events)
export const appOpens = sqliteTable("appOpens", {
  id: text("id").primaryKey(), // uuid
  timestamp: integer("timestamp").notNull() // ms since epoch
});

// Activity History table (for sync with Convex - daily app usage tracking)
export const activityHistory = sqliteTable("activity_history", {
  id: text("id").primaryKey(), // localUuid for sync correlation
  userId: text("userId"), // nullable for anonymous/local, maps to Clerk user ID
  date: text("date").notNull(), // YYYY-MM-DD format
  timestamp: integer("timestamp").notNull(), // Unix timestamp of first app open for this date
  clientUpdatedAt: integer("clientUpdatedAt").notNull() // For conflict resolution (Last-Write-Wins)
});

// Sync metadata table (tracks last sync timestamps for tables)
export const syncMetadata = sqliteTable("syncMetadata", {
  id: text("id").primaryKey(), // table name
  lastSyncTimestamp: integer("lastSyncTimestamp").notNull().default(0)
});
