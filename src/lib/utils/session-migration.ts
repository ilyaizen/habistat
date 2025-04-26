/**
 * Session Migration Utility
 *
 * This module handles the process of migrating data from an anonymous session
 * to an authenticated session when a user signs in. It includes functions for:
 *
 * 1. Associating anonymous data with a user ID
 * 2. Handling conflict resolution strategies
 * 3. Rollback capability if migration fails
 */

import { browser } from "$app/environment";
import { get, writable, type Writable } from "svelte/store";
import { markSessionClaimed, SESSION_MIGRATED_KEY } from "./tracking";

// Interface for migration status
interface MigrationStatus {
  status: "idle" | "in-progress" | "completed" | "failed";
  errorMessage?: string;
  startedAt?: number;
  completedAt?: number;
}

// Create a store to track migration status
export const migrationStatus = writable<MigrationStatus>({
  status: "idle"
});

// Create a backup store for rollback
const migrationBackup = writable<Record<string, string>>({});

/**
 * Represents the data associated with an anonymous user session.
 * TODO: Define the actual structure based on what needs to be migrated (e.g., local habits, settings).
 */
interface AnonymousSessionData {
  // Example: habits: LocalHabit[];
  // Example: settings: LocalSettings;
  [key: string]: any; // Placeholder
}

/**
 * Placeholder function to retrieve anonymous session data from local storage.
 * Needs implementation based on how anonymous data is stored.
 */
function getAnonymousData(): AnonymousSessionData | null {
  console.warn("getAnonymousData() not implemented.");
  // TODO: Implement logic to load data potentially associated with the anonymousId
  // from localStorage or other local stores.
  return null;
}

/**
 * Placeholder function to clear anonymous session data after successful migration.
 */
function clearAnonymousData(): void {
  console.warn("clearAnonymousData() not implemented.");
  // TODO: Implement logic to remove migrated data from localStorage.
}

/**
 * Associates anonymously stored session data with the newly authenticated user.
 * This function would typically be called after a user signs in or signs up
 * for the first time on a device that had an existing anonymous session.
 *
 * @param clerkUserId The Clerk User ID of the authenticated user.
 * @param authToken A valid Clerk authentication token for making authenticated requests (e.g., to Convex).
 */
export async function associateAnonymousDataWithUser(
  clerkUserId: string,
  authToken: string
): Promise<void> {
  console.log(`Attempting to associate anonymous data with user: ${clerkUserId}`);

  const anonymousData = getAnonymousData();

  if (!anonymousData) {
    console.log("No anonymous data found to associate.");
    return;
  }

  console.log("Found anonymous data:", anonymousData);

  try {
    // TODO: Implement the actual data migration logic.
    // This will likely involve:
    // 1. Calling a Convex mutation (or multiple mutations) via an authenticated client.
    // 2. Passing the clerkUserId and the anonymousData to the mutation.
    // 3. The mutation should handle merging/associating the data on the backend.
    //    - This might involve checking for existing data for the user and applying
    //      conflict resolution rules (e.g., server wins, client wins, merge strategies).
    console.warn("Data migration logic to Convex not implemented.");
    // Example (requires Convex client setup):
    // const convex = createConvexClient(import.meta.env.VITE_CONVEX_URL);
    // convex.setAuth(authToken);
    // await convex.mutation('users:migrateAnonymousData', { anonymousData });

    // If migration is successful, clear the local anonymous data.
    clearAnonymousData();
    console.log("Successfully associated anonymous data (simulation). Local data cleared.");
  } catch (error) {
    console.error("Failed to associate anonymous data:", error);
    // TODO: Implement error handling and potentially a retry mechanism or user notification.
    // Consider *not* clearing local data if the backend association fails.
    throw new Error("Failed to associate anonymous data with user.");
  }
}

/**
 * Placeholder for conflict resolution strategy.
 * This might involve comparing timestamps, prioritizing server data, or using specific merge logic.
 */
