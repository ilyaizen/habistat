import fs from "node:fs";
import path from "node:path";
import { json } from "@sveltejs/kit";
import Database from "better-sqlite3";
import { dev } from "$app/environment";
import { ADMIN_SECRET_KEY } from "$env/static/private";
import type { RequestHandler } from "./$types";

/**
 * Protected endpoint that reports on the status of the database
 * Shows tables, row counts, and other diagnostic information
 */
export const GET: RequestHandler = async ({ request }) => {
  try {
    // Verify admin secret key in Authorization header
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    // Don't allow this endpoint in production without proper authentication
    if (!dev && (!token || token !== ADMIN_SECRET_KEY)) {
      console.warn("[API] Unauthorized database status request");
      return json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get database location from environment or use default
    const dbPath = process.env.DATABASE_URL || "./.data/sqlite.db";

    // Ensure directory exists (although we won't create the DB here, just check it)
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      console.log(`[API] Database directory does not exist: ${dbDir}`);
      return json(
        {
          success: false,
          error: "Database directory not found",
          path: dbDir
        },
        { status: 404 }
      );
    }

    // Check if database file exists
    if (!fs.existsSync(dbPath)) {
      return json(
        {
          success: false,
          error: "Database file not found",
          path: dbPath
        },
        { status: 404 }
      );
    }

    // Get database stats
    const stats = fs.statSync(dbPath);

    // Connect to database and get tables
    const db = new Database(dbPath, { readonly: true });

    try {
      // Get list of tables
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all();

      // Get row counts for each table
      const tableInfo = await Promise.all(
        tables.map(async (table: any) => {
          try {
            const count = db.prepare(`SELECT COUNT(*) as count FROM "${table.name}";`).get() as {
              count: number;
            };
            return {
              name: table.name,
              rowCount: count.count || 0
            };
          } catch (countError) {
            console.error(`Error counting rows in ${table.name}:`, countError);
            return {
              name: table.name,
              rowCount: "error",
              error: String(countError)
            };
          }
        })
      );

      // Get migration info if available
      let migrations: unknown[] = [];
      try {
        if (tableInfo.some((t) => t.name === "_migrations")) {
          migrations = db
            .prepare("SELECT name, applied_at FROM _migrations ORDER BY applied_at;")
            .all();
        }
      } catch (migrationsError) {
        console.error("Error fetching migrations:", migrationsError);
      }

      // Get database pragma info
      const pragmaForeignKeys = db.prepare("PRAGMA foreign_keys;").get();
      const pragmaJournalMode = db.prepare("PRAGMA journal_mode;").get();

      return json({
        success: true,
        database: {
          path: dbPath,
          size: stats.size,
          lastModified: stats.mtime,
          created: stats.birthtime
        },
        tables: tableInfo,
        migrations: migrations,
        pragma: {
          foreign_keys: pragmaForeignKeys,
          journal_mode: pragmaJournalMode
        }
      });
    } finally {
      db.close();
    }
  } catch (error) {
    console.error("[API] Database status error:", error);
    return json(
      { success: false, error: `Failed to get database status: ${error}` },
      { status: 500 }
    );
  }
};
