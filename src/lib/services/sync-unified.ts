/**
 * @file Unified Sync Service - Consolidated sync logic with DRY principles
 * @description Single source of truth for all sync operations, replacing multiple legacy services
 *
 * REPLACES THE FOLLOWING DEPRECATED FILES:
 * - src/lib/services/sync.ts (SyncService class)
 * - src/lib/services/user-sync.ts (UserSyncService and related functions)
 * - src/lib/services/sync-manager.ts (SyncManager initialization)
 *
 * CONSOLIDATION BENEFITS:
 * - Eliminates code duplication across sync services
 * - Provides unified error handling and logging
 * - Simplifies sync state management
 * - Reduces complexity in component integration
 *
 * KEY ARCHITECTURAL PRINCIPLES:
 * - Local-first: SQLite database is the authoritative source of truth
 * - Last-Write-Wins: Uses clientUpdatedAt timestamps for conflict resolution
 * - Bidirectional sync: Supports both pull (server→local) and push (local→server) operations
 * - Atomic operations: All sync operations are wrapped in safe error handling
 * - Authentication-aware: Automatically handles auth state changes and user transitions
 * - Network-resilient: Gracefully handles offline/online state transitions
 *
 * USAGE:
 * Import the singleton instance: `import { unifiedSyncService } from './sync-unified';`
 * The service is automatically initialized when imported by sync-consolidated.ts
 */

import type { InferModel } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { formatLocalDate } from "$lib/utils/date";
import { safeMutation, safeQuery } from "$lib/utils/safe-query";
import { getAppOpenHistory } from "$lib/utils/tracking";
import { api } from "../../convex/_generated/api";
import type { completions as completionsSchema } from "../db/schema";
import { authState } from "../stores/auth-state";
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

// Define common shapes for syncable entities
export interface SyncableEntity {
  id: string;
  clientUpdatedAt: string;
  userId?: string | null;
}

export interface SyncableEntityFromConvex {
  _id: string;
  _creationTime: number;
  clientUpdatedAt?: string;
  userId?: string;
}

import { clearAllLocalData } from "./local-data";

// Debug configuration
const DEBUG_VERBOSE = true;

/**
 * Unified sync service that handles all synchronization operations
 * Replaces SyncService, UserSyncService, and SyncManager with a single, DRY implementation
 */
/**
 * @class UnifiedSyncService
 * @description A singleton service to manage all data synchronization between the local
 * SQLite database and the remote Convex backend. It handles users, calendars, habits,
 * completions, and activity history. It is designed to be resilient to network
 * conditions and authentication state changes.
 *
 * This service consolidates the logic from previous, separate sync services into a single,
 * unified, and DRY implementation.
 *
 * Key responsibilities:
 * - Bidirectional sync with last-write-wins conflict resolution.
 * - Full and partial sync triggers.
 * - Authentication-aware sync operations.
 * - Data migration for anonymous users upon sign-in.
 * - Centralized error handling and status reporting via the consolidated sync store.
 */
export class UnifiedSyncService {
  private static instance: UnifiedSyncService;
  private userId: string | null = null;
  private isSyncing = false;
  private userSyncing = false;
  private isInitialized = false;
  private lastClerkId: string | null = null;
  private authUnsubscribe: (() => void) | null = null;
  private syncInProgress = false;

  /**
   * Private constructor to enforce the singleton pattern. Initializes the service
   * by subscribing to authentication and network status changes.
   */
  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance of the unified sync service
   */
  /**
   * Returns the singleton instance of the UnifiedSyncService.
   * @returns {UnifiedSyncService} The singleton instance.
   */
  public static getInstance(): UnifiedSyncService {
    if (!UnifiedSyncService.instance) {
      UnifiedSyncService.instance = new UnifiedSyncService();
    }
    return UnifiedSyncService.instance;
  }

