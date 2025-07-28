import fs from "node:fs";
import path from "node:path";
import { json } from "@sveltejs/kit";
import Database from "better-sqlite3";
import { dev } from "$app/environment";
import { ADMIN_SECRET_KEY } from "$env/static/private";
import type { RequestHandler } from "./$types";

/**
 * Protected endpoint that initializes the production database with required tables
 * This should only be accessible to administrators with the proper secret key
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    // Verify admin secret key in Authorization header
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    // Don't allow this endpoint in production without proper authentication
    if (!dev && (!token || token !== ADMIN_SECRET_KEY)) {
      console.warn("[API] Unauthorized database initialization attempt");
      return json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get database location from environment or use default
    // In production this will be in Vercel's persistent storage
    const dbPath = process.env.DATABASE_URL || "./.data/sqlite.db";

    // Ensure the directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      console.log(`[API] Creating database directory: ${dbDir}`);
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Read SQL initialization script
    const sqlInitPath = path.resolve(process.cwd(), "production-init.sql");

    if (!fs.existsSync(sqlInitPath)) {
      console.error(`[API] SQL init file not found: ${sqlInitPath}`);
      return json({ success: false, error: "Initialization script not found" }, { status: 500 });
    }

    const initSql = fs.readFileSync(sqlInitPath, "utf8");

    // Initialize database with schema
    const db = new Database(dbPath);

    try {
      // Run the initialization SQL as a transaction
      db.exec("BEGIN TRANSACTION;");
      db.exec(initSql);
      db.exec("COMMIT;");

      // Verify the tables were created
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all();
      const tableNames = tables.map((row: any) => row.name as string);

      console.log(`[API] Database initialized with tables: ${tableNames.join(", ")}`);

      return json({
        success: true,
        message: "Database initialized successfully",
        tables: tableNames
      });
    } catch (sqlError) {
      console.error("[API] SQL execution error:", sqlError);
      db.exec("ROLLBACK;"); // Rollback the transaction if any error occurred

      return json({ success: false, error: `SQL execution error: ${sqlError}` }, { status: 500 });
    } finally {
      db.close();
    }
  } catch (error) {
    console.error("[API] Database initialization error:", error);
    return json({ success: false, error: `Initialization failed: ${error}` }, { status: 500 });
  }
};
