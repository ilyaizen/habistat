import { get } from "svelte/store";
import { resetMode, setMode } from "mode-watcher";
import { theme } from "$lib/stores/settings";
import { browser } from "$app/environment";

/**
 * Theme management hook for Habistat application.
 * Handles system theme detection, user preference application, and cleanup.
 */
export function useTheme() {
  let media: MediaQueryList | null = $state(null);
  let systemListener: (() => void) | null = $state(null);
  let lastAppliedTheme: "system" | "light" | "dark" | null = $state(null);

  /**
   * Applies the system theme (dark/light) based on the user's OS preference.
   */
  function applySystemTheme() {
    if (!browser) return;

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  /**
   * Sets up a listener to automatically update the theme when the system preference changes.
   */
  function setupSystemListener() {
    if (!browser) return;

    cleanupSystemListener(); // Ensure no duplicate listeners
    media = window.matchMedia("(prefers-color-scheme: dark)");
    systemListener = () => applySystemTheme();
    media.addEventListener("change", systemListener);
  }

  /**
   * Removes the event listener for system theme changes to prevent memory leaks.
   */
  function cleanupSystemListener() {
    if (media && systemListener) {
      media.removeEventListener("change", systemListener);
    }
    media = null;
    systemListener = null;
  }

  /**
   * Sets the application theme based on user selection (system, light, or dark).
   * Updates CSS classes and manages system theme listeners accordingly.
   */
  function selectTheme(mode: "system" | "light" | "dark") {
    if (!browser) return;

    if (mode === "system") {
      resetMode();
      applySystemTheme();
      setupSystemListener();
    } else {
      cleanupSystemListener();
      if (mode === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      setMode(mode);
    }
  }

  /**
   * Initializes theme management and sets up reactive updates.
   */
  function initializeTheme() {
    if (!browser) return;

    const currentTheme = get(theme);
    selectTheme(currentTheme);
    lastAppliedTheme = currentTheme;
  }

  /**
   * Effect to watch for theme changes and apply them.
   */
  $effect(() => {
    if (!browser) return;

    const currentTheme = get(theme);
    if (currentTheme !== lastAppliedTheme) {
      selectTheme(currentTheme);
      lastAppliedTheme = currentTheme;
    }
  });

  return {
    initializeTheme,
    selectTheme,
    cleanupSystemListener
  };
}
