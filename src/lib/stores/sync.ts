import { derived, get, writable } from "svelte/store";
import { browser } from "$app/environment";
import { SyncService } from "../services/sync";
import { convex } from "../utils/convex";
import { authState } from "./auth-state";
import { completionsStore } from "./completions";

// Sync status types
export type SyncStatus = "idle" | "syncing" | "success" | "error";

interface SyncState {
  status: SyncStatus;
  lastSyncTime: number | null;
  error: string | null;
  isOnline: boolean;
}

function createSyncStore() {
  // TODO: 2025-07-21 - Add set to the store when we have a way to test it
  // const { subscribe, set, update } = writable<SyncState>({
  const { subscribe, update } = writable<SyncState>({
    status: "idle",
    lastSyncTime: null,
    error: null,
    isOnline: browser ? navigator.onLine : true,
  });

  let syncService: SyncService | null = null;
  let currentUserId: string | null = null;

  // Function to get or create sync service
  const getSyncService = () => {
    if (!syncService && browser) {
      const convexClient = convex;
      if (convexClient) {
        syncService = new SyncService(convexClient);
        if (currentUserId) {
          syncService.setUserId(currentUserId);
        }
      }
    }
    return syncService;
  };

  // Monitor online status
  if (browser) {
    const updateOnlineStatus = () => {
      update((state) => ({ ...state, isOnline: navigator.onLine }));
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
  }

  const store = {
    subscribe,

    /**
     * Set the current user ID and prepare for sync
     */
    setUserId: (userId: string | null) => {
      currentUserId = userId;
      const service = getSyncService();
      service?.setUserId(userId);

      // Update auth state
      authState.setClerkState(userId, true);

      if (userId) {
        // Wait for authentication to be fully ready before syncing
        const attemptSyncWhenReady = async () => {
          console.log("[Sync] Waiting for authentication to be ready...");

          const authReady = await authState.waitForAuthReady(15000); // 15 second timeout

          if (authReady) {
            console.log("[Sync] Authentication ready, triggering sync");
            const state = get({ subscribe });
            if (state.status !== "syncing") {
              await store.triggerSync();
            }
          } else {
            console.warn(
              "[Sync] Authentication not ready after timeout, skipping initial sync"
            );
            update((state) => ({
              ...state,
              error:
                "Authentication timeout - sync will retry when auth is ready",
            }));
          }
        };

        attemptSyncWhenReady();
      }
    },

    /**
     * Trigger a full sync operation
     */
    triggerSync: async () => {
      const service = getSyncService();
      if (!service || !currentUserId) {
        update((state) => ({
          ...state,
          error: "Not authenticated or sync service unavailable",
        }));
        return;
      }

      // Check if authentication is ready
      const authStateData = get(authState);
      if (!authStateData.clerkReady || !authStateData.clerkUserId) {
        console.log("[Sync] Authentication not ready, checking auth status...");
        authState.setConvexAuthStatus("pending");

        const authStateData2 = get(authState);
        if (!authStateData2.clerkReady || !authStateData2.clerkUserId) {
          update((state) => ({
            ...state,
            error: "Authentication not ready - please wait and try again",
          }));
          return;
        }
      }

      const currentState = get({ subscribe });
      if (!currentState.isOnline) {
        update((state) => ({
          ...state,
          error: "Cannot sync while offline",
        }));
        return;
      }

      update((state) => ({
        ...state,
        status: "syncing",
        error: null,
      }));

      try {
        const result = await service.fullSync();

        if (result.success) {
          // Refresh completions store after successful sync
          await completionsStore.refresh();

          update((state) => ({
            ...state,
            status: "success",
            lastSyncTime: Date.now(),
            error: null,
          }));
        } else {
          update((state) => ({
            ...state,
            status: "error",
            error: result.error || "Sync failed",
          }));
        }
      } catch (error) {
        console.error("Sync failed:", error);
        update((state) => ({
          ...state,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown sync error",
        }));
      }

      // Reset status to idle after a delay
      setTimeout(() => {
        update((state) => ({ ...state, status: "idle" }));
      }, 3000);
    },

    /**
     * Migrate anonymous data to authenticated user
     */
    migrateAnonymousData: async () => {
      const service = getSyncService();
      if (!service || !currentUserId) {
        return { success: false, migratedCount: 0, error: "Not authenticated" };
      }

      update((state) => ({
        ...state,
        status: "syncing",
        error: null,
      }));

      try {
        const result = await service.migrateAnonymousData();

        if (result.success) {
          // Update completions store to associate with user
          await completionsStore.setUserId(currentUserId);

          update((state) => ({
            ...state,
            status: "success",
            lastSyncTime: Date.now(),
          }));
        } else {
          update((state) => ({
            ...state,
            status: "error",
            error: result.error || "Migration failed",
          }));
        }

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Migration failed";
        update((state) => ({
          ...state,
          status: "error",
          error: errorMessage,
        }));
        return { success: false, migratedCount: 0, error: errorMessage };
      }
    },

    /**
     * Clear sync error
     */
    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },

    /**
     * Get sync service instance (for advanced operations)
     */
    getSyncService: () => getSyncService(),
  };

  return store;
}

// Global sync store instance
export const syncStore = createSyncStore();

// Derived stores for common UI needs
export const isSyncing = derived(
  syncStore,
  ($sync) => $sync.status === "syncing"
);
export const syncError = derived(syncStore, ($sync) => $sync.error);
export const lastSyncTime = derived(syncStore, ($sync) => $sync.lastSyncTime);
export const syncIsOnline = derived(syncStore, ($sync) => $sync.isOnline);

// Helper function to trigger sync (can be called from components)
export const triggerSync = () => {
  const store = get(syncStore);
  if (store.status !== "syncing") {
    syncStore.triggerSync();
  }
};
