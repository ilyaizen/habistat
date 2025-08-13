/**
 * @file Sync Service Store
 * @description Central Svelte store for synchronization state and controls.
 * Provides a single source of truth for sync status, progress, and errors, and
 * exposes helper APIs to trigger full or scoped sync tasks. Designed for
 * offline-first operation with graceful network transitions.
 */

import { derived, writable } from "svelte/store";
import { browser } from "$app/environment";
// Best-effort ensure firstAppOpenAt is set shortly after auth is ready, in case
// other pathways miss it; avoids seeing it unset in dev/prod fresh resets.
import { ensureFirstAppOpenTimestamp } from "$lib/utils/convex-operations";
import { DEBUG_VERBOSE } from "$lib/utils/debug";
import { syncService } from "../services/sync-service";
import type { SyncResult } from "../utils/convex-operations";
import { authState } from "./auth-state";
import { completionsStore } from "./completions";
import { networkStore } from "./network";

// Consolidated sync status types
export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

// Comprehensive sync state interface
export interface SyncState {
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

function createsyncStore() {
  const initialState: SyncState = {
    status: "idle",
    lastSyncTime: null,
    error: null,
    isOnline: browser ? navigator.onLine : true
  };

  const { subscribe, update, set } = writable<SyncState>(initialState);

  let currentUserId: string | null = null;
  let syncStartTime: number | null = null;

  // Holds a temporary unsubscribe function used for one-off subscriptions.
  // Always guard accesses; never call before initialization.
  let lastTempUnsubscribe: (() => void) | null = null;

  // Concurrency guards to avoid overlapping sync runs and double subscriptions.
  let isSyncActive = false;
  let isFullSyncInProgress = false;

  // Monitor online status and reflect in store
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

  // Initialize the sync backend service once in the browser
  if (browser) {
    syncService.initialize();
    // Fire-and-forget ensure first open timestamp when auth becomes ready
    authState.subscribe((s) => {
      if (s.clerkReady && s.clerkUserId) {
        ensureFirstAppOpenTimestamp().catch(() => {});
      }
    });
  }

  const store = {
    subscribe,

    // Associate the current user with the sync backend
    setUserId: (userId: string | null) => {
      currentUserId = userId;
      syncService.setUserId(userId);

      // Keep central auth state in sync
      authState.setClerkState(userId, true);

      // No info logs here; backend service will orchestrate sync on real sign-ins
    },

    // Mark the beginning of a sync process and initialize progress
    startSync: (items: string[] = []) => {
      // Idempotency: if a sync has already been started, do nothing.
      if (isSyncActive) return;

      isSyncActive = true;
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

    // Update progress metrics during an active sync
    updateProgress: (completedItems: number, currentItem?: string) => {
      update((state) => ({
        ...state,
        completedItems,
        syncingItems: currentItem ? [currentItem] : state.syncingItems
      }));
    },

    // Trigger a full synchronization sequence
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

      // Avoid concurrent syncs (fast-path) by reading current state once.
      // Use a safe subscribe pattern that doesn't reference the unsubscribe
      // variable before it is initialized (avoids TDZ ReferenceError).
      if (lastTempUnsubscribe) {
        lastTempUnsubscribe();
        lastTempUnsubscribe = null;
      }

      const currentState = await new Promise<SyncState>((resolve) => {
        // Declare first, assign after subscribe returns; unsubscribe immediately
        // afterwards to ensure we only read once.
        let localUnsubscribe: (() => void) | null = null;
        const stop = subscribe((state) => {
          resolve(state);
          if (localUnsubscribe) {
            localUnsubscribe();
            localUnsubscribe = null;
          }
        });
        localUnsubscribe = stop;
        lastTempUnsubscribe = stop;
        if (localUnsubscribe) {
          localUnsubscribe();
          localUnsubscribe = null;
        }
        // Clear shared reference now that we're done.
        lastTempUnsubscribe = null;
      });

      if (currentState.status === "syncing") {
        if (DEBUG_VERBOSE) {
          console.log("SyncStore: Sync already in progress, skipping");
        }
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

      // Ensure Clerk authentication is ready before syncing
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

      // Prevent overlapping runs across rapid calls
      if (isFullSyncInProgress || isSyncActive) {
        console.log("SyncStore: Another sync is already running, skipping");
        return;
      }

      isFullSyncInProgress = true;

      // Start sync with progress tracking
      const syncItems = ["user", "calendars", "habits", "completions", "activityHistory"];
      store.startSync(syncItems);

      try {
        const result = await syncService.fullSync();

        if (result.success) {
          // Ensure UI data is fresh after a successful sync
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
        console.error("SyncStore: Sync failed:", error);
        update((state) => ({
          ...state,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown sync error",
          lastErrorAt: Date.now(),
          syncingItems: undefined,
          totalItems: undefined,
          completedItems: undefined
        }));
      } finally {
        // Always release concurrency guards
        isFullSyncInProgress = false;
        isSyncActive = false;
      }

      // Reset status to idle shortly after a successful sync for a calm UI
      setTimeout(() => {
        update((state) => ({
          ...state,
          status: state.status === "synced" ? "idle" : state.status
        }));
      }, 3000);
    },

    // Trigger specific data type synchronization
    triggerDataTypeSync: async (dataType: "completions" | "activityHistory") => {
      if (!currentUserId) {
        update((state) => ({
          ...state,
          error: "Not authenticated"
        }));
        return;
      }

      // Prevent overlapping runs across rapid calls
      if (isSyncActive) {
        console.log("SyncStore: Sync already active, skipping data type sync");
        return;
      }

      store.startSync([dataType]);

      try {
        let result: SyncResult = { success: false, error: "Unknown data type" };
        if (dataType === "completions") {
          result = await syncService.syncCompletions();
        } else if (dataType === "activityHistory") {
          result = await syncService.syncActivityHistory();
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
      } finally {
        isSyncActive = false;
      }
    },

    // Migrate anonymous data to the authenticated user account
    migrateAnonymousData: async () => {
      if (!currentUserId) {
        return { success: false, migratedCount: 0, error: "Not authenticated" };
      }

      isSyncActive = true;

      update((state) => ({
        ...state,
        status: "syncing",
        error: null
      }));

      try {
        const result = await syncService.migrateAnonymousData();

        if (result.success) {
          await completionsStore.refresh();

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
      } finally {
        isSyncActive = false;
      }
    },

    // Clear the current error
    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },

    // Reset to initial state
    reset: () => {
      set(initialState);
      // Ensure internal guards and temp subscriptions are fully cleared
      isSyncActive = false;
      isFullSyncInProgress = false;
      if (lastTempUnsubscribe) {
        lastTempUnsubscribe();
        lastTempUnsubscribe = null;
      }
    },

    // Manually adjust status with optional error message
    setStatus: (status: SyncStatus, message?: string) => {
      update((current) => ({
        ...current,
        status,
        error: status === "error" ? (message ?? null) : null,
        lastErrorAt: status === "error" ? Date.now() : current.lastErrorAt
      }));
    },

    // Expose the backend sync service for advanced operations
    getSyncService: () => syncService
  };

  return store;
}

// Global consolidated sync store instance
export const syncStore = createsyncStore();

// Derived stores for common UI needs
export const isSyncing = derived(syncStore, ($sync) => $sync.status === "syncing");
export const syncError = derived(syncStore, ($sync) => $sync.error ?? null);
export const lastSyncTime = derived(syncStore, ($sync) => $sync.lastSyncTime);
export const syncIsOnline = derived(syncStore, ($sync) => $sync.isOnline);
export const syncStatus = derived(syncStore, ($sync) => $sync.status);

// Enhanced derived stores for UI
export const syncProgress = derived(syncStore, ($sync) => ({
  completedItems: $sync.completedItems || 0,
  totalItems: $sync.totalItems || 0,
  currentItems: $sync.syncingItems || [],
  percentage: $sync.totalItems
    ? Math.round((($sync.completedItems || 0) / $sync.totalItems) * 100)
    : 0
}));

export const overallSyncStatus = derived([networkStore, syncStore], ([$network, $sync]) => {
  if (!$network.isOnline) {
    return "offline" as const;
  }
  return $sync.status;
});

// Helper triggers
export const triggerSync = () => {
  syncStore.triggerFullSync();
};

export const triggerDataTypeSync = (dataType: "completions" | "activityHistory") => {
  syncStore.triggerDataTypeSync(dataType);
};

// Status helpers
export function getSyncStatusIcon(status: SyncStatus): string {
  switch (status) {
    case "idle":
      return "⚪";
    case "syncing":
      return "🔄";
    case "synced":
      return "✅";
    case "error":
      return "❌";
    case "offline":
      return "📴";
    default:
      return "⚪";
  }
}

export function getSyncStatusMessage(status: SyncStatus, info?: SyncState): string {
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
      syncStore.setStatus("offline");
    } else {
      // When coming back online, reset to idle if we were offline
      syncStore.reset();
    }
  });
}
