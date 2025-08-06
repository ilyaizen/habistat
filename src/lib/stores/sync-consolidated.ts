/**
 * @file Consolidated Sync Store - Unified sync state management
 * @description Single Svelte store for all sync-related state, replacing multiple legacy stores
 *
 * REPLACES THE FOLLOWING DEPRECATED FILES:
 * - src/lib/stores/sync.ts (SyncStore - main sync operations and state)
 * - src/lib/stores/sync-status.ts (SyncStatusStore - UI feedback and status tracking)
 *
 * CONSOLIDATION BENEFITS:
 * - Eliminates duplicate state management across multiple stores
 * - Provides unified API for components to access sync state
 * - Reduces complexity in component sync integration
 * - Centralizes all sync-related reactive state in one place
 *
 * KEY FEATURES:
 * - Single source of truth for all sync state (status, progress, errors, timing)
 * - Unified status management for UI components with consistent interfaces
 * - Seamless integration with UnifiedSyncService for actual sync operations
 * - Network status awareness with automatic offline/online state handling
 * - Progress tracking for sync operations with detailed completion metrics
 * - Backward compatibility through derived stores for existing component APIs
 *
 * USAGE:
 * Import the main store: `import { consolidatedSyncStore } from './sync-consolidated';`
 * Or use derived stores for specific needs: `import { isSyncing, syncError } from './sync-consolidated';`
 * The store automatically initializes the UnifiedSyncService when imported
 */

import { derived, writable } from "svelte/store";
import { browser } from "$app/environment";
import { unifiedSyncService } from "../services/sync-unified";
import type { SyncResult } from "../utils/convex-operations";
import { authState } from "./auth-state";
import { completionsStore } from "./completions";
import { networkStore } from "./network";

// Consolidated sync status types
export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

// Comprehensive sync state interface
export interface ConsolidatedSyncState {
  // Core sync status
  status: SyncStatus;
  lastSyncTime: number | null;
  error: string | null;
  isOnline: boolean;

  // Progress tracking
  syncingItems?: string[];
  totalItems?: number;
  completedItems?: number;

  // Detailed sync results
  lastSyncResults?: {
    calendars?: { success: boolean; error?: string };
    habits?: { success: boolean; error?: string };
    completions?: { success: boolean; error?: string };
    activityHistory?: { success: boolean; error?: string };
    userSync?: { success: boolean; error?: string };
  };

  // Timing information
  lastErrorAt?: number;
  syncDuration?: number;
}

/**
 * Create the consolidated sync store
 * Replaces both createSyncStore() and createSyncStatusStore()
 */
