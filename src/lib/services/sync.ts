import { api } from "../../convex/_generated/api";
import type { ConvexClient } from "convex/browser";
import * as localData from "./local-data";
import { v4 as uuid } from "uuid";
import { completions as completionsSchema } from "../db/schema";
import type { InferModel } from "drizzle-orm";
import { completionsStore } from "../stores/completions";

type Completion = InferModel<typeof completionsSchema>;

export class SyncService {
  private convex: ConvexClient;
  private userId: string | null = null;
  private isSyncing = false;

  constructor(convex: ConvexClient) {
    this.convex = convex;
  }

  /**
   * Set the current user ID for sync operations
   */
  setUserId(userId: string | null) {
    this.userId = userId;
    console.log(`[Sync] User ID set to: ${userId}`);
  }

  /**
   * Get the last sync timestamp for a table
   */
  private async getLastSyncTimestamp(tableName: string): Promise<number> {
    const metadata = await localData.getSyncMetadata(tableName);
    return metadata?.lastSyncTimestamp ?? 0;
  }

  /**
   * Update the last sync timestamp for a table
   */
  private async updateLastSyncTimestamp(tableName: string, timestamp: number) {
    await localData.setSyncMetadata(tableName, timestamp);
  }

  /**
   * Sync completions bidirectionally
   */
  async syncCompletions(): Promise<{ success: boolean; error?: string }> {
    if (!this.userId || this.isSyncing) {
      return { success: false, error: "Not authenticated or already syncing" };
    }

    try {
      this.isSyncing = true;
      console.log("🔄 Starting completions sync...");

      // Step 1: Pull changes from server
      await this.pullCompletions();

      // Step 2: Push local changes to server
      await this.pushCompletions();

      console.log("✅ Completions sync completed successfully");
      return { success: true };
    } catch (error) {
      console.error("❌ Completions sync failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown sync error"
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Pull completion changes from server and apply to local database
   */
  private async pullCompletions() {
    const lastSync = await this.getLastSyncTimestamp("completions");
    console.log(`📥 Pulling completions since ${new Date(lastSync).toISOString()}`);

    // Fetch changes from server since last sync
    const serverCompletions = await this.convex.query(api.completions.getCompletionsSince, {
      timestamp: lastSync
    });

    if (serverCompletions.length === 0) {
      console.log("📥 No server changes to pull");
      return;
    }

    console.log(`📥 Applying ${serverCompletions.length} server changes locally`);

    let latestServerTimestamp = lastSync;

    for (const serverCompletion of serverCompletions) {
      // Find corresponding local completion by localUuid
      const localCompletion = await localData.getCompletionByLocalUuid(serverCompletion.localUuid);

      if (localCompletion) {
        // Local completion exists - apply Last Write Wins using completedAt
        if (serverCompletion.completedAt > localCompletion.completedAt) {
          // Server version is newer - update local
          await localData.updateCompletion(localCompletion.id, {
            habitId: serverCompletion.habitId,
            completedAt: serverCompletion.completedAt
          });
          console.log(`📥 Updated local completion ${localCompletion.id} from server`);
        }
        // If local is newer or equal, keep local version (no action needed)
      } else {
        // No local completion with this UUID - create new one
        const newCompletion: Completion = {
          id: serverCompletion.localUuid, // Use server's localUuid as our local ID
          userId: this.userId,
          habitId: serverCompletion.habitId,
          completedAt: serverCompletion.completedAt
        };

        await localData.createCompletion(newCompletion);
        console.log(`📥 Created new local completion ${newCompletion.id} from server`);
      }

      // Track latest timestamp using completedAt
      latestServerTimestamp = Math.max(latestServerTimestamp, serverCompletion.completedAt);
    }

    // Update sync timestamp
    await this.updateLastSyncTimestamp("completions", latestServerTimestamp);
  }

  /**
   * Push local completion changes to server
   */
  private async pushCompletions() {
    console.log("📤 Pushing local completion changes to server");

    // Get all local completions that need sync (have userId)
    const localCompletions = await localData.getAllCompletions();
    const completionsToSync = localCompletions.filter((c) => c.userId === this.userId);

    if (completionsToSync.length === 0) {
      console.log("📤 No local changes to push");
      return;
    }

    console.log(`📤 Pushing ${completionsToSync.length} local completions to server`);

    // Convert to format expected by server
    const completionsForServer = completionsToSync.map((completion) => ({
      localUuid: completion.id,
      habitId: completion.habitId,
      completedAt: completion.completedAt
    }));

    // Batch upsert to server
    await this.convex.mutation(api.completions.batchUpsertCompletions, {
      completions: completionsForServer
    });

    console.log("📤 Successfully pushed local changes to server");
  }

  /**
   * Migrate anonymous completion data to authenticated user
   */
  async migrateAnonymousData(): Promise<{
    success: boolean;
    migratedCount: number;
    error?: string;
  }> {
    if (!this.userId) {
      return { success: false, migratedCount: 0, error: "Not authenticated" };
    }

    try {
      console.log("🔄 Migrating anonymous data to user account...");

      // Find all local completions without userId
      const anonymousCompletions = await localData.getAnonymousCompletions();

      if (anonymousCompletions.length === 0) {
        console.log("✅ No anonymous data to migrate");
        return { success: true, migratedCount: 0 };
      }

      console.log(`🔄 Migrating ${anonymousCompletions.length} anonymous completions`);

      // Update local records to associate with user
      for (const completion of anonymousCompletions) {
        await localData.updateCompletion(completion.id, {
          userId: this.userId
        });
      }

      // Push migrated data to server
      await this.pushCompletions();

      console.log(`✅ Successfully migrated ${anonymousCompletions.length} completions`);
      return { success: true, migratedCount: anonymousCompletions.length };
    } catch (error) {
      console.error("❌ Migration failed:", error);
      return {
        success: false,
        migratedCount: 0,
        error: error instanceof Error ? error.message : "Unknown migration error"
      };
    }
  }

  /**
   * Full sync: pull then push all data
   */
  async fullSync(): Promise<{ success: boolean; error?: string }> {
    const result = await this.syncCompletions();

    // Refresh completions store after successful sync
    if (result.success) {
      await completionsStore.refresh();
    }

    return result;
  }

  /**
   * Check if sync is currently in progress
   */
  isInProgress(): boolean {
    return this.isSyncing;
  }
}
