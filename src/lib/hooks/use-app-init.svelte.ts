/**
 * Application initialization hook for Habistat.
 * Handles core app setup including i18n, tracking, and scheduled tasks.
 */

import { SvelteDate } from "svelte/reactivity";
import { waitLocale } from "svelte-i18n";
import { browser } from "$app/environment";
import { logAppOpenIfNeeded } from "$lib/utils/tracking";

export function useAppInit() {
  let i18nReady = $state(false);
  let trackingInitialized = $state(true);
  let midnightTimer = $state(null);

  /**
   * Calculates milliseconds until next midnight.
   */
  function msUntilNextMidnight() {
    const now = new SvelteDate();
    const next = new SvelteDate(now);
    next.setHours(24, 0, 0, 0);
    return next.getTime() - now.getTime();
  }

  /**
   * Schedules the next midnight check for app open logging.
   */
  function scheduleMidnightCheck() {
    if (midnightTimer) clearTimeout(midnightTimer);
    // @ts-expect-error - Svelte 5
    midnightTimer = setTimeout(async () => {
      await logAppOpenIfNeeded();
      scheduleMidnightCheck(); // Schedule for the next day
    }, msUntilNextMidnight() + 1000); // +1s buffer
  }

  /**
   * Initializes core application functionalities.
   * Includes i18n setup, tracking initialization, and midnight scheduling.
   */
  async function initializeAppCore() {
    if (!browser) {
      // console.log("[DEBUG] initializeAppCore: Not in browser, skipping");
      return;
    }

    // console.log("[DEBUG] initializeAppCore: Starting initialization");

    try {
      // Tracking is initialized by the store itself now.
      // console.log("[DEBUG] initializeAppCore: Setting tracking as initialized");
      trackingInitialized = true;

      // Initialize i18n
      // console.log("[DEBUG] initializeAppCore: Initializing i18n");
      try {
        await waitLocale();
        i18nReady = true;
        // console.log("[DEBUG] initializeAppCore: i18n ready");
      } catch (error) {
        console.error("Error initializing i18n:", error);
        i18nReady = true;
      }

      // console.log("[DEBUG] initializeAppCore: Initialization completed successfully");
    } catch (error) {
      console.error("Error during core initialization:", error);
      // Still mark as initialized to prevent getting stuck
      trackingInitialized = true;
      i18nReady = true;
    }
  }

  /**
   * Sets up development mode utilities.
   */
  // function setupDevelopmentMode() {
  //   if (!browser || !import.meta.env.DEV) return;

  //   // Expose a debug function in development mode to test the midnight logic
  //   // @ts-ignore
  //   (window as any).triggerMidnight = async () => {
  //     console.log("[DEBUG] Manually triggering midnight app open log...");
  //     await logAppOpenIfNeeded();
  //     console.log("[DEBUG] Manual trigger complete. Check usage history.");
  //   };
  // }

  /**
   * Cleans up timers and development utilities.
   */
  // function cleanup() {
  //   if (midnightTimer) {
  //     clearTimeout(midnightTimer);
  //     midnightTimer = null;
  //   }

  //   // Clean up the debug function in development mode
  //   if (browser && import.meta.env.DEV) {
  //     delete (window as any).triggerMidnight;
  //   }
  // }

  return {
    get i18nReady() {
      return i18nReady;
    },
    get trackingInitialized() {
      return trackingInitialized;
    },
    setI18nReady: (value: boolean) => {
      i18nReady = value;
    },
    setTrackingInitialized: (value: boolean) => {
      trackingInitialized = value;
    },
    initializeAppCore,
    scheduleMidnightCheck
    // setupDevelopmentMode,
    // cleanup
  };
}