function createConsolidatedSyncStore() {
  const initialState: ConsolidatedSyncState = {
    status: "idle",
    lastSyncTime: null,
    error: null,
    isOnline: browser ? navigator.onLine : true
  };

  const { subscribe, update, set } = writable<ConsolidatedSyncState>(initialState);

  let currentUserId: string | null = null;
  let syncStartTime: number | null = null;

  // Monitor online status
  if (browser) {
    const updateOnlineStatus = () => {
      update((state) => ({
        ...state,
        isOnline: navigator.onLine,
        status: navigator.onLine ? (state.status === "offline" ? "idle" : state.status) : "offline"
      }));
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
  }

  // Initialize the unified sync service
  if (browser) {
    unifiedSyncService.initialize();
  }

  const store = {
    subscribe,

    /**
     * Set the current user ID and prepare for sync
     * Replaces both setUserId methods from original stores
     */
    setUserId: (userId: string | null) => {
      currentUserId = userId;
      unifiedSyncService.setUserId(userId);

      // Update auth state
      authState.setClerkState(userId, true);

      if (userId) {
        // Wait for authentication to be fully ready before syncing
        const attemptSyncWhenReady = async () => {
          console.log("⏳ ConsolidatedSync: Waiting for auth...");

          const authReady = await authState.waitForAuthReady(15000); // 15 second timeout

          if (authReady) {
            console.log("✅ ConsolidatedSync: Auth ready, starting sync");
            await store.triggerFullSync();
          } else {
            console.warn("⚠️ ConsolidatedSync: Auth timeout, will retry later");
            update((state) => ({
              ...state,
              status: "error",
              error: "Authentication timeout - sync will retry when auth is ready",
              lastErrorAt: Date.now()
            }));
          }
        };

        attemptSyncWhenReady();
      }
    },

    /**
     * Start sync operation with progress tracking
     * Consolidates startSync from sync-status.ts
     */
    startSync: (items: string[] = []) => {
      syncStartTime = Date.now();
      update((state) => ({
        ...state,
        status: "syncing",
        syncingItems: items,
        totalItems: items.length,
        completedItems: 0,
        error: null,
        lastSyncResults: undefined
      }));
    },

    /**
     * Update sync progress
     * From sync-status.ts
     */
    updateProgress: (completedItems: number, currentItem?: string) => {
      update((state) => ({
        ...state,
        completedItems,
        syncingItems: currentItem ? [currentItem] : state.syncingItems
      }));
    },

    /**
     * Trigger a full sync operation
     * Consolidates triggerSync from sync.ts with enhanced progress tracking
     */
    triggerFullSync: async () => {
      if (!currentUserId) {
        update((state) => ({
          ...state,
          status: "error",
          error: "Not authenticated or sync service unavailable",
          lastErrorAt: Date.now()
        }));
        return;
      }

      // Check if already syncing
      const currentState = await new Promise<ConsolidatedSyncState>((resolve) => {
        const unsubscribe = subscribe((state) => {
          resolve(state);
          unsubscribe();
        });
      });

      if (currentState.status === "syncing") {
        console.log("ConsolidatedSync: Sync already in progress, skipping");
        return;
      }

      if (!currentState.isOnline) {
        update((state) => ({
          ...state,
          status: "error",
          error: "Cannot sync while offline",
          lastErrorAt: Date.now()
        }));
        return;
      }

      // Check if Clerk authentication is ready
      const authStateData = await new Promise<import("./auth-state").AuthState>((resolve) => {
        const unsubscribe = authState.subscribe((state) => {
          resolve(state);
          unsubscribe();
        });
      });

      if (!authStateData.clerkReady || !authStateData.clerkUserId) {
        update((state) => ({
          ...state,
          status: "error",
          error: "Clerk authentication not ready - please wait and try again",
          lastErrorAt: Date.now()
        }));
        return;
      }

      // Start sync with progress tracking
      const syncItems = ["user", "calendars", "habits", "completions", "activityHistory"];
      store.startSync(syncItems);

      try {
        // Perform the full sync
        const result = await unifiedSyncService.fullSync();

        if (result.success) {
          // Refresh completions store after successful sync
          await completionsStore.refresh();

          const syncDuration = syncStartTime ? Date.now() - syncStartTime : undefined;

          update((state) => ({
            ...state,
            status: "synced",
            lastSyncTime: Date.now(),
            error: null,
            syncingItems: undefined,
            totalItems: undefined,
            completedItems: undefined,
            lastSyncResults: (result as any).syncResults,
            syncDuration
          }));
        } else {
          update((state) => ({
            ...state,
            status: "error",
            error: result.error || "Sync failed",
            lastErrorAt: Date.now(),
            syncingItems: undefined,
            totalItems: undefined,
            completedItems: undefined
          }));
        }
      } catch (error) {
        console.error("ConsolidatedSync: Sync failed:", error);
        update((state) => ({
          ...state,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown sync error",
          lastErrorAt: Date.now(),
          syncingItems: undefined,
          totalItems: undefined,
          completedItems: undefined
        }));
      }

      // Reset status to idle after a delay
      setTimeout(() => {
        update((state) => ({
          ...state,
          status: state.status === "synced" ? "idle" : state.status
        }));
      }, 3000);
    },

    /**
     * Trigger specific data type sync
     * New functionality for granular sync control
     */
    triggerDataTypeSync: async (dataType: "completions" | "activityHistory") => {
      if (!currentUserId) {
        update((state) => ({
          ...state,
          error: "Not authenticated"
        }));
        return;
      }

      store.startSync([dataType]);

      try {
        let result: SyncResult = { success: false, error: "Unknown data type" };
        if (dataType === "completions") {
          result = await unifiedSyncService.syncCompletions();
        } else if (dataType === "activityHistory") {
          result = await unifiedSyncService.syncActivityHistory();
        }

        if (result?.success) {
          if (dataType === "completions") {
            await completionsStore.refresh();
          }

          update((state) => ({
            ...state,
            status: "synced",
            lastSyncTime: Date.now(),
            error: null,
            syncingItems: undefined,
            totalItems: undefined,
            completedItems: undefined
          }));
        } else {
          update((state) => ({
            ...state,
            status: "error",
            error: result?.error || `${dataType} sync failed`,
            lastErrorAt: Date.now()
          }));
        }
      } catch (error) {
        update((state) => ({
          ...state,
          status: "error",
          error: error instanceof Error ? error.message : `${dataType} sync error`,
          lastErrorAt: Date.now()
        }));
      }
    },

    /**
     * Migrate anonymous data to authenticated user
     * From sync.ts
     */
    migrateAnonymousData: async () => {
      if (!currentUserId) {
        return { success: false, migratedCount: 0, error: "Not authenticated" };
      }

      update((state) => ({
        ...state,
        status: "syncing",
        error: null
      }));

      try {
        const result = await unifiedSyncService.migrateAnonymousData();

        if (result.success) {
          // Update completions store to associate with user
          await completionsStore.setUserId(currentUserId);

          update((state) => ({
            ...state,
            status: "synced",
            lastSyncTime: Date.now()
          }));
        } else {
          update((state) => ({
            ...state,
            status: "error",
            error: result.error || "Migration failed",
            lastErrorAt: Date.now()
          }));
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Migration failed";
        update((state) => ({
          ...state,
          status: "error",
          error: errorMessage,
          lastErrorAt: Date.now()
        }));
        return { success: false, migratedCount: 0, error: errorMessage };
      }
    },

    /**
     * Clear sync error
     * From both original stores
     */
    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },

    /**
     * Reset to idle state
     * From sync-status.ts
     */
    reset: () => {
      set(initialState);
    },

    /**
     * Manual status update
     * From sync-status.ts
     */
    setStatus: (status: SyncStatus, message?: string) => {
      update((current) => ({
        ...current,
        status,
        error: status === "error" ? (message ?? null) : null,
        lastErrorAt: status === "error" ? Date.now() : current.lastErrorAt
      }));
    },

    /**
     * Get sync service instance (for advanced operations)
     * From sync.ts
     */
    getSyncService: () => unifiedSyncService
  };

  return store;
}

// Global consolidated sync store instance
export const consolidatedSyncStore = createConsolidatedSyncStore();

// Derived stores for common UI needs (maintaining backward compatibility)
export const isSyncing = derived(consolidatedSyncStore, ($sync) => $sync.status === "syncing");
export const syncError = derived(consolidatedSyncStore, ($sync) => $sync.error ?? null);
export const lastSyncTime = derived(consolidatedSyncStore, ($sync) => $sync.lastSyncTime);
export const syncIsOnline = derived(consolidatedSyncStore, ($sync) => $sync.isOnline);
export const syncStatus = derived(consolidatedSyncStore, ($sync) => $sync.status);

// Enhanced derived stores for better UI integration
export const syncProgress = derived(consolidatedSyncStore, ($sync) => ({
  completedItems: $sync.completedItems || 0,
  totalItems: $sync.totalItems || 0,
  currentItems: $sync.syncingItems || [],
  percentage: $sync.totalItems
    ? Math.round((($sync.completedItems || 0) / $sync.totalItems) * 100)
    : 0
}));

export const overallSyncStatus = derived(
  [networkStore, consolidatedSyncStore],
  ([$network, $sync]) => {
    if (!$network.isOnline) {
      return "offline" as const;
    }
    return $sync.status;
  }
);

// Helper function to trigger sync (can be called from components)
export const triggerSync = () => {
  consolidatedSyncStore.triggerFullSync();
};

// Helper function to trigger specific data type sync
export const triggerDataTypeSync = (dataType: "completions" | "activityHistory") => {
  consolidatedSyncStore.triggerDataTypeSync(dataType);
};

// Helper functions for sync status (maintaining backward compatibility with sync-status.ts)
export function getSyncStatusIcon(status: SyncStatus): string {
  switch (status) {
    case "idle":
      return "⚪"; // Neutral
    case "syncing":
      return "🔄"; // Rotating
    case "synced":
      return "✅"; // Success
    case "error":
      return "❌"; // Error
    case "offline":
      return "📴"; // Offline
    default:
      return "⚪";
  }
}

export function getSyncStatusMessage(status: SyncStatus, info?: ConsolidatedSyncState): string {
  switch (status) {
    case "idle":
      return "Ready to sync";
    case "syncing":
      if (info?.syncingItems?.length) {
        return `Syncing ${info.syncingItems.join(", ")}...`;
      }
      return "Syncing...";
    case "synced":
      if (info?.lastSyncTime) {
        const ago = Math.floor((Date.now() - info.lastSyncTime) / 1000);
        if (ago < 60) return "Synced just now";
        if (ago < 3600) return `Synced ${Math.floor(ago / 60)}m ago`;
        return `Synced ${Math.floor(ago / 3600)}h ago`;
      }
      return "Synced";
    case "error":
      return info?.error || "Sync error";
    case "offline":
      return "Offline";
    default:
      return "Unknown status";
  }
}

// Auto-update sync status based on network connectivity
if (browser) {
  networkStore.subscribe((network) => {
    if (!network.isOnline) {
      consolidatedSyncStore.setStatus("offline");
    } else {
      // When coming back online, reset to idle if we were offline
      consolidatedSyncStore.reset();
    }
  });
}
