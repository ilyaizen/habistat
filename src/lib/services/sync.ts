import type { InferModel } from "drizzle-orm";
import { get } from "svelte/store";
import { getConvexClient, isAuthReady } from "$lib/utils/convex";
import { safeMutation, safeQuery } from "$lib/utils/safe-query";
import { api } from "../../convex/_generated/api";
import type { completions as completionsSchema } from "../db/schema";
import { completionsStore } from "../stores/completions";
import {
  type CompletionSyncData,
  getAuthError,
  getLastSyncTimestamp,
  mapCompletionHabitIds,
  performSafeOperation,
  type SyncResult,
  updateLastSyncTimestamp,
  waitForConvexAuth
} from "../utils/convex-operations";
import * as localData from "./local-data";

// Debug configuration - reduce console verbosity
const DEBUG_VERBOSE = false;

type Completion = InferModel<typeof completionsSchema>;

/**
 * Simplified sync service with cleaner error handling and proper habit ID mapping
 */
export class SyncService {
  private userId: string | null = null;
  private isSyncing = false;
  private userSyncing = false;

  /**
   * Set the current user ID for sync operations
   */
  setUserId(userId: string | null) {
    this.userId = userId;
  }

  /**
   * Sync current user to Convex database
   */
  async syncCurrentUser(userInfo: {
    email: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<SyncResult & { userId?: string }> {
    if (!this.userId || this.userSyncing) {
      return { success: false, error: "Not authenticated or already syncing user" };
    }

    if (!(await waitForConvexAuth())) {
      if (DEBUG_VERBOSE) {
        console.log("⏳ Sync: Waiting for auth...");
      }
      return { success: false, error: "Authentication not ready - please wait and try again" };
    }

    return performSafeOperation(async () => {
      this.userSyncing = true;

      const result = await safeMutation(api.users.syncCurrentUser, userInfo, { retries: 3 });

      if (!result) {
        throw new Error(getAuthError());
      }

      return { userId: result as string };
    }, "User sync").finally(() => {
      this.userSyncing = false;
    });
  }

  /**
   * Sync completions bidirectionally with proper habit ID mapping
   */
  async syncCompletions(): Promise<SyncResult> {
    if (!this.userId || this.isSyncing) {
      return { success: false, error: "Not authenticated or already syncing" };
    }

    if (!(await waitForConvexAuth())) {
      if (DEBUG_VERBOSE) {
        console.log("⏳ Sync: Waiting for auth...");
      }
      return { success: false, error: "Authentication not ready - please wait and try again" };
    }

    return performSafeOperation(async () => {
      this.isSyncing = true;

      // Pull and push with graceful error handling
      await Promise.allSettled([this.pullCompletions(), this.pushCompletions()]);

      return {};
    }, "Completions sync").finally(() => {
      this.isSyncing = false;
    });
  }

  /**
   * Pull completion changes from server
   */
  private async pullCompletions(): Promise<void> {
    if (!this.userId) throw new Error("No user ID");

    const lastSync = await getLastSyncTimestamp("completions");
    let latestTimestamp = lastSync;
    let cursor: string | undefined;
    let totalProcessed = 0;

    do {
      const response = (await safeQuery(
        api.completions.getCompletionsSince,
        { timestamp: lastSync, limit: 100, cursor },
        { retries: 3, logErrors: true }
      )) as { completions: any[]; nextCursor?: string; isDone: boolean } | null;

      if (!response) {
        throw new Error(getAuthError());
      }

      if (response.completions.length === 0) break;

      totalProcessed += response.completions.length;

      // Process server completions efficiently
      for (const serverCompletion of response.completions) {
        const localCompletion = await localData.getCompletionByLocalUuid(
          serverCompletion.localUuid
        );

        if (localCompletion) {
          // Update if server version is newer
          if (serverCompletion.completedAt > localCompletion.completedAt) {
            await localData.updateCompletion(localCompletion.id, {
              completedAt: serverCompletion.completedAt,
              habitId: serverCompletion.habitId
            });
          }
        } else {
          // Create new local completion from server
          await localData.createCompletion({
            id: serverCompletion.localUuid,
            habitId: serverCompletion.habitId,
            completedAt: serverCompletion.completedAt,
            userId: this.userId
          });
        }

        // Track latest timestamp
        latestTimestamp = Math.max(latestTimestamp, serverCompletion.completedAt);
      }

      cursor = response.nextCursor;
    } while (cursor);

    if (totalProcessed > 0) {
      await completionsStore.refresh();
    }

    await updateLastSyncTimestamp("completions", latestTimestamp);
  }

  /**
   * Push local completion changes to server with habit ID mapping
   */
  private async pushCompletions(): Promise<void> {
    if (!this.userId) throw new Error("No user ID");

    const allCompletions = await localData.getUserCompletions(this.userId);
    const lastSync = await getLastSyncTimestamp("completions");
    const unsyncedCompletions = allCompletions.filter((comp) => comp.completedAt > lastSync);

    if (unsyncedCompletions.length === 0) {
      return;
    }

    // Map local habit IDs to Convex habit IDs
    const mappedCompletions = await mapCompletionHabitIds(
      unsyncedCompletions.map((c) => ({
        localUuid: c.id,
        habitId: c.habitId,
        completedAt: c.completedAt
      }))
    );

    if (mappedCompletions.length === 0) {
      throw new Error("No completions could be mapped to Convex habits");
    }

    // Push in batches
    let processed = 0;
    while (processed < mappedCompletions.length) {
      const batch = mappedCompletions.slice(processed, processed + 50);

      const result = await safeMutation(
        api.completions.batchUpsertCompletions,
        { completions: batch },
        { retries: 3 }
      );

      if (!result) {
        throw new Error(getAuthError());
      }

      processed += batch.length;
    }

    await updateLastSyncTimestamp("completions", Date.now());
  }

  /**
   * Migrate anonymous data to authenticated user account
   */
  async migrateAnonymousData(): Promise<{
    success: boolean;
    migratedCount: number;
    error?: string;
  }> {
    if (!this.userId) {
      return { success: false, migratedCount: 0, error: "No user ID set" };
    }

    const result = await performSafeOperation(async () => {
      const anonymousCompletions = await localData.getAnonymousCompletions();

      if (anonymousCompletions.length === 0) {
        return { migratedCount: 0 };
      }

      // Update local completions with user ID
      for (const completion of anonymousCompletions) {
        await localData.updateCompletion(completion.id, {
          userId: this.userId
        });
      }

      await completionsStore.refresh();

      // Push migrated data to server
      await this.pushCompletions();

      return { migratedCount: anonymousCompletions.length };
    }, "Anonymous data migration");

    return {
      success: result.success,
      migratedCount: result.data?.migratedCount || 0,
      error: result.error
    };
  }

  /**
   * Full sync: sync user then sync all data
   */
  async fullSync(userInfo?: {
    email: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<SyncResult & { userSyncResult?: any }> {
    let userSyncResult: any;

    // Sync user first if user info provided
    if (userInfo) {
      userSyncResult = await this.syncCurrentUser(userInfo);
    }

    // Sync completions
    const result = await this.syncCompletions();

    // Refresh store after successful sync
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
