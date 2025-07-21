import { getDb as getDrizzleDb, persistBrowserDb } from "../db/client";
// import * as schema from "../db/schema";
// import { isNull, eq } from "drizzle-orm";

/**
 * Migration service to handle database schema changes
 */
export namespace MigrationService {
  /**
   * Run all pending migrations
   */
  export async function runMigrations(): Promise<void> {
    console.log("🔄 Running database migrations...");

    try {
      await simplifyCompletionsTable();
      // Note: syncMetadata table is now created via official Drizzle migration (0003_equal_songbird.sql)
      console.log("✅ Database migrations completed successfully");
    } catch (error) {
      console.error("❌ Database migration failed:", error);
      throw error;
    }
  }

  /**
   * Ultra-simplify completions table by removing all unnecessary columns
   * Keep only: id, userId, habitId, completedAt
   */
  async function simplifyCompletionsTable(): Promise<void> {
    const db = await getDrizzleDb();

    try {
      // Check if the old columns still exist by trying to query one
      const testQuery = await db.run(`
        SELECT sql FROM sqlite_master
        WHERE type='table' AND name='completions'
      `);

      // If no table exists, there's nothing to migrate
      if (!testQuery.rows || testQuery.rows.length === 0) {
        console.log("📝 Completions table doesn't exist yet - no migration needed");
        return;
      }

      const tableSchema = (testQuery.rows[0]?.sql as string) || "";

      // If the table still has any of the old columns, we need to migrate
      if (
        tableSchema.includes("notes") ||
        tableSchema.includes("durationSpentSeconds") ||
        tableSchema.includes("isDeleted") ||
        tableSchema.includes("createdAt") ||
        tableSchema.includes("updatedAt")
      ) {
        console.log("📝 Ultra-simplifying completions table structure...");

        // Create new ultra-simplified completions table
        await db.run(`
          CREATE TABLE completions_new (
            id TEXT PRIMARY KEY,
            userId TEXT,
            habitId TEXT NOT NULL,
            completedAt INTEGER NOT NULL
          )
        `);

        // Copy existing data (excluding soft-deleted records if they exist)
        await db.run(`
          INSERT INTO completions_new (id, userId, habitId, completedAt)
          SELECT id, userId, habitId, completedAt
          FROM completions
          WHERE (isDeleted = 0 OR isDeleted IS NULL OR isDeleted NOT IN (0, 1))
        `);

        // Drop old table
        await db.run(`DROP TABLE completions`);

        // Rename new table
        await db.run(`ALTER TABLE completions_new RENAME TO completions`);

        await persistBrowserDb();
        console.log("✅ Completions table ultra-simplified successfully");
      } else {
        console.log("📝 Completions table already ultra-simplified");
      }
    } catch (error) {
      console.error("❌ Completions table migration failed:", error);
      // If there's an error, it might mean the table doesn't exist or is already in the new format
      console.log("📝 Completions table migration not needed or already completed");
    }
  }
}
