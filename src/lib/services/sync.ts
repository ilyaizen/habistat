import type { InferModel } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { formatLocalDate } from "$lib/utils/date";
import { safeMutation, safeQuery } from "$lib/utils/safe-query";
import { getAppOpenHistory } from "$lib/utils/tracking";
import { api } from "../../convex/_generated/api";
import type { completions as completionsSchema } from "../db/schema";
import { completionsStore } from "../stores/completions";
import {
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
const DEBUG_VERBOSE = true;

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
   * Sync activity history bidirectionally following established patterns
   */
  async syncActivityHistory(): Promise<SyncResult> {
    if (!this.userId) {
      return { success: false, error: "Not authenticated" };
    }

    if (!(await waitForConvexAuth())) {
      if (DEBUG_VERBOSE) {
        console.log("⏳ Activity History: Waiting for auth...");
      }
      return { success: false, error: "Authentication not ready - please wait and try again" };
    }

    return performSafeOperation(async () => {
      await Promise.allSettled([this.pullActivityHistory(), this.pushActivityHistory()]);
      return {};
    }, "Activity History sync");
  }

  /**
   * Pull activity history changes from server
   */
  private async pullActivityHistory(): Promise<void> {
    if (!this.userId) throw new Error("No user ID");

    const lastSync = await getLastSyncTimestamp("activityHistory");
    let cursor: string | undefined;
    let totalProcessed = 0;

    do {
      const response = (await safeQuery(
        api.activityHistory.getActivityHistorySince,
        { timestamp: lastSync, limit: 100, cursor },
        { retries: 3, logErrors: true }
      )) as { activityHistory: any[]; nextCursor?: string; isDone: boolean } | null;

      if (!response) {
        throw new Error(getAuthError());
      }

      if (response.activityHistory.length === 0) break;

      totalProcessed += response.activityHistory.length;

      // Process server activity history efficiently
      for (const serverActivity of response.activityHistory) {
        const localActivity = await localData.getActivityHistoryByDate(serverActivity.date);

        if (!localActivity) {
          // Create new local activity entry
          await localData.createActivityHistory({
            id: serverActivity.localUuid,
            userId: this.userId,
            date: serverActivity.date,
            timestamp: serverActivity.timestamp,
            clientUpdatedAt: serverActivity.clientUpdatedAt
          });
        } else if (serverActivity.clientUpdatedAt > localActivity.clientUpdatedAt) {
          // Update local entry if server is newer (Last-Write-Wins)
          if (this.userId) {
            await localData.updateActivityHistoryUserId(localActivity.id, this.userId);
          }
        }
      }

      cursor = response.nextCursor;
    } while (cursor);

    if (totalProcessed > 0) {
      await updateLastSyncTimestamp("activityHistory", Date.now());
      if (DEBUG_VERBOSE) {
        console.log(`✅ Activity History: Pulled ${totalProcessed} entries`);
      }
    }
  }

  /**
   * Push local activity history changes to server
   */
  private async pushActivityHistory(): Promise<void> {
    if (!this.userId) throw new Error("No user ID");

    const lastSync = await getLastSyncTimestamp("activityHistory");

    // Directly use the function that reads from the correct 'appOpens' table.
    const allLocalTimestamps = await getAppOpenHistory();

    // Filter timestamps that are newer than the last sync.
    const newLocalTimestamps = allLocalTimestamps.filter((ts) => ts > lastSync);

    if (newLocalTimestamps.length === 0) {
      if (DEBUG_VERBOSE) {
        console.log("✅ Activity History: No local changes to push since", new Date(lastSync));
      }
      return;
    }

    // Map to Convex format. Note that the local 'appOpens' table only has id and timestamp.
    // We will generate the other fields required by the backend.
    const activitiesToSync = newLocalTimestamps.map((ts) => {
      const date = new Date(ts);
      return {
        localUuid: uuidv4(), // The local table doesn't have a stable UUID, so we generate one.
        date: formatLocalDate(date), // 'YYYY-MM-DD' format
        timestamp: ts,
        clientUpdatedAt: ts // Use timestamp as the updated-at marker
      };
    });

    // Batch upsert to server
    const result = await safeMutation(
      api.activityHistory.batchUpsertActivityHistory,
      { entries: activitiesToSync },
      { retries: 3 }
    );

    if (!result) {
      throw new Error(getAuthError());
    }

    if (DEBUG_VERBOSE) {
      console.log(`✅ Activity History: Pushed ${activitiesToSync.length} entries`);
    }
  }

  /**
   * Sync completions bidirectionally with proper habit ID mapping
   */
  async syncCompletions(): Promise<SyncResult> {
    if (!this.userId) {
      return { success: false, error: "Not authenticated" };
    }

    if (!(await waitForConvexAuth())) {
      if (DEBUG_VERBOSE) {
        console.log("⏳ Completions: Waiting for auth...");
      }
      return { success: false, error: "Authentication not ready - please wait and try again" };
    }

    return performSafeOperation(async () => {
      await Promise.allSettled([this.pullCompletions(), this.pushCompletions()]);
      return {};
    }, "Completions sync");
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
      const anonymousActivityHistory = await localData.getAnonymousActivityHistory();

      let totalMigrated = 0;

      // Migrate completions
      if (anonymousCompletions.length > 0) {
        for (const completion of anonymousCompletions) {
          await localData.updateCompletion(completion.id, {
            userId: this.userId
          });
        }
        totalMigrated += anonymousCompletions.length;

        // Push migrated completions to server
        await this.pushCompletions();
      }

      // Migrate activity history
      if (anonymousActivityHistory.length > 0 && this.userId) {
        for (const activity of anonymousActivityHistory) {
          await localData.updateActivityHistoryUserId(activity.id, this.userId);
        }
        totalMigrated += anonymousActivityHistory.length;

        // Push migrated activity history to server
        await this.pushActivityHistory();
      }

      await completionsStore.refresh();

      return { migratedCount: totalMigrated };
    }, "Anonymous data migration");

    return {
      success: result.success,
      migratedCount: result.data?.migratedCount || 0,
      error: result.error
    };
  }

  /**
   * Full sync: sync user then sync all data types (calendars, habits, completions)
   */
  async fullSync(userInfo?: {
    email: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<SyncResult & { userSyncResult?: any }> {
    if (!this.userId || this.isSyncing) {
      return { success: false, error: "Not authenticated or already syncing" };
    }

    if (!(await waitForConvexAuth())) {
      return { success: false, error: "Authentication not ready - please wait and try again" };
    }

    return performSafeOperation(async () => {
      this.isSyncing = true;
      let userSyncResult: any;
      const syncResults: { [key: string]: SyncResult } = {};
      // 1. Sync user first if user info provided
      if (userInfo) {
        userSyncResult = await this.syncCurrentUser(userInfo);
        if (!userSyncResult.success) {
          throw new Error(`User sync failed: ${userSyncResult.error}`);
        }
      }

      // 2. Sync calendars (trigger store sync)
      try {
        const { calendarsStore } = await import("../stores/calendars");
        await calendarsStore.setUser(this.userId);
        syncResults.calendars = { success: true };
        if (DEBUG_VERBOSE) console.log("✅ Calendars synced");
      } catch (error) {
        console.warn("Calendar sync failed:", error);
        syncResults.calendars = {
          success: false,
          error: error instanceof Error ? error.message : "Calendar sync failed"
        };
      }

      // 3. Sync habits (trigger store sync)
      try {
        const { habits } = await import("../stores/habits");
        await habits.setUser(this.userId);
        syncResults.habits = { success: true };
        if (DEBUG_VERBOSE) console.log("✅ Habits synced");
      } catch (error) {
        console.warn("Habit sync failed:", error);
        syncResults.habits = {
          success: false,
          error: error instanceof Error ? error.message : "Habit sync failed"
        };
      }

      // 4. Sync completions
      syncResults.completions = await this.syncCompletions();
      if (syncResults.completions.success) {
        await completionsStore.refresh();
        if (DEBUG_VERBOSE) console.log("✅ Completions synced");
      } else {
        console.warn("Completion sync failed:", syncResults.completions.error);
      }

      // 5. Sync activity history
      syncResults.activityHistory = await this.syncActivityHistory();
      if (syncResults.activityHistory.success) {
        if (DEBUG_VERBOSE) console.log("✅ Activity History synced");
      } else {
        console.warn("Activity History sync failed:", syncResults.activityHistory.error);
      }

      // Check if any critical syncs failed
      const failedSyncs = Object.entries(syncResults)
        .filter(([, result]) => !result.success)
        .map(([type]) => type);

      if (failedSyncs.length > 0) {
        console.warn(`Some syncs failed: ${failedSyncs.join(", ")}`);
        // Don't fail the entire sync if only some parts failed
      }

      return {
        userSyncResult,
        syncResults
      };
    }, "Full sync").finally(() => {
      this.isSyncing = false;
    });
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
