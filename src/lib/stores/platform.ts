import * as os from "@tauri-apps/plugin-os"; // Import the OS plugin
import { readable } from "svelte/store";
import { browser } from "$app/environment";

/**
 * A readable Svelte store that indicates the current platform (OS name or 'Web').
 *
 * It uses Tauri's OS plugin (`os.platform`) if running within a Tauri context.
 * Otherwise, it defaults to 'Web'.
 *
 * Usage:
 * ```svelte
 * <script>
 *   import { platform } from '$lib/stores/platform';
 * </script>
 *
 * <p>Platform: {$platform}</p>
 * ```
 */
export const platform = readable<string>("Web", (set) => {
  async function determinePlatform() {
    if (!browser) {
      set("SSR"); // Or handle SSR case as needed
      return;
    }

    try {
      // Use os.platform() which returns 'linux', 'macos', 'ios', 'android', 'windows'
      const osPlatform = await os.platform();
      console.log("Platform detected (Tauri OS plugin):", osPlatform);

      // Capitalize first letter for display
      const formattedPlatform = osPlatform.charAt(0).toUpperCase() + osPlatform.slice(1);
      set(formattedPlatform);
    } catch (error: unknown) {
      console.error("Failed to determine platform:", error);
      // If the os.platform() call fails, we are likely not in a Tauri environment
      console.log(
        "Tauri OS plugin call failed (likely not in Tauri), assuming Web platform:",
        error
      );
      set("Web");
    }
  }

  determinePlatform();

  // No cleanup needed as it's a one-time check
  return () => {};
});
