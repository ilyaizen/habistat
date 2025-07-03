import { getDb as getDrizzleDb, persistBrowserDb } from "../db/client";
import * as schema from "../db/schema";
import { isNull, eq } from "drizzle-orm";

/**
 * Migration service to handle database schema changes
 */
export class MigrationService {
  /**
   * Run all pending migrations
   */
  static async runMigrations(): Promise<void> {
    console.log("🔄 Running database migrations...");

    try {
      await this.migrateCompletionsTimestamps();
      // Note: syncMetadata table is now created via official Drizzle migration (0003_equal_songbird.sql)
      console.log("✅ Database migrations completed successfully");
    } catch (error) {
      console.error("❌ Database migration failed:", error);
      throw error;
    }
  }

  /**
   * Add missing createdAt and updatedAt timestamps to existing completions
   */
  private static async migrateCompletionsTimestamps(): Promise<void> {
    const db = await getDrizzleDb();

    // Find completions without timestamps (where createdAt is null)
    const completionsNeedingMigration = await db
      .select()
      .from(schema.completions)
      .where(isNull(schema.completions.createdAt))
      .all();

    if (completionsNeedingMigration.length === 0) {
      console.log("📝 No completions need timestamp migration");
      return;
    }

    console.log(`📝 Migrating timestamps for ${completionsNeedingMigration.length} completions...`);

    for (const completion of completionsNeedingMigration) {
      // Use completedAt as both createdAt and updatedAt for existing records
      const timestamp = completion.completedAt;

      await db
        .update(schema.completions)
        .set({
          createdAt: timestamp,
          updatedAt: timestamp
        })
        .where(eq(schema.completions.id, completion.id));
    }

    await persistBrowserDb();
    console.log(`✅ Migrated timestamps for ${completionsNeedingMigration.length} completions`);
  }
}