  /**
   * Initialize the sync service and set up auth listeners
   * Replaces SyncManager.initialize()
   *
   * IMPORTANT: This method includes guards to prevent multiple initializations
   * and duplicate auth subscriptions that were causing sync duplication issues.
   */
  public initialize(): void {
    // Prevent multiple initializations
    if (this.isInitialized) {
      if (DEBUG_VERBOSE) {
        console.log("UnifiedSyncService: Already initialized, skipping...");
      }
      return;
    }

    this.isInitialized = true;

    if (DEBUG_VERBOSE) {
      console.log("UnifiedSyncService: Initializing and listening for auth changes...");
    }

    // Clean up any existing subscription before creating a new one
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }

    // Listen for auth state changes with proper cleanup
    this.authUnsubscribe = authState.subscribe(async (state) => {
      if (!state.clerkReady) {
        if (DEBUG_VERBOSE) console.log("UnifiedSyncService: Auth state not ready yet.");
        return;
      }

      const currentClerkId = state.clerkUserId;

      // Detect sign-in/sign-out events
      const hasSignedIn = currentClerkId && !this.lastClerkId;
      const hasSignedOut = !currentClerkId && this.lastClerkId;

      if (hasSignedIn) {
        if (DEBUG_VERBOSE)
          console.log(`UnifiedSyncService: User signed in (ID: ${currentClerkId}).`);
        await this.handleUserSignIn(currentClerkId);
      } else if (hasSignedOut) {
        if (DEBUG_VERBOSE) console.log("UnifiedSyncService: User signed out.");
        await this.handleUserSignOut();
      }

      this.lastClerkId = currentClerkId;
    });
  }

  /**
   * Set the current user ID for sync operations
   */
  /**
   * Sets the current user ID for subsequent sync operations.
   * @param {string | null} userId - The ID of the user to sync.
   */
  public setUserId(userId: string | null): void {
    this.userId = userId;
  }

  /**
   * Handle user sign-in events
   * Replaces SyncManager.handleUserSignIn()
   *
   * IMPORTANT: Added sync deduplication to prevent multiple concurrent syncs
   * that were causing the 4x sync duplication issue.
   *
   * FIXED: Now properly creates user records in Convex during sign-in
   */
  public async handleUserSignIn(userId: string): Promise<void> {
    // Prevent concurrent sign-in handling
    if (this.syncInProgress) {
      if (DEBUG_VERBOSE) {
        console.log(
          `UnifiedSyncService: Sign-in sync already in progress for user ${userId}, skipping...`
        );
      }
      return;
    }

    this.syncInProgress = true;

    try {
      if (DEBUG_VERBOSE) {
        console.log(
          `UnifiedSyncService: User signed in with ID: ${userId}. Starting user sync and full sync.`
        );
      }

      this.setUserId(userId);

      // CRITICAL FIX: Sync user to Convex database first
      // This creates the user record that other sync operations depend on
      await this.syncUserToConvex(userId);

      // First, migrate any anonymous data to the new user's account
      await this.migrateAnonymousData();

      // Then, perform a full sync
      const result = await this.fullSync();

      if (result.success) {
        if (DEBUG_VERBOSE) console.log("UnifiedSyncService: Full sync completed successfully.");
      } else {
        console.error("UnifiedSyncService: Full sync failed.", result.error);
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Handle user sign-out events
   * Replaces SyncManager.handleUserSignOut()
   */
  /**
   * Clears local data when the user signs out.
   */
  public async handleUserSignOut(): Promise<void> {
    if (DEBUG_VERBOSE) {
      console.log("UnifiedSyncService: User signed out. Clearing local data.");
    }
    this.setUserId(null);
    await clearAllLocalData();
  }

  /**
   * Sync current user to Convex database
   * Replaces UserSyncService.syncUser() and SyncService.syncCurrentUser()
   */
  /**
   * Syncs the current user's data with the Convex backend. This is typically called
   * on user sign-in or when the auth state is first established.
   *
   * @param {string} clerkUserId - The user's Clerk ID.
   * @param {string | null} lastSyncedAt - The timestamp of the last successful user sync.
   * @param {object} userInfo - The user's information to sync.
   * @param {string} userInfo.email - The user's email address.
   * @param {string} [userInfo.name] - The user's name.
   * @param {string} [userInfo.avatarUrl] - The user's avatar URL.
   * @returns {Promise<SyncResult & { userId?: string }>} The result of the user sync operation.
   */
  public async syncCurrentUser(userInfo: {
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
   * Sync user to Convex database using Clerk user information
   * This method retrieves user info from Clerk and creates/updates the user record in Convex
   *
   * @param {string} clerkUserId - The Clerk user ID
   * @returns {Promise<SyncResult>} The result of the user sync operation
   */
  private async syncUserToConvex(clerkUserId: string): Promise<SyncResult> {
    try {
      if (DEBUG_VERBOSE) {
        console.log(`UnifiedSyncService: Syncing user ${clerkUserId} to Convex...`);
      }

      // Get Clerk user information from the window object
      // This is available after Clerk has loaded and user is authenticated
      const clerk = (window as any).Clerk;
      if (!clerk || !clerk.user) {
        console.warn("UnifiedSyncService: Clerk user not available for sync");
        return { success: false, error: "Clerk user not available" };
      }

      const clerkUser = clerk.user;
      const userInfo = {
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        name: clerkUser.fullName || clerkUser.firstName || undefined,
        avatarUrl: clerkUser.imageUrl || undefined
      };

      // Validate that we have at least an email
      if (!userInfo.email) {
        console.warn("UnifiedSyncService: No email found for user, cannot sync");
        return { success: false, error: "User email not available" };
      }

      if (DEBUG_VERBOSE) {
        console.log(`UnifiedSyncService: Syncing user with email: ${userInfo.email}`);
      }

      // Call the existing syncCurrentUser method with the user info
      const result = await this.syncCurrentUser(userInfo);

      if (result.success) {
        if (DEBUG_VERBOSE) {
          console.log(`UnifiedSyncService: User sync completed successfully for ${clerkUserId}`);
        }
      } else {
        console.error(`UnifiedSyncService: User sync failed for ${clerkUserId}:`, result.error);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`UnifiedSyncService: Error syncing user ${clerkUserId}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Generic sync method for any data type
   * DRY implementation that can handle calendars, habits, completions, and activity history
   */
  /**
   * A generic, reusable method to perform bidirectional synchronization for a specific data type.
   *
   * @template T - The local entity type (e.g., Habit).
   * @template C - The Convex entity type (e.g., HabitFromConvex).
   * @param {SyncDataOptions<T, C>} options - The options for the sync operation.
   * @returns {Promise<SyncOperationResult>} The result of the sync operation for this data type.
   */
  private async syncDataType<T extends SyncableEntity, C extends SyncableEntityFromConvex>(
    dataType: "calendars" | "habits" | "completions" | "activityHistory",
    pullFn: () => Promise<void>,
    pushFn: () => Promise<void>
  ): Promise<SyncResult> {
    if (!this.userId) {
      return { success: false, error: "Not authenticated" };
    }

    if (!(await waitForConvexAuth())) {
      if (DEBUG_VERBOSE) {
        console.log(`⏳ ${dataType}: Waiting for auth...`);
      }
      return { success: false, error: "Authentication not ready - please wait and try again" };
    }

    return performSafeOperation(async () => {
      await Promise.allSettled([pullFn(), pushFn()]);
      return {};
    }, `${dataType} sync`);
  }

  /**
   * Sync activity history bidirectionally
   * Consolidates activity history sync logic
   */
  /**
   * Syncs activity history data between the local database and the Convex backend.
   * @returns {Promise<SyncResult>} The result of the activity history sync operation.
   */
  public async syncActivityHistory(): Promise<SyncResult> {
    return this.syncDataType(
      "activityHistory",
      () => this.pullActivityHistory(),
      () => this.pushActivityHistory()
    );
  }

  /**
   * Pull activity history changes from server
   */
  /**
   * Retrieves activity history data from the Convex backend and updates the local database.
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
            localUuid: serverActivity.localUuid, // Sync correlation ID
            userId: this.userId,
            date: serverActivity.date,
            firstOpenAt: serverActivity.firstOpenAt,
            clientUpdatedAt: serverActivity.clientUpdatedAt
          });
        } else if (serverActivity.clientUpdatedAt > localActivity.clientUpdatedAt) {
          // Update local entry if server is newer (Last-Write-Wins)
          await localData.updateActivityHistory(localActivity.id, {
            firstOpenAt: serverActivity.firstOpenAt,
            clientUpdatedAt: serverActivity.clientUpdatedAt
          });
        }
      }

      cursor = response.nextCursor;
    } while (cursor);

    // Update last sync timestamp
    await updateLastSyncTimestamp("activityHistory", Date.now());

    if (DEBUG_VERBOSE && totalProcessed > 0) {
      console.log(`✅ Activity History: Pulled ${totalProcessed} entries`);
    }
  }

  /**
   * Push local activity history changes to server
   */
  /**
   * Uploads local activity history data to the Convex backend.
   */
  private async pushActivityHistory(): Promise<void> {
    if (!this.userId) throw new Error("No user ID");

    const lastSync = await getLastSyncTimestamp("activityHistory");
    const localActivities = await localData.getActivityHistorySince(lastSync);

    if (localActivities.length === 0) return;

    // Map to Convex format
    const activitiesToSync = localActivities.map((activity) => ({
      localUuid: activity.id,
      date: activity.date,
      firstOpenAt: activity.firstOpenAt,
      clientUpdatedAt: activity.clientUpdatedAt
    }));

    // Batch upsert to server
    await safeMutation(
      api.activityHistory.batchUpsertActivityHistory,
      { entries: activitiesToSync },
      { logErrors: true }
    );

    if (DEBUG_VERBOSE) {
      console.log(`✅ Activity History: Pushed ${activitiesToSync.length} entries`);
    }
  }

  /**
   * Sync completions bidirectionally with proper habit ID mapping
   * Consolidates completion sync logic
   */
  /**
   * Syncs completion data between the local database and the Convex backend.
   * @returns {Promise<SyncResult>} The result of the completion sync operation.
   */
  public async syncCompletions(): Promise<SyncResult> {
    return this.syncDataType(
      "completions",
      () => this.pullCompletions(),
      () => this.pushCompletions()
    );
  }

  /**
   * Pull completion changes from server
   */
  /**
   * Retrieves completion data from the Convex backend and updates the local database.
   */
  private async pullCompletions(): Promise<void> {
    if (!this.userId) throw new Error("No user ID");

    const lastSync = await getLastSyncTimestamp("completions");
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

      // Process completions efficiently
      for (const serverCompletion of response.completions) {
        // Map Convex habit ID back to local habit ID
        const localHabit = await localData.getHabitByConvexId(serverCompletion.habitId);
        if (!localHabit) {
          if (DEBUG_VERBOSE) {
            console.warn(
              `Skipping completion for unknown habit with Convex ID: ${serverCompletion.habitId}`
            );
          }
          continue;
        }

        serverCompletion.habitId = localHabit.id; // Replace with local ID
        const localCompletion = await localData.getCompletionByLocalUuid(
          serverCompletion.localUuid
        );

        if (!localCompletion) {
          // Create new local completion
          await localData.createCompletion({
            id: serverCompletion.localUuid,
            userId: this.userId,
            habitId: serverCompletion.habitId,
            completedAt: serverCompletion.completedAt,
            clientUpdatedAt: Date.now() // Ensure clientUpdatedAt is set as Unix timestamp
          });
        } else if (serverCompletion.completedAt > localCompletion.completedAt) {
          // Update local completion if server is newer (Last-Write-Wins)
          await localData.updateCompletion(localCompletion.id, {
            completedAt: serverCompletion.completedAt
          });
        }
      }

      cursor = response.nextCursor;
    } while (cursor);

    // Update last sync timestamp
    await updateLastSyncTimestamp("completions", Date.now());

    if (DEBUG_VERBOSE && totalProcessed > 0) {
      console.log(`✅ Completions: Pulled ${totalProcessed} entries`);
    }
  }

  /**
   * Push local completion changes to server with habit ID mapping
   */
  /**
   * Uploads local completion data to the Convex backend.
   */
  private async pushCompletions(): Promise<void> {
    if (!this.userId) throw new Error("No user ID");

    const lastSync = await getLastSyncTimestamp("completions");
    const localCompletions = await localData.getUserCompletions(this.userId);

    // Filter completions that need syncing
    const completionsToSync = localCompletions.filter(
      (completion) => completion.completedAt > lastSync
    );

    if (completionsToSync.length === 0) return;

    // Map to the format expected by the sync function
    const syncData = completionsToSync.map((c) => ({
      localUuid: c.id,
      habitId: c.habitId,
      completedAt: c.completedAt
    }));

    // Map habit IDs from local to server format
    const mappedCompletions = await mapCompletionHabitIds(syncData);

    // Batch upsert to server
    await safeMutation(
      api.completions.batchUpsertCompletions,
      { completions: mappedCompletions },
      { retries: 3, logErrors: true }
    );

    if (DEBUG_VERBOSE) {
      console.log(`✅ Completions: Pushed ${mappedCompletions.length} entries`);
    }
  }

  /**
   * Migrate anonymous data to authenticated user account
   * Consolidates migration logic
   */
  /**
   * Migrates local data from an anonymous user profile to a newly authenticated user profile.
   * This ensures that data created offline or before sign-in is not lost.
   *
   * @returns {Promise<{ success: boolean; migratedCount: number; error?: string }>} The result of the migration operation.
   */
  public async migrateAnonymousData(): Promise<{
    success: boolean;
    migratedCount: number;
    error?: string;
  }> {
    if (!this.userId) {
      console.warn("Cannot migrate data without a user ID.");
      return { success: false, migratedCount: 0, error: "User not authenticated" };
    }

    // Establish a constant for the user ID to satisfy TypeScript's null analysis
    const userId = this.userId;

    const result = await performSafeOperation(async () => {
      let totalMigrated = 0;

      // Migrate anonymous completions
      const anonymousCompletions = await localData.getAnonymousCompletions();
      if (anonymousCompletions.length > 0) {
        for (const completion of anonymousCompletions) {
          await localData.updateCompletion(completion.id, { userId });
        }
        totalMigrated += anonymousCompletions.length;

        // Push migrated completions to server
        await this.pushCompletions();
      }

      // Migrate anonymous activity history
      const anonymousActivityHistory = await localData.getAnonymousActivityHistory();
      if (anonymousActivityHistory.length > 0) {
        for (const activity of anonymousActivityHistory) {
          await localData.updateActivityHistoryUserId(activity.id, userId);
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
   * Full sync: sync user then sync all data types
   * Consolidates full sync logic from multiple services
   */
  /**
   * Performs a full, bidirectional synchronization of all data types (calendars, habits,
   * completions, activity history) between the local database and the Convex backend.
   *
   * @param options - The sync options.
   * @param {string} options.userId - The ID of the user whose data is being synced.
   * @param {boolean} [options.force] - If true, forces a sync even if one was recently completed.
   * @returns {Promise<SyncResult>} A summary of the sync operation results.
   */
  public async fullSync(userInfo?: {
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
  public isInProgress(): boolean {
    return this.isSyncing || this.userSyncing;
  }

  /**
   * Check if user sync is currently in progress
   */
  public isUserSyncInProgress(): boolean {
    return this.userSyncing;
  }

  /**
   * Get the last synced user ID
   */
  public getLastSyncedUserId(): string | null {
    return this.lastClerkId;
  }

  /**
   * Reset sync state (useful for testing or manual reset)
   * Enhanced to properly clean up subscriptions and prevent memory leaks
   */
  public reset(): void {
    this.lastClerkId = null;
    this.isSyncing = false;
    this.userSyncing = false;
    this.userId = null;
    this.syncInProgress = false;

    // Clean up auth subscription
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }

    this.isInitialized = false;
  }
}

// Export singleton instance
export const unifiedSyncService = UnifiedSyncService.getInstance();
