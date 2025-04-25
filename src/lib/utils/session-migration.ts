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
 * Rolls back a failed migration by restoring data from backup
 */
async function rollbackMigration(): Promise<void> {
  if (!browser) return;

  const backup = get(migrationBackup);

  try {
    // Restore each item from backup
    Object.entries(backup).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });

    console.log("Migration rolled back successfully");
  } catch (error) {
    console.error("Error rolling back migration:", error);
  }
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
