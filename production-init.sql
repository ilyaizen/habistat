
-- Production Database Initialization Script
-- Creates all required tables for Habistat

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- Create migrations table first
CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  applied_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Core application tables
-- Phase 3.5: Added localUuid for sync correlation, removed convexId
CREATE TABLE IF NOT EXISTS calendars (
  id TEXT PRIMARY KEY,
  userId TEXT,
  localUuid TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  colorTheme TEXT NOT NULL,
  position INTEGER NOT NULL,
  isEnabled INTEGER DEFAULT 1 NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

-- Phase 3.5: Removed convexId field, added localUuid for sync correlation
CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  userId TEXT,
  localUuid TEXT NOT NULL UNIQUE,
  calendarId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  timerEnabled INTEGER DEFAULT 0 NOT NULL,
  targetDurationSeconds INTEGER,
  pointsValue INTEGER DEFAULT 0,
  position INTEGER NOT NULL,
  isEnabled INTEGER DEFAULT 1 NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (calendarId) REFERENCES calendars(id) ON DELETE CASCADE
);

-- Phase 3.5: Streamlined to essential fields, fixed clientUpdatedAt to INTEGER
CREATE TABLE IF NOT EXISTS completions (
  id TEXT PRIMARY KEY,
  userId TEXT,
  habitId TEXT NOT NULL,
  completedAt INTEGER NOT NULL,
  clientUpdatedAt INTEGER NOT NULL,
  FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activeTimers (
  id TEXT PRIMARY KEY,
  userId TEXT,
  habitId TEXT NOT NULL,
  startTime INTEGER NOT NULL,
  pausedTime INTEGER,
  totalPausedDurationSeconds INTEGER DEFAULT 0 NOT NULL,
  status TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE
);

-- Phase 3.5: Unified activity tracking with openedAt field
CREATE TABLE IF NOT EXISTS activityHistory (
  id TEXT PRIMARY KEY,
  userId TEXT,
  localUuid TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  openedAt INTEGER NOT NULL,
  clientUpdatedAt INTEGER NOT NULL
);

-- User profile table - stores global user settings and first app open timestamp
CREATE TABLE IF NOT EXISTS userProfile (
  id TEXT PRIMARY KEY,
  userId TEXT,
  firstAppOpenAt INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS syncMetadata (
  id TEXT PRIMARY KEY,
  lastSyncTimestamp INTEGER DEFAULT 0 NOT NULL
);

-- Insert initial sync metadata
INSERT OR IGNORE INTO syncMetadata (id, lastSyncTimestamp) VALUES
  ('main', 0);

SELECT 'Database initialization completed successfully' as result;
