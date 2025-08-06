/**
 * Network connectivity store for tracking online/offline status
 * Used for sync status indicators and offline-first functionality
 */

import { writable } from "svelte/store";
import { browser } from "$app/environment";

export interface NetworkStatus {
  isOnline: boolean;
  lastOnlineAt?: number;
  connectionType?: string;
}

function createNetworkStore() {
  // Initialize with online status if in browser
  const initialStatus: NetworkStatus = {
    isOnline: browser ? navigator.onLine : true,
    lastOnlineAt: browser && navigator.onLine ? Date.now() : undefined
  };

  const { subscribe, set, update } = writable<NetworkStatus>(initialStatus);

  // Set up event listeners in browser environment
  if (browser) {
    const handleOnline = () => {
      update(status => ({
        ...status,
        isOnline: true,
        lastOnlineAt: Date.now()
      }));
    };

    const handleOffline = () => {
      update(status => ({
        ...status,
        isOnline: false
      }));
    };

    // Listen for online/offline events
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Optional: Listen for connection changes (if supported)
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      const handleConnectionChange = () => {
        update(status => ({
          ...status,
          connectionType: connection.effectiveType || connection.type
        }));
      };
      
      connection.addEventListener("change", handleConnectionChange);
      
      // Set initial connection type
      if (connection.effectiveType || connection.type) {
        update(status => ({
          ...status,
          connectionType: connection.effectiveType || connection.type
        }));
      }
    }

    // Cleanup function (though it won't be called in this context)
    // This is here for reference if we need to implement cleanup later
    const cleanup = () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }

  return {
    subscribe,
    // Manual refresh method for testing or forced updates
    refresh: () => {
      if (browser) {
        const isOnline = navigator.onLine;
        update(status => ({
          ...status,
          isOnline,
          lastOnlineAt: isOnline ? Date.now() : status.lastOnlineAt
        }));
      }
    }
  };
}

export const networkStore = createNetworkStore();

// Export a derived store for simple online/offline checking
export const isOnline = {
  subscribe: (callback: (value: boolean) => void) => {
    return networkStore.subscribe(status => callback(status.isOnline));
  }
};
