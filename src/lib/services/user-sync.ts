import type { UserResource } from "@clerk/types";
import { get } from "svelte/store";
import { authState } from "../stores/auth-state";
import type { SyncService } from "./sync";

/**
 * User synchronization service for handling Convex/Clerk user sync
 *
 * This service automatically syncs user data to Convex when authentication
 * state changes, ensuring users exist in the Convex database with proper
 * uniqueness constraints on both email and clerkId.
 */
class UserSyncService {
  private syncService: SyncService | null = null;
  private lastSyncedUserId: string | null = null;
  private syncInProgress = false;

  /**
   * Initialize the user sync service with a sync service instance
   */
  initialize(syncService: SyncService) {
    this.syncService = syncService;
    // Debug: UserSync service initialized
    // console.log("[UserSync] Service initialized");
  }

  /**
   * Extract user information from Clerk user object
   */
  private extractUserInfo(user: UserResource) {
    const primaryEmail = user.primaryEmailAddress?.emailAddress;
    if (!primaryEmail) {
      throw new Error("User must have a primary email address");
    }

    return {
      email: primaryEmail,
      name: user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || undefined,
      avatarUrl: user.imageUrl || undefined
    };
  }

  /**
   * Sync user to Convex database
   *
   * @param user - Clerk user object
   * @param force - Force sync even if user was already synced
   * @returns Promise with sync result
   */
  async syncUser(
    user: UserResource,
    force = false
  ): Promise<{ success: boolean; error?: string; userId?: string; skipped?: boolean }> {
    if (!this.syncService) {
      console.warn("[UserSync] Service not initialized");
      return { success: false, error: "UserSync service not initialized" };
    }

    // Skip if already syncing or if user was already synced (unless forced)
    if (this.syncInProgress) {
      // Debug: Sync already in progress
      // console.log("[UserSync] Sync already in progress, skipping");
      return { success: true, skipped: true };
    }

    if (!force && this.lastSyncedUserId === user.id) {
      console.log("✅ UserSync: Already synced");
      return { success: true, skipped: true };
    }

    try {
      this.syncInProgress = true;
      console.log(`🔄 UserSync: Starting for ${user.id.slice(-8)}...`);

      // Extract user information
      const userInfo = this.extractUserInfo(user);

      // Set the user ID in sync service
      this.syncService.setUserId(user.id);

      // Perform the sync
      const result = await this.syncService.syncCurrentUser(userInfo);

      if (result.success) {
        this.lastSyncedUserId = user.id;
        console.log(`✅ UserSync: Complete`);
      } else {
        console.error(`[UserSync] Failed to sync user: ${user.id}`, result.error);
      }

      return result;
    } catch (error) {
      console.error(`[UserSync] Error syncing user: ${user.id}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown sync error"
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Handle authentication state changes
   *
   * This should be called whenever the Clerk user state changes
   * to automatically sync users to Convex.
   */
  async handleAuthChange(user: UserResource | null): Promise<void> {
    if (!user) {
      // User signed out, clear the last synced user
      this.lastSyncedUserId = null;
      if (this.syncService) {
        this.syncService.setUserId(null);
      }
      console.log("📤 UserSync: Cleared (sign out)");
      return;
    }

    // User signed in or user data changed, sync to Convex
    const result = await this.syncUser(user);

    if (!result.success && !result.skipped) {
      console.warn("[UserSync] Failed to sync user on auth change:", result.error);

      // Update auth state with error for UI feedback
      authState.setError(`Failed to sync user data: ${result.error}`);
    } else if (result.success && !result.skipped) {
      // Clear any previous errors
      authState.setError(null);
    }
  }

  /**
   * Force sync current user
   *
   * This can be called manually to force a user sync, useful for
   * retry scenarios or when user data might have changed.
   */
  async forceSyncCurrentUser(
    user: UserResource
  ): Promise<{ success: boolean; error?: string; userId?: string }> {
    return this.syncUser(user, true);
  }

  /**
   * Check if sync is currently in progress
   */
  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  /**
   * Get the last synced user ID
   */
  getLastSyncedUserId(): string | null {
    return this.lastSyncedUserId;
  }

  /**
   * Reset sync state (useful for testing or manual reset)
   */
  reset(): void {
    this.lastSyncedUserId = null;
    this.syncInProgress = false;
    // Debug: Sync state reset
    // console.log("[UserSync] Sync state reset");
  }
}

// Export singleton instance
export const userSyncService = new UserSyncService();

/**
 * Enhanced Clerk authentication hook that includes automatic user sync
 *
 * This function should be called in components that handle authentication
 * to ensure users are automatically synced to Convex when they sign in.
 */
export function setupUserSync(syncService: SyncService) {
  // Initialize the user sync service
  userSyncService.initialize(syncService);

  // Debug: User sync setup completed
  // console.log("[UserSync] User sync setup completed");
}

/**
 * Create a Svelte store subscriber for automatic user sync
 *
 * This can be used in Svelte components to automatically sync users
 * when the Clerk user state changes.
 */
export function createUserSyncSubscriber(clerkUserStore: any) {
  return clerkUserStore.subscribe(async (user: UserResource | null) => {
    await userSyncService.handleAuthChange(user);
  });
}
