
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
CREATE TABLE IF NOT EXISTS calendars (
  id TEXT PRIMARY KEY,
  userId TEXT,
  name TEXT NOT NULL,
  colorTheme TEXT NOT NULL,
  position INTEGER NOT NULL,
  isEnabled INTEGER DEFAULT 1 NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  convexId TEXT,
  userId TEXT,
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

CREATE TABLE IF NOT EXISTS completions (
  id TEXT PRIMARY KEY,
  userId TEXT,
  habitId TEXT NOT NULL,
  completedAt INTEGER NOT NULL,
  clientUpdatedAt TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS activity_history (
  id TEXT PRIMARY KEY,
  userId TEXT,
  date TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  clientUpdatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS appOpens (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS syncMetadata (
  id TEXT PRIMARY KEY,
  lastSyncTimestamp INTEGER DEFAULT 0 NOT NULL
);

-- Mark migrations as applied
INSERT OR IGNORE INTO _migrations (name) VALUES
  ('0000_initial.sql'),
  ('0001_simplify_completions.sql'),
  ('production_hotfix.sql');

-- Insert initial sync metadata
INSERT OR IGNORE INTO syncMetadata (id, lastSyncTimestamp) VALUES
  ('main', 0);

SELECT 'Database initialization completed successfully' as result;
