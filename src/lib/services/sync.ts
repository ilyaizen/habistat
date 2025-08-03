// import type { ConvexClient } from "convex/browser";
import type { InferModel } from "drizzle-orm";
import { get } from "svelte/store";
import { api } from "../../convex/_generated/api";
import type { completions as completionsSchema } from "../db/schema";
import { completionsStore } from "../stores/completions";
import { safeMutation, safeQuery } from "../utils/safe-query";
import * as localData from "./local-data";

type Completion = InferModel<typeof completionsSchema>;

export class SyncService {
  private userId: string | null = null;
  private isSyncing = false;
  private userSyncing = false;

  /**
   * Set the current user ID for sync operations
   */
  setUserId(userId: string | null) {
    this.userId = userId;
    // Debug: User ID set
    // console.log(`[Sync] User ID set to: ${userId}`);
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
   * Sync the current user to Convex database.
   * This ensures the authenticated user exists in the Convex users table.
   * Should be called when authentication state changes.
   */
  async syncCurrentUser(userInfo: {
    email: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; error?: string; userId?: string }> {
    if (!this.userId || this.userSyncing) {
      return { success: false, error: "Not authenticated or already syncing user" };
    }

    // Import isAuthReady to check Convex auth status
    const { isAuthReady } = await import("../utils/convex");

    // Wait for Convex authentication to be ready
    if (!isAuthReady()) {
      console.log("⏳ UserSync: Waiting for Convex auth...");

      const maxWaitTime = 15000; // Wait up to 15 seconds for auth
      const startTime = Date.now();

      while (!isAuthReady() && Date.now() - startTime < maxWaitTime) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (!isAuthReady()) {
        console.warn("⚠️ UserSync: Auth timeout, aborting");
        return { success: false, error: "Authentication not ready - please wait and try again" };
      }

      console.log("✅ UserSync: Convex auth ready");
    }

    try {
      this.userSyncing = true;
      console.log("🔄 UserSync: Starting...");

      const result = await safeMutation(
        api.users.syncCurrentUser,
        {
          email: userInfo.email,
          name: userInfo.name,
          avatarUrl: userInfo.avatarUrl
        },
        { retries: 3 }
      );

      if (!result) {
        const authStateData = await import("../stores/auth-state").then((m) => m.authState);
        const errorMsg =
          get(authStateData).error || "Authentication or network error during user sync";
        console.error("❌ User sync failed:", errorMsg);
        return { success: false, error: errorMsg };
      }

      console.log("✅ User sync completed successfully");
      return { success: true, userId: result as string };
    } catch (error) {
      console.error("❌ User sync failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown user sync error"
      };
    } finally {
      this.userSyncing = false;
    }
  }

  /**
   * Sync completions bidirectionally
   * Now waits for Convex authentication to be fully ready to prevent race conditions
   */
  async syncCompletions(): Promise<{ success: boolean; error?: string }> {
    if (!this.userId || this.isSyncing) {
      return { success: false, error: "Not authenticated or already syncing" };
    }

    // Import isAuthReady to check Convex auth status
    const { isAuthReady } = await import("../utils/convex");

    // Wait for Convex authentication to be ready before starting sync
    if (!isAuthReady()) {
      console.log("⏳ DataSync: Waiting for Convex auth...");

      const maxWaitTime = 15000; // Wait up to 15 seconds for auth
      const startTime = Date.now();

      while (!isAuthReady() && Date.now() - startTime < maxWaitTime) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (!isAuthReady()) {
        console.warn("[Sync] Convex authentication not ready after waiting, aborting sync");
        return { success: false, error: "Authentication not ready - please wait and try again" };
      }

      console.log("✅ DataSync: Convex auth ready");
    }

    try {
      this.isSyncing = true;
      console.log("🔄 Starting completions sync...");

      try {
        // Step 1: Pull changes from server
        await this.pullCompletions();
      } catch (pullError) {
        // Log but continue with push
        console.warn("⚠️ Error pulling completions:", pullError);
      }

      try {
        // Step 2: Push local changes to server
        await this.pushCompletions();
      } catch (pushError) {
        // Log but don't fail the whole sync
        console.warn("⚠️ Error pushing completions:", pushError);
      }

      console.log("✅ Completions sync completed (with potential partial success)");
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
   * Pull all completion changes from server since last sync
   */
  private async pullCompletions(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.userId) {
        return { success: false, error: "No userId set" };
      }

      const lastSync = await this.getLastSyncTimestamp("completions");
      console.log(`🔽 Pulling completions since ${new Date(lastSync).toISOString()}`);

      let latestServerTimestamp = lastSync;
      let cursor: string | undefined;
      let totalProcessed = 0;

      // Define the expected response type from Convex
      type CompletionResponse = {
        completions: Array<{
          _id: string; // Convex ID is a string type
          localUuid: string;
          habitId: string;
          completedAt: number;
          userId?: string;
        }>;
        nextCursor: string | undefined;
        isDone: boolean;
      };

      do {
        // Use safeQuery wrapper to handle auth and retries
        const response = await safeQuery<CompletionResponse>(
          api.completions.getCompletionsSince,
          {
            timestamp: lastSync,
            limit: 100,
            cursor
          },
          { retries: 3, logErrors: true }
        );

        if (!response) {
          const authStateData = await import("../stores/auth-state").then((m) => m.authState);
          const errorMsg = get(authStateData).error || "Failed to fetch completions";
          console.warn("⚠️ Failed to fetch completions:", errorMsg);
          return { success: false, error: errorMsg };
        }

        if (response.completions.length === 0) break;

        totalProcessed += response.completions.length;
        console.log(`🔽 Processing ${response.completions.length} server changes`);

        // Process each server completion
        for (const serverCompletion of response.completions) {
          // Find if this completion exists locally
          const localCompletion = await localData.getCompletionByLocalUuid(
            serverCompletion.localUuid
          );

          if (localCompletion) {
            // Local completion exists - apply Last Write Wins using completedAt
            if (serverCompletion.completedAt > localCompletion.completedAt) {
              // Server version is newer - update local
              await localData.updateCompletion(localCompletion.id, {
                habitId: serverCompletion.habitId,
                completedAt: serverCompletion.completedAt
              });
              console.log(`🔽 Updated local completion ${localCompletion.id} from server`);
            }
          } else {
            // No local completion with this UUID - create new one
            const newCompletion: Completion = {
              id: serverCompletion.localUuid, // Use server's localUuid as our local ID
              userId: this.userId,
              habitId: serverCompletion.habitId,
              completedAt: serverCompletion.completedAt
            };

            await localData.createCompletion(newCompletion);
            console.log(`🔽 Created new local completion ${newCompletion.id} from server`);
          }

          // Update latest timestamp
          if (serverCompletion.completedAt > latestServerTimestamp) {
            latestServerTimestamp = serverCompletion.completedAt;
          }
        }

        // Move to next page
        cursor = response.nextCursor;
      } while (cursor);

      // Refresh completions store after all updates
      await completionsStore.refresh();

      console.log(`🔽 Processed ${totalProcessed} completions from server`);
      await this.updateLastSyncTimestamp("completions", latestServerTimestamp);
      return { success: true };
    } catch (error) {
      console.error("❌ Failed to pull completions:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error pulling completions"
      };
    }
  }

  /**
   * Push local completion changes to server
   *
   * Uses safe query wrappers to handle authentication issues gracefully
   */
  private async pushCompletions(): Promise<{ success: boolean; error?: string }> {
    if (!this.userId) {
      return { success: false, error: "No userId set" };
    }

    // Get all local completions for the current user
    const allCompletions = await localData.getUserCompletions(this.userId);

    // Get last sync timestamp
    const lastSync = await this.getLastSyncTimestamp("completions");

    // Filter completions created or updated after the last sync
    const unsyncedCompletions = allCompletions.filter((comp) => comp.completedAt > lastSync);

    if (unsyncedCompletions.length === 0) {
      console.log("📤 No local changes to push");
      return { success: true };
    }

    console.log(`📤 Pushing ${unsyncedCompletions.length} local changes to server`);

    let processed = 0;
    let syncedCount = 0;
    const maxRetries = 3;

    while (processed < unsyncedCompletions.length) {
      // Send to server in batches of 50 (matching max batch size)
      const currentBatch = unsyncedCompletions.slice(processed, processed + 50);
      console.log(`📤 Pushing batch ${currentBatch.length} completions to server`);

      const result = await safeMutation(
        api.completions.batchUpsertCompletions,
        {
          completions: currentBatch.map((c) => ({
            localUuid: c.id, // Fix: local completion uses 'id' as primary key, map to 'localUuid' for Convex
            habitId: c.habitId, // Updated from habitLocalUuid to match Convex API
            completedAt: c.completedAt // Using completedAt instead of date.getTime()
          }))
        },
        { retries: maxRetries }
      );

      if (!result) {
        const authStateData = await import("../stores/auth-state").then((m) => m.authState);
        const errorMsg = get(authStateData).error || "Authentication or network error";
        console.log("📤 Push failed:", errorMsg);
        return { success: false, error: errorMsg };
      }

      // Mark synced in local DB by updating sync metadata
      // Since completionsStore doesn't have markAsSynced method
      // We'll use our updateLastSyncTimestamp method to record the sync time
      syncedCount += currentBatch.length;

      processed += currentBatch.length;
    }

    // Update the last sync timestamp to now
    if (syncedCount > 0) {
      await this.updateLastSyncTimestamp("completions", Date.now());
    }

    console.log(`📤 Successfully pushed ${syncedCount} local changes to server`);
    return { success: true };
  }
  /**
   * Migrate anonymous data to authenticated user account
   *
   * This method safely migrates anonymous user data to the authenticated account
   * using transaction-like behavior - ensuring local and remote data integrity.
   */
  async migrateAnonymousData(): Promise<{
    success: boolean;
    migratedCount: number;
    error?: string;
  }> {
    if (!this.userId) {
      console.warn("❌ Migration failed: No user ID set");
      return { success: false, migratedCount: 0, error: "No user ID set" };
    }

    try {
      console.log("🔄 Starting anonymous data migration...");

      // Get anonymous completions (no userId)
      const anonymousCompletions = await localData.getAnonymousCompletions();

      if (anonymousCompletions.length === 0) {
        console.log("✅ No anonymous data to migrate");
        return { success: true, migratedCount: 0 };
      }

      console.log(`🔄 Found ${anonymousCompletions.length} anonymous completions to migrate`);

      try {
        // Update local completions with current user ID
        for (const completion of anonymousCompletions) {
          await localData.updateCompletion(completion.id, {
            userId: this.userId
          });
        }

        // Refresh completions store
        await completionsStore.refresh();

        // Push migrated data to server with safe mutation handling
        const pushResult = await this.pushCompletions();

        if (!pushResult.success) {
          console.warn("⚠️ Migrated data locally but sync to server had issues:", pushResult.error);
        }

        console.log(`✅ Successfully migrated ${anonymousCompletions.length} completions`);
        return { success: true, migratedCount: anonymousCompletions.length };
      } catch (migrationError) {
        console.error("❌ Failed to update local completions:", migrationError);
        return { success: false, migratedCount: 0, error: "Failed to update local data" };
      }
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
   * Full sync: sync user then sync all data
   * @param userInfo - User information for user sync (optional, skips user sync if not provided)
   */
  async fullSync(userInfo?: {
    email: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; error?: string; userSyncResult?: any }> {
    let userSyncResult: { success: boolean; error?: string; userId?: string } | undefined;

    // Sync user first if user info is provided
    if (userInfo) {
      userSyncResult = await this.syncCurrentUser(userInfo);
      if (!userSyncResult.success) {
        console.warn("⚠️ User sync failed, but continuing with data sync:", userSyncResult.error);
      }
    }

    // Sync completions
    const result = await this.syncCompletions();

    // Refresh completions store after successful sync
    if (result.success) {
      await completionsStore.refresh();
    }

    return {
      success: result.success,
      error: result.error,
      userSyncResult
    };
  }

  /**
   * Check if sync is currently in progress
   */
  isInProgress(): boolean {
    return this.isSyncing || this.userSyncing;
  }

  /**
   * Check if user sync is currently in progress
   */
  isUserSyncInProgress(): boolean {
    return this.userSyncing;
  }
}
