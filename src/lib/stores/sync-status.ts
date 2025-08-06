/**
 * Sync status store for tracking sync operations and providing UI feedback
 * Integrates with SyncService to show sync progress and status
 */

import { derived, writable } from "svelte/store";
import { networkStore } from "./network";

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

export interface SyncStatusInfo {
  status: SyncStatus;
  lastSyncAt?: number;
  lastErrorAt?: number;
  errorMessage?: string;
  syncingItems?: string[]; // What's currently being synced
  totalItems?: number;
  completedItems?: number;
}

function createSyncStatusStore() {
  const initialStatus: SyncStatusInfo = {
    status: "idle"
  };

  const { subscribe, set, update } = writable<SyncStatusInfo>(initialStatus);

  return {
    subscribe,

    // Start sync operation
    startSync: (items: string[] = []) => {
      update((status) => ({
        ...status,
        status: "syncing",
        syncingItems: items,
        totalItems: items.length,
        completedItems: 0,
        errorMessage: undefined
      }));
    },

    // Update sync progress
    updateProgress: (completedItems: number, currentItem?: string) => {
      update((status) => ({
        ...status,
        completedItems,
        syncingItems: currentItem ? [currentItem] : status.syncingItems
      }));
    },

    // Complete sync successfully
    completeSync: () => {
      update((status) => ({
        ...status,
        status: "synced",
        lastSyncAt: Date.now(),
        syncingItems: undefined,
        totalItems: undefined,
        completedItems: undefined,
        errorMessage: undefined
      }));
    },

    // Handle sync error
    errorSync: (errorMessage: string) => {
      update((status) => ({
        ...status,
        status: "error",
        lastErrorAt: Date.now(),
        errorMessage,
        syncingItems: undefined,
        totalItems: undefined,
        completedItems: undefined
      }));
    },

    // Set offline status
    setOffline: () => {
      update((status) => ({
        ...status,
        status: "offline",
        syncingItems: undefined,
        totalItems: undefined,
        completedItems: undefined
      }));
    },

    // Reset to idle
    reset: () => {
      set(initialStatus);
    },

    // Manual status update
    setStatus: (status: SyncStatus, message?: string) => {
      update((current) => ({
        ...current,
        status,
        errorMessage: status === "error" ? message : undefined,
        lastErrorAt: status === "error" ? Date.now() : current.lastErrorAt
      }));
    }
  };
}

export const syncStatusStore = createSyncStatusStore();

// Derived store for simple status checking
export const syncStatus = derived(syncStatusStore, ($syncStatus) => $syncStatus.status);

// Derived store that combines network and sync status
export const overallSyncStatus = derived(
  [networkStore, syncStatusStore],
  ([$network, $syncStatus]) => {
    if (!$network.isOnline) {
      return "offline" as const;
    }
    return $syncStatus.status;
  }
);

// Auto-update sync status based on network connectivity
networkStore.subscribe((network) => {
  if (!network.isOnline) {
    syncStatusStore.setOffline();
  } else if (network.isOnline) {
    // When coming back online, reset to idle if we were offline
    syncStatusStore.reset();
  }
});

// Helper function to get sync status icon
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

// Helper function to get sync status message
export function getSyncStatusMessage(status: SyncStatus, info?: SyncStatusInfo): string {
  switch (status) {
    case "idle":
      return "Ready to sync";
    case "syncing":
      if (info?.syncingItems?.length) {
        return `Syncing ${info.syncingItems.join(", ")}...`;
      }
      return "Syncing...";
    case "synced":
      if (info?.lastSyncAt) {
        const ago = Math.floor((Date.now() - info.lastSyncAt) / 1000);
        if (ago < 60) return "Synced just now";
        if (ago < 3600) return `Synced ${Math.floor(ago / 60)}m ago`;
        return `Synced ${Math.floor(ago / 3600)}h ago`;
      }
      return "Synced";
    case "error":
      return info?.errorMessage || "Sync error";
    case "offline":
      return "Offline";
    default:
      return "Unknown status";
  }
}
