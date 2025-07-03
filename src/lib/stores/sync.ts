import { writable, derived, get } from "svelte/store";
import { SyncService } from "../services/sync";
import { browser } from "$app/environment";
import { convex } from "../utils/convex";
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
  const { subscribe, set, update } = writable<SyncState>({
    status: "idle",
    lastSyncTime: null,
    error: null,
    isOnline: browser ? navigator.onLine : true
  });

  let syncService: SyncService | null = null;
  let currentUserId: string | null = null;

  // Initialize sync service when in browser
  if (browser && convex) {
    syncService = new SyncService(convex);
  }

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
      syncService?.setUserId(userId);

      if (userId) {
        // Automatically trigger sync when user is set
        setTimeout(() => {
          // Delay slightly to let auth state settle
          store.triggerSync();
        }, 1000);
      }
    },

    /**
     * Trigger a full sync operation
     */
    triggerSync: async () => {
      if (!syncService || !currentUserId) {
        update((state) => ({
          ...state,
          error: "Not authenticated or sync service unavailable"
        }));
        return;
      }

      const currentState = get({ subscribe });
      if (!currentState.isOnline) {
        update((state) => ({
          ...state,
          error: "Cannot sync while offline"
        }));
        return;
      }

      update((state) => ({
        ...state,
        status: "syncing",
        error: null
      }));

      try {
        const result = await syncService.fullSync();

        if (result.success) {
          // Refresh completions store after successful sync
          await completionsStore.refresh();

          update((state) => ({
            ...state,
            status: "success",
            lastSyncTime: Date.now(),
            error: null
          }));
        } else {
          update((state) => ({
            ...state,
            status: "error",
            error: result.error || "Sync failed"
          }));
        }
      } catch (error) {
        console.error("Sync failed:", error);
        update((state) => ({
          ...state,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown sync error"
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
      if (!syncService || !currentUserId) {
        return { success: false, migratedCount: 0, error: "Not authenticated" };
      }

      update((state) => ({
        ...state,
        status: "syncing",
        error: null
      }));

      try {
        const result = await syncService.migrateAnonymousData();

        if (result.success) {
          // Update completions store to associate with user
          await completionsStore.setUserId(currentUserId);

          update((state) => ({
            ...state,
            status: "success",
            lastSyncTime: Date.now()
          }));
        } else {
          update((state) => ({
            ...state,
            status: "error",
            error: result.error || "Migration failed"
          }));
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Migration failed";
        update((state) => ({
          ...state,
          status: "error",
          error: errorMessage
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
    getSyncService: () => syncService
  };

  return store;
}

// Global sync store instance
export const syncStore = createSyncStore();

// Derived stores for common UI needs
export const isSyncing = derived(syncStore, ($sync) => $sync.status === "syncing");
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
