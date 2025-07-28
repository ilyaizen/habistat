/**
 * Database fixer utility for Habistat
 *
 * This module provides functions to diagnose and fix common database issues
 * that occur during development and production deployment.
 */

import { getDb } from "$lib/db/client";

/**
 * Check which required tables are missing from the database
 * @returns Array of missing table names
 */
export async function checkMissingTables(): Promise<string[]> {
  const requiredTables = [
    "calendars",
    "habits",
    "completions",
    "activeTimers",
    "appOpens",
    "syncMetadata",
    "_migrations"
  ];

  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Get list of existing tables
    const result = await db.run("SELECT name FROM sqlite_master WHERE type='table'");
    const existingTables = result.rows?.map((row: any) => row.name as string) || [];

    // Find missing tables
    const missingTables = requiredTables.filter((table) => !existingTables.includes(table));

    return missingTables;
  } catch (error) {
    console.error("Error checking tables:", error);
    return requiredTables; // Assume all are missing if we can't check
  }
}

/**
 * Create all required database tables with proper schema
 * This function is safe to run multiple times (uses CREATE TABLE IF NOT EXISTS)
 *
 * @returns Promise that resolves to success status and message
 */
export async function createRequiredTables(): Promise<{
  success: boolean;
  message: string;
  createdTables: string[];
}> {
  try {
    console.log("🔧 Starting database table creation...");

    const db = await getDb();
    if (!db) {
      return {
        success: false,
        message: "Database not initialized",
        createdTables: []
      };
    }

    // Check which tables are missing before creation
    const missingBefore = await checkMissingTables();
    console.log("📋 Missing tables before fix:", missingBefore);

    // Create all required tables with the exact schema from migrations
    const createTablesSQL = `
      -- Create migrations tracking table first
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY
      );

      -- Create calendars table
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

      -- Create habits table
      CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY,
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
        updatedAt INTEGER NOT NULL
      );

      -- Create ultra-simplified completions table (post-migration)
      CREATE TABLE IF NOT EXISTS completions (
        id TEXT PRIMARY KEY,
        userId TEXT,
        habitId TEXT NOT NULL,
        completedAt INTEGER NOT NULL
      );

      -- Create active timers table
      CREATE TABLE IF NOT EXISTS activeTimers (
        id TEXT PRIMARY KEY,
        userId TEXT,
        habitId TEXT NOT NULL,
        startTime INTEGER NOT NULL,
        pausedTime INTEGER,
        totalPausedDurationSeconds INTEGER DEFAULT 0 NOT NULL,
        status TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      -- Create app opens tracking table
      CREATE TABLE IF NOT EXISTS appOpens (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL
      );

      -- Create sync metadata table
      CREATE TABLE IF NOT EXISTS syncMetadata (
        id TEXT PRIMARY KEY,
        lastSyncTimestamp INTEGER DEFAULT 0 NOT NULL
      );
    `;

    console.log("🔨 Creating database tables...");
    await db.run(createTablesSQL);

    // Mark the migrations as applied to prevent conflicts
    await db.run(`
      INSERT OR IGNORE INTO _migrations (name) VALUES
      ('0000_initial.sql'),
      ('0001_simplify_completions.sql')
    `);

    // Verify tables were created successfully
    const missingAfter = await checkMissingTables();
    const createdTables = missingBefore.filter((table) => !missingAfter.includes(table));

    console.log("✅ Database tables created successfully!");
    console.log("📋 Created tables:", createdTables);

    if (missingAfter.length > 0) {
      console.warn("⚠️ Some tables still missing:", missingAfter);
    }

    // Verify by listing all tables
    const allTablesResult = await db.run("SELECT name FROM sqlite_master WHERE type='table'");
    const allTables = allTablesResult.rows?.map((r: any) => r.name) || [];
    console.log("📋 All tables now present:", allTables);

    return {
      success: missingAfter.length === 0,
      message:
        missingAfter.length === 0
          ? `Successfully created ${createdTables.length} tables`
          : `Created ${createdTables.length} tables, but ${missingAfter.length} still missing: ${missingAfter.join(", ")}`,
      createdTables
    };
  } catch (error) {
    console.error("❌ Failed to create database tables:", error);
    return {
      success: false,
      message: `Failed to create tables: ${error instanceof Error ? error.message : "Unknown error"}`,
      createdTables: []
    };
  }
}

/**
 * Quick database diagnostic function
 * Logs current database status to console
 */
export async function diagnoseDatabaseStatus(): Promise<void> {
  console.log("🔍 Diagnosing database status...");

  try {
    const db = await getDb();
    if (!db) {
      console.error("❌ Database not initialized");
      return;
    }

    // Check database file/connection
    console.log("✅ Database client initialized");

    // List all tables
    const tablesResult = await db.run("SELECT name FROM sqlite_master WHERE type='table'");
    const tables = tablesResult.rows?.map((r: any) => r.name) || [];
    console.log("📋 Existing tables:", tables);

    // Check missing tables
    const missing = await checkMissingTables();
    if (missing.length === 0) {
      console.log("✅ All required tables present");
    } else {
      console.warn("⚠️ Missing required tables:", missing);
    }

    // Check migrations
    if (tables.includes("_migrations")) {
      const migrationsResult = await db.run("SELECT name FROM _migrations ORDER BY name");
      const appliedMigrations = migrationsResult.rows?.map((r: any) => r.name) || [];
      console.log("📜 Applied migrations:", appliedMigrations);
    } else {
      console.warn("⚠️ No migration tracking table found");
    }

    // Sample some data if tables exist
    for (const table of ["calendars", "habits", "completions"]) {
      if (tables.includes(table)) {
        try {
          const countResult = await db.run(`SELECT COUNT(*) as count FROM ${table}`);
          const count = countResult.rows?.[0]?.count || 0;
          console.log(`📊 ${table}: ${count} records`);
        } catch (e) {
          console.warn(`⚠️ Could not count records in ${table}:`, e);
        }
      }
    }
  } catch (error) {
    console.error("❌ Database diagnosis failed:", error);
  }
}

/**
 * Convenience function to run from browser console
 * Combines diagnosis and fixing in one call
 */
export async function fixDatabase(): Promise<void> {
  console.log("🚀 Running complete database fix...");

  // First diagnose
  await diagnoseDatabaseStatus();

  // Then fix
  const result = await createRequiredTables();

  if (result.success) {
    console.log("🎉 Database fix completed successfully!");
    console.log("💡 Refresh the page to see if issues are resolved");
  } else {
    console.error("❌ Database fix failed:", result.message);
  }
}

// Make functions available globally for browser console access
if (typeof window !== "undefined") {
  (window as any).fixDatabase = fixDatabase;
  (window as any).diagnoseDatabaseStatus = diagnoseDatabaseStatus;
  (window as any).createRequiredTables = createRequiredTables;
  (window as any).checkMissingTables = checkMissingTables;
}
