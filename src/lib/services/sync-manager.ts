/**
 * @file src/lib/services/sync-manager.ts
 * @description Manages the application's synchronization lifecycle. It listens for authentication
 * changes and triggers the appropriate sync processes, ensuring that local and remote data are
 * kept in harmony. This manager is the central authority for deciding when to perform a full sync,
 * migrate anonymous data, or clear local data on sign-out.
 */

import { browser } from "$app/environment";
import { authState } from "$lib/stores/auth-state";
import { clearAllLocalData } from "./local-data";
import { SyncService } from "./sync";
import { setupUserSync } from "./user-sync";

const DEBUG_VERBOSE = true;

/**
 * Manages the synchronization lifecycle of the application.
 */
class SyncManager {
  private static instance: SyncManager;
  private syncService: SyncService;
  private isInitialized = false;
  private lastClerkId: string | null = null;

  private constructor() {
    this.syncService = new SyncService();
    setupUserSync(this.syncService);
    if (browser) {
      this.initialize();
    }
  }

  /**
   * Gets the singleton instance of the SyncManager.
   */
  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  /**
   * Initializes the sync manager, setting up listeners for auth changes.
   */
  private initialize(): void {
    if (this.isInitialized || !browser) return;
    this.isInitialized = true;

    if (DEBUG_VERBOSE) {
      console.log("SyncManager: Initializing and listening for auth changes...");
    }

    authState.subscribe(async (state) => {
      if (!state.clerkReady) {
        if (DEBUG_VERBOSE) console.log("SyncManager: Auth state not ready yet.");
        return;
      }

      const currentClerkId = state.clerkUserId;

      // Only trigger on a definitive state change
      const hasSignedIn = currentClerkId && !this.lastClerkId;
      const hasSignedOut = !currentClerkId && this.lastClerkId;

      if (hasSignedIn) {
        if (DEBUG_VERBOSE)
          console.log(`SyncManager: Detected user sign-in (ID: ${currentClerkId}).`);
        await this.handleUserSignIn(currentClerkId);
      } else if (hasSignedOut) {
        if (DEBUG_VERBOSE) console.log("SyncManager: Detected user sign-out.");
        await this.handleUserSignOut();
      }

      // Update the last known user ID
      this.lastClerkId = currentClerkId;
    });
  }

  /**
   * Handles user sign-in events, sets the user ID, and triggers a full sync.
   */
  private async handleUserSignIn(userId: string): Promise<void> {
    if (DEBUG_VERBOSE) {
      console.log(`SyncManager: User signed in with ID: ${userId}. Starting full sync.`);
    }

    this.syncService.setUserId(userId);

    // First, migrate any anonymous data to the new user's account.
    await this.syncService.migrateAnonymousData();

    // Then, perform a full sync.
    // Note: We don't have access to the full user object here, so we pass undefined.
    // The syncCurrentUser method in SyncService should handle this gracefully.
    const result = await this.syncService.fullSync();

    if (result.success) {
      if (DEBUG_VERBOSE) console.log("SyncManager: Full sync completed successfully.");
    } else {
      console.error("SyncManager: Full sync failed.", result.error);
    }
  }

  /**
   * Handles user sign-out events, clearing local data.
   */
  private async handleUserSignOut(): Promise<void> {
    if (DEBUG_VERBOSE) {
      console.log("SyncManager: User signed out. Clearing local data.");
    }
    this.syncService.setUserId(null);
    await clearAllLocalData();
  }

  /**
   * Provides access to the underlying SyncService instance for manual sync triggers.
   */
  public getSyncService(): SyncService {
    return this.syncService;
  }
}

// Export a singleton instance of the sync manager
export const syncManager = SyncManager.getInstance();
