import { readable } from "svelte/store";
import { browser } from "$app/environment";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// Define the type for the status object based on Tauri's API
type NetworkStatus = {
  connected: boolean;
  connectionType: "wifi" | "ethernet" | "cellular" | "offline" | "unknown";
};

/**
 * A readable Svelte store that indicates the current network online status.
 *
 * It uses Tauri's network plugin commands (`network_status`, `network_status_change`) if running within
 * a Tauri context for more reliable detection. Otherwise, it falls back to
 * the browser's standard `navigator.onLine` property and online/offline events.
 *
 * Usage:
 * ```svelte
 * <script>
 *   import { isOnline } from '$lib/stores/network';
 * </script>
 *
 * {#if $isOnline}
 *   <p>You are online.</p>
 * {:else}
 *   <p>You are offline.</p>
 * {/if}
 * ```
 */
export const isOnline = readable<boolean>(true, (set) => {
  let cleanup = () => {};

  async function initialize() {
    if (!browser) {
      set(true); // Assume online in SSR or non-browser environments initially
      return;
    }

    try {
      // Check if running in Tauri by trying to invoke a core command (e.g., platform)
      // This is more reliable than checking for a specific global object
      await invoke("plugin:os|platform"); // Using os plugin as a test

      // ---- Tauri Environment ----
      console.log("Initializing network status check via Tauri invoke...");

      // Initial check using invoke
      const status = await invoke<NetworkStatus>("plugin:network|get_status");
      set(status.connected);
      console.log("Initial Tauri network status (invoke):", status);

      // Listen for changes using Tauri events
      // The network plugin emits 'network:status-changed' event
      const unlisten = await listen<NetworkStatus>("network:status-changed", (event) => {
        console.log("Tauri network status changed (event):", event.payload);
        set(event.payload.connected);
      });

      cleanup = () => {
        console.log("Cleaning up Tauri network listener (event).");
        unlisten(); // Ensure listener is removed
      };
    } catch (error) {
      // If invoke fails, assume we are not in Tauri or the plugin is not configured
      console.log(
        "Tauri invoke failed or not in Tauri context, falling back to Browser API:",
        error
      );

      // ---- Web Browser Environment ----
      set(navigator.onLine); // Initial state

      const onlineHandler = () => {
        console.log("Browser went online.");
        set(true);
      };
      const offlineHandler = () => {
        console.log("Browser went offline.");
        set(false);
      };

      window.addEventListener("online", onlineHandler);
      window.addEventListener("offline", offlineHandler);

      cleanup = () => {
        console.log("Cleaning up browser network listeners.");
        window.removeEventListener("online", onlineHandler);
        window.removeEventListener("offline", offlineHandler);
      };
    }
  }

  // Start the initialization process
  initialize();

  // Return the cleanup function to be called when the store subscriber count drops to 0
  return () => {
    cleanup();
  };
});
