// src/lib/db/server.ts
// This module contains the server-side (Node.js/Tauri) database initialization logic.
// It uses `better-sqlite3` for native SQLite performance.
// This file should ONLY be imported in a server environment.

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "$lib/db/schema";

/**
 * Initializes the Node.js database instance using better-sqlite3.
 * It also runs any pending migrations.
 */
export async function initializeNodeDb() {
  try {
    // The `TAURI_DEBUG` environment variable is set by Tauri CLI when running in development mode.
    // Use a file-based database in production or when not in debug mode.
    // Use an in-memory database for development to ensure a clean state on each reload.
    const dbPath = process.env.TAURI_DEBUG ? ":memory:" : "habistat.sqlite";
    const sqlite = new Database(dbPath);

    // Enable WAL mode for better performance and concurrency.
    sqlite.pragma("journal_mode = WAL");

    globalThis.dbInstance = drizzle(sqlite, { schema, logger: false });

    // This will automatically run migrations on startup.
    // Use an absolute path for migrations to ensure it works in built Tauri apps
    const migrationsPath = process.env.TAURI_DEBUG ? "./migrations" : `${process.cwd()}/migrations`;
    migrate(globalThis.dbInstance, { migrationsFolder: migrationsPath });
    return globalThis.dbInstance;
  } catch (error) {
    console.error("Failed to initialize Node.js database:", error);
    globalThis.dbInstance = null;
    throw error;
  }
}
