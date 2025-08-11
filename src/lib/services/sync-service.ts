/**
 * @file Sync Backend Service
 * @description Singleton service that orchestrates all sync operations between the
 * local SQLite database and the Convex backend. Handles user lifecycle, initial
 * pull-first semantics, bidirectional sync for supported data types, and
 * anonymous→authenticated data migration. Designed for resilience and clarity.
 */

import { get } from "svelte/store";
import { safeMutation, safeQuery } from "$lib/utils/safe-query";
import { api } from "../../convex/_generated/api";
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
import { clearAllLocalData } from "./local-data";

// Debug configuration
const DEBUG_VERBOSE = true;

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

/**
 * Core sync service used by the app. Exposed as a singleton via
 * `syncService` for convenience and compatibility.
 */
export class SyncService {
  private static instance: SyncService;
  private userId: string | null = null;
  private isSyncing = false;
  private userSyncing = false;
  private isInitialized = false;
  private lastClerkId: string | null = null;
  private authUnsubscribe: (() => void) | null = null;
  private syncInProgress = false;

  private constructor() {}

  /** Get the singleton instance. */
  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Initialize auth listeners and prepare the service. Safe to call multiple
   * times; subsequent calls are ignored.
   */
  public initialize(): void {
    if (this.isInitialized) {
      if (DEBUG_VERBOSE) console.log("SyncService: Already initialized, skipping...");
      return;
    }

    this.isInitialized = true;

    if (DEBUG_VERBOSE) {
      console.log("SyncService: Initializing and listening for auth changes...");
    }

    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }

    this.authUnsubscribe = authState.subscribe(async (state) => {
      if (!state.clerkReady) {
        if (DEBUG_VERBOSE) console.log("SyncService: Auth state not ready yet.");
        return;
      }

      const currentClerkId = state.clerkUserId;
      const hasSignedIn = currentClerkId && !this.lastClerkId;
      const hasSignedOut = !currentClerkId && this.lastClerkId;

      if (hasSignedIn) {
        if (DEBUG_VERBOSE) console.log(`SyncService: User signed in (ID: ${currentClerkId}).`);
        await this.handleUserSignIn(currentClerkId);
      } else if (hasSignedOut) {
        if (DEBUG_VERBOSE) console.log("SyncService: User signed out.");
        await this.handleUserSignOut();
      }

      this.lastClerkId = currentClerkId;
    });
  }

  /** Set the current user ID for subsequent operations. */
  public setUserId(userId: string | null): void {
    this.userId = userId;
  }

  /** Handle user sign-in: ensure user exists in Convex, migrate, then full sync. */
  public async handleUserSignIn(userId: string): Promise<void> {
    if (this.syncInProgress) {
      if (DEBUG_VERBOSE) {
        console.log(
          `SyncService: Sign-in sync already in progress for user ${userId}, skipping...`
        );
      }
      return;
    }

    this.syncInProgress = true;

    try {
      if (DEBUG_VERBOSE) {
        console.log(
          `SyncService: User signed in with ID: ${userId}. Starting user sync and full sync.`
        );
      }

      this.setUserId(userId);

      // Ensure the user record exists in Convex before other sync operations
      await this.syncUserToConvex(userId);

      // Migrate any anonymous data
      await this.migrateAnonymousData();

      // Perform a full sync
      const result = await this.fullSync();

      if (result.success) {
        if (DEBUG_VERBOSE) console.log("SyncService: Full sync completed successfully.");
      } else {
        console.error("SyncService: Full sync failed.", result.error);
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  /** Clear local data on sign-out. */
  public async handleUserSignOut(): Promise<void> {
    if (DEBUG_VERBOSE) {
      console.log("SyncService: User signed out. Clearing local data.");
    }
    this.setUserId(null);
    await clearAllLocalData();
  }

  /** Sync the current Clerk user info to Convex. */
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
   * Pull Clerk user info from the window and sync to Convex.
   */
  private async syncUserToConvex(clerkUserId: string): Promise<SyncResult> {
    try {
      if (DEBUG_VERBOSE) {
        console.log(`SyncService: Syncing user ${clerkUserId} to Convex...`);
      }

      const clerk = (window as any).Clerk;
      if (!clerk || !clerk.user) {
        console.warn("SyncService: Clerk user not available for sync");
        return { success: false, error: "Clerk user not available" };
      }

      const clerkUser = clerk.user;
      const userInfo = {
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        name: clerkUser.fullName || clerkUser.firstName || undefined,
        avatarUrl: clerkUser.imageUrl || undefined
      };

      if (!userInfo.email) {
        console.warn("SyncService: No email found for user, cannot sync");
        return { success: false, error: "User email not available" };
      }

      if (DEBUG_VERBOSE) {
        console.log(`SyncService: Syncing user with email: ${userInfo.email}`);
      }

      const result = await this.syncCurrentUser(userInfo);

      if (result.success) {
        if (DEBUG_VERBOSE) {
          console.log(`SyncService: User sync completed successfully for ${clerkUserId}`);
        }
      } else {
        console.error(`SyncService: User sync failed for ${clerkUserId}:`, result.error);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`SyncService: Error syncing user ${clerkUserId}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /** Generic per-type sync orchestration with initial pull-first semantics. */
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
      const last = await getLastSyncTimestamp(dataType);
      if (last === 0) {
        await pullFn();
        await pushFn();
      } else {
        await Promise.allSettled([pullFn(), pushFn()]);
      }
      return {};
    }, `${dataType} sync`);
  }

  // Activity History
  public async syncActivityHistory(): Promise<SyncResult> {
    return this.syncDataType(
      "activityHistory",
      () => this.pullActivityHistory(),
      () => this.pushActivityHistory()
    );
  }

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
      )) as {
        activityHistory: Array<{ _creationTime: number; localUuid: string; date: string }>;
        nextCursor?: string;
        isDone: boolean;
      } | null;

      if (!response) {
        throw new Error(getAuthError());
      }

      if (response.activityHistory.length === 0) break;

      totalProcessed += response.activityHistory.length;

      for (const serverActivity of response.activityHistory) {
        const localActivity = await localData.getActivityHistoryByDate(serverActivity.date);
        if (!localActivity) {
          await localData.createActivityHistory({
            id: serverActivity.localUuid,
            localUuid: serverActivity.localUuid,
            userId: this.userId,
            date: serverActivity.date
          } as any);
        }
      }

      cursor = response.nextCursor;
    } while (cursor);

    await updateLastSyncTimestamp("activityHistory", Date.now());

    if (DEBUG_VERBOSE && totalProcessed > 0) {
      console.log(`✅ Activity History: Pulled ${totalProcessed} entries`);
    }
  }

  private async pushActivityHistory(): Promise<void> {
    if (!this.userId) throw new Error("No user ID");

    const lastSync = await getLastSyncTimestamp("activityHistory");
    const localActivities = await localData.getActivityHistorySince(lastSync);

    if (localActivities.length === 0) return;

    const activitiesToSync = localActivities.map((activity) => ({
      localUuid: activity.id,
      date: activity.date
    }));

    await safeMutation(
      api.activityHistory.batchUpsertActivityHistory,
      { entries: activitiesToSync },
      { logErrors: true }
    );

    if (DEBUG_VERBOSE) {
      console.log(`✅ Activity History: Pushed ${activitiesToSync.length} entries`);
    }
  }

  // Completions
  public async syncCompletions(): Promise<SyncResult> {
    return this.syncDataType(
      "completions",
      () => this.pullCompletions(),
      () => this.pushCompletions()
    );
  }

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

      // Optimization: batch map unknown Convex habit IDs to local UUIDs once per page
      // to avoid O(N) Convex queries when many completions reference the same habits.
      const localHabitByConvexId = new Map<
        string,
        Awaited<ReturnType<typeof localData.getHabitByConvexId>> | null
      >();
      const unknownConvexHabitIds = new Set<string>();

      // First pass: try to resolve habits locally and collect unknowns
      for (const sc of response.completions) {
        const known = await localData.getHabitByConvexId(sc.habitId);
        localHabitByConvexId.set(sc.habitId, known || null);
        if (!known) unknownConvexHabitIds.add(sc.habitId);
      }

      // Batch map unknown Convex IDs -> local UUIDs and resolve locally
      if (unknownConvexHabitIds.size > 0) {
        try {
          const idMap = (await safeQuery(
            api.habits.mapLocalUuidsByConvexIds,
            { habitIds: Array.from(unknownConvexHabitIds) },
            { retries: 2, logErrors: false }
          )) as Record<string, string> | null;

          if (idMap) {
            for (const [convexId, localUuid] of Object.entries(idMap)) {
              if (!localHabitByConvexId.get(convexId)) {
                const localHabit = await localData.getHabitById(localUuid);
                localHabitByConvexId.set(convexId, localHabit || null);
              }
            }
          }
        } catch (e) {
          if (DEBUG_VERBOSE) console.warn("Habit ID batch mapping failed", e);
        }
      }

      // Second pass: process completions using resolved habit mapping
      for (const serverCompletion of response.completions) {
        const localHabit = localHabitByConvexId.get(serverCompletion.habitId) || null;
        if (!localHabit) {
          if (DEBUG_VERBOSE) {
            console.warn(
              `❌ Skipping completion for unknown habit with Convex ID: ${serverCompletion.habitId}`
            );
          }
          continue;
        }

        if (DEBUG_VERBOSE) {
          console.log(
            `🔄 Processing completion: ${serverCompletion.localUuid} for habit: ${localHabit.name}`
          );
        }

        serverCompletion.habitId = localHabit.id;
        const localCompletion = await localData.getCompletionByLocalUuid(
          serverCompletion.localUuid
        );

        if (!localCompletion) {
          await localData.createCompletion({
            id: serverCompletion.localUuid,
            userId: this.userId,
            habitId: serverCompletion.habitId,
            completedAt: serverCompletion.completedAt,
            clientUpdatedAt: serverCompletion.completedAt
          });
          if (DEBUG_VERBOSE) {
            console.log(`✅ Created new completion: ${serverCompletion.localUuid}`);
          }
        } else if (serverCompletion.completedAt > localCompletion.completedAt) {
          await localData.updateCompletion(localCompletion.id, {
            completedAt: serverCompletion.completedAt
          });
          if (DEBUG_VERBOSE) {
            console.log(`🔄 Updated completion: ${localCompletion.id}`);
          }
        } else if (DEBUG_VERBOSE) {
          console.log(`⏭️ Skipped completion (local is newer): ${localCompletion.id}`);
        }
      }

      cursor = response.nextCursor;
    } while (cursor);

    await updateLastSyncTimestamp("completions", Date.now());

    if (DEBUG_VERBOSE && totalProcessed > 0) {
      console.log(`✅ Completions: Pulled ${totalProcessed} entries`);
    }
  }

  private async pushCompletions(): Promise<void> {
    if (!this.userId) throw new Error("No user ID");

    const lastSync = await getLastSyncTimestamp("completions");
    const localCompletions = await localData.getUserCompletions(this.userId);

    const completionsToSync = localCompletions.filter(
      (completion) => completion.completedAt > lastSync
    );

    if (completionsToSync.length === 0) return;

    const syncData = completionsToSync.map((c) => ({
      localUuid: c.id,
      habitId: c.habitId,
      completedAt: c.completedAt
    }));

    const mappedCompletions = await mapCompletionHabitIds(syncData);

    await safeMutation(
      api.completions.batchUpsertCompletions,
      { completions: mappedCompletions },
      { retries: 3, logErrors: true }
    );

    if (DEBUG_VERBOSE) {
      console.log(`✅ Completions: Pushed ${mappedCompletions.length} entries`);
    }
  }

  // Anonymous data migration
  public async migrateAnonymousData(): Promise<{
    success: boolean;
    migratedCount: number;
    error?: string;
  }> {
    if (!this.userId) {
      console.warn("Cannot migrate data without a user ID.");
      return { success: false, migratedCount: 0, error: "User not authenticated" };
    }

    const userId = this.userId;

    const result = await performSafeOperation(async () => {
      let totalMigrated = 0;

      const anonymousCompletions = await localData.getAnonymousCompletions();
      if (anonymousCompletions.length > 0) {
        for (const completion of anonymousCompletions) {
          await localData.updateCompletion(completion.id, { userId });
        }
        totalMigrated += anonymousCompletions.length;
        await this.pushCompletions();
      }

      const anonymousActivityHistory = await localData.getAnonymousActivityHistory();
      if (anonymousActivityHistory.length > 0) {
        // Use merge strategy to avoid UNIQUE constraint violations on (userId, date)
        const migratedCount = await localData.migrateAnonymousActivityHistory(userId);
        totalMigrated += migratedCount;
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

  /** Full synchronization across supported data types. */
  public async fullSync(userInfo?: {
    email: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<SyncResult & { userSyncResult?: any }> {
    if (this.isSyncing) {
      return { success: false, error: "Sync already in progress" };
    }

    if (!this.userId) {
      const currentAuthState = get({ subscribe: authState.subscribe });
      if (currentAuthState?.clerkUserId) {
        this.setUserId(currentAuthState.clerkUserId);
        if (DEBUG_VERBOSE) {
          console.log(`SyncService: Set userId from auth state: ${currentAuthState.clerkUserId}`);
        }
      } else {
        return { success: false, error: "Not authenticated - no user ID available" };
      }
    }

    if (!(await waitForConvexAuth())) {
      return { success: false, error: "Authentication not ready - please wait and try again" };
    }

    return performSafeOperation(async () => {
      this.isSyncing = true;
      let userSyncResult: any;
      const syncResults: { [key: string]: SyncResult } = {};

      // Optionally sync user profile first when provided
      if (userInfo) {
        userSyncResult = await this.syncCurrentUser(userInfo);
        if (!userSyncResult.success) {
          throw new Error(`User sync failed: ${userSyncResult.error}`);
        }
      }

      // Calendars
      try {
        const { calendarsStore } = await import("../stores/calendars");
        const isInitialSync = userInfo !== undefined;
        await calendarsStore.setUser(this.userId, isInitialSync);
        syncResults.calendars = { success: true };
        if (DEBUG_VERBOSE) console.log("✅ Calendars synced");
      } catch (error) {
        console.warn("Calendar sync failed:", error);
        syncResults.calendars = {
          success: false,
          error: error instanceof Error ? error.message : "Calendar sync failed"
        };
      }

      // Habits
      try {
        const { habits } = await import("../stores/habits");
        const isInitialSync = userInfo !== undefined;
        await habits.setUser(this.userId, isInitialSync);
        syncResults.habits = { success: true };
        if (DEBUG_VERBOSE) console.log("✅ Habits synced");
      } catch (error) {
        console.warn("Habit sync failed:", error);
        syncResults.habits = {
          success: false,
          error: error instanceof Error ? error.message : "Habit sync failed"
        };
      }

      // Completions
      syncResults.completions = await this.syncCompletions();
      if (syncResults.completions.success) {
        await completionsStore.refresh();
        if (DEBUG_VERBOSE) console.log("✅ Completions synced");
      } else {
        console.warn("Completion sync failed:", syncResults.completions.error);
      }

      // Activity History
      syncResults.activityHistory = await this.syncActivityHistory();
      if (syncResults.activityHistory.success) {
        if (DEBUG_VERBOSE) console.log("✅ Activity History synced");
      } else {
        console.warn("Activity History sync failed:", syncResults.activityHistory.error);
      }

      const failedSyncs = Object.entries(syncResults)
        .filter(([, result]) => !result.success)
        .map(([type]) => type);

      if (failedSyncs.length > 0) {
        console.warn(`Some syncs failed: ${failedSyncs.join(", ")}`);
      }

      return {
        userSyncResult,
        syncResults
      };
    }, "Full sync").finally(() => {
      this.isSyncing = false;
    });
  }

  public isInProgress(): boolean {
    return this.isSyncing || this.userSyncing;
  }

  public isUserSyncInProgress(): boolean {
    return this.userSyncing;
  }

  public getLastSyncedUserId(): string | null {
    return this.lastClerkId;
  }

  /** Reset service state and remove listeners (useful for tests). */
  public reset(): void {
    this.lastClerkId = null;
    this.isSyncing = false;
    this.userSyncing = false;
    this.userId = null;
    this.syncInProgress = false;

    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }

    this.isInitialized = false;
  }
}

// Export singleton instance for application use
export const syncService = SyncService.getInstance();