function resolveConflicts(localData: AnonymousSessionData, serverData: any): any {
  console.warn("resolveConflicts() not implemented.");
  // For now, just return local data as a placeholder
  return localData;
}

/**
 * Placeholder for potential rollback capability if claiming/migration fails.
 * This would involve restoring the local state if the backend operation fails critically.
 */
function rollbackMigration(): void {
  console.warn("rollbackMigration() not implemented.");
  // TODO: Implement logic to restore any local state changes made optimistically
  // before the migration attempt.
}

/**
 * Associates anonymous data with an authenticated user
 *
 * @param userId The authenticated user's ID
 * @param options Configuration options for the migration
 * @returns Promise resolving to success or failure
 */
export async function migrateAnonymousSession(
  userId: string,
  options: {
    conflictStrategy?: "keep-local" | "keep-remote" | "merge" | "prompt";
    timeout?: number;
  } = {}
): Promise<{ success: boolean; message?: string }> {
  if (!browser) {
    return {
      success: false,
      message: "Cannot migrate session on server side"
    };
  }

  // Check if migration already happened to prevent duplicate migrations
  if (localStorage.getItem(SESSION_MIGRATED_KEY) === "1") {
    console.log("Session already migrated via tracking module, skipping anonymous migration");

    // Update status to completed since tracking already migrated
    migrationStatus.set({
      status: "completed",
      completedAt: Date.now()
    });

    return {
      success: true,
      message: "Session was already migrated by tracking module"
    };
  }

  // Set default options
  const resolvedOptions = {
    conflictStrategy: options.conflictStrategy || "merge",
    timeout: options.timeout || 30000
  };

  try {
    // Update migration status
    migrationStatus.set({
      status: "in-progress",
      startedAt: Date.now()
    });

    // Backup local data for potential rollback
    createBackup();

    // Get all data from localStorage that should be associated with the user
    const dataToMigrate = collectLocalData();

    // For now, this is a simplified implementation
    // In a real app, this would:
    // 1. Upload the data to the backend (e.g., Convex)
    // 2. Handle conflicts based on the strategy
    // 3. Mark the session as claimed

    // Simulate async operation (replace with actual API call)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mark session as claimed to prevent duplicate migrations
    markSessionClaimed();

    // Also set the session migrated flag to ensure consistency with tracking module
    localStorage.setItem(SESSION_MIGRATED_KEY, "1");

    // Update status
    migrationStatus.set({
      status: "completed",
      startedAt: get(migrationStatus).startedAt,
      completedAt: Date.now()
    });

    return { success: true };
  } catch (error) {
    console.error("Session migration failed:", error);

    // Rollback if an error occurs
    await rollbackMigration();

    // Update status
    migrationStatus.set({
      status: "failed",
      startedAt: get(migrationStatus).startedAt,
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    });

    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error during migration"
    };
  }
}

/**
 * Collects all local data that should be migrated
 *
 * @returns Object mapping keys to data values
 */
function collectLocalData(): Record<string, string> {
  if (!browser) return {};

  const data: Record<string, string> = {};

  // Define prefixes for keys that should be migrated
  const migratablePrefixes = [
    "habistat_calendar_",
    "habistat_habit_",
    "habistat_completion_"
    // Add other prefixes as needed
  ];

  try {
    // Iterate through localStorage and collect relevant items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Check if this key should be migrated
      const shouldMigrate = migratablePrefixes.some((prefix) => key.startsWith(prefix));

      if (shouldMigrate) {
        const value = localStorage.getItem(key);
        if (value) {
          data[key] = value;
        }
      }
    }
  } catch (error) {
    console.error("Error collecting local data for migration:", error);
  }

  return data;
}

/**
 * Creates a backup of migratable data for rollback
 */
function createBackup(): void {
  if (!browser) return;

  const backup = collectLocalData();
  migrationBackup.set(backup);
}

/**
 * Checks if there is data to migrate
 *
 * @returns boolean indicating if there's data to migrate
 */
export function hasMigratableData(): boolean {
  if (!browser) return false;

  const data = collectLocalData();
  return Object.keys(data).length > 0;
}
