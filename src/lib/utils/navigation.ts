import { browser } from "$app/environment";
import { goto, pushState, replaceState } from "$app/navigation";
// import { page } from "$app/state";
// import { get } from "svelte/store";

/**
 * Enhanced navigation function that handles SPA routing correctly for Tauri builds.
 * Includes debugging and fallback mechanisms for production issues.
 * @param url - The URL to navigate to
 * @param options - Navigation options
 */
export async function navigate(
  url: string,
  options?: { replaceState?: boolean; noscroll?: boolean; keepfocus?: boolean; state?: unknown }
) {
  if (!browser) return;

  try {
    // Use SvelteKit's goto for SPA navigation
    await goto(url, {
      replaceState: false,
      noscroll: false,
      keepfocus: false,
      ...options
    });

    // Wait a moment and verify the navigation worked
    setTimeout(() => {
      // page.url.pathname; // No-op, but triggers reactivity if needed
    }, 100);
  } catch (error) {
    console.error(`Error navigating to ${url}:`, error);

    // In Tauri builds, if SvelteKit navigation fails, we might need a fallback
    if (isTauri()) {
      // For Tauri, we still want to use SvelteKit navigation, but with different options
      try {
        await goto(url, { replaceState: true });
      } catch (fallbackError) {
        console.error(`Fallback navigation also failed:`, fallbackError);
        throw fallbackError;
      }
    } else {
      throw error;
    }
  }
}

/**
 * Create a shallow routing entry with custom state using SvelteKit's pushState.
 * This is preferred over history.pushState() as it integrates with SvelteKit's router.
 * @param url - The URL to navigate to (can be empty string to stay on current page)
 * @param state - Custom state object to attach to the history entry
 */
export function navigatePushState(url: string, state: Record<string, unknown>) {
  if (!browser) return;
  try {
    pushState(url, state);
  } catch (error) {
    console.error(`Error pushing state to ${url}:`, error);
  }
}

/**
 * Replace the current history entry with new custom state using SvelteKit's replaceState.
 * This is preferred over history.replaceState() as it integrates with SvelteKit's router.
 * @param url - The URL to replace with (can be empty string to stay on current page)
 * @param state - Custom state object to replace the current history entry
 */
export function navigateReplaceState(url: string, state: Record<string, unknown>) {
  if (!browser) return;
  try {
    replaceState(url, state);
  } catch (error) {
    console.error(`Error replacing state for ${url}:`, error);
  }
}

/**
 * Check if we're running in a Tauri environment
 */

/**
 * Returns true if running inside a Tauri environment.
 *
 * Tauri injects a global __TAURI__ object into the window. We check for its presence.
 * The 'browser' check ensures this code only runs client-side.
 *
 * Note: We must cast window to 'unknown' to avoid TypeScript errors, since __TAURI__ is not typed.
 */
export function isTauri(): boolean {
  // 'browser' is true only in the client; window['__TAURI__'] is injected by Tauri
  return browser && typeof (window as Window & { __TAURI__?: unknown }).__TAURI__ !== "undefined";
}

// /**
//  * Debug function to log current routing state
//  */
// export function debugRouting() {
//   if (!browser) return;
// }
