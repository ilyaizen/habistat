import { resetMode, setMode } from "mode-watcher";
import { get } from "svelte/store";
import { browser } from "$app/environment";
import { theme } from "$lib/stores/settings";

/**
 * Theme management hook for Habistat application.
 * Handles system theme detection, user preference application, and cleanup.
 */
export function useTheme() {
  let media: MediaQueryList | null = null;
  let systemListener: (() => void) | null = null;
  let lastAppliedTheme: "system" | "light" | "dark" | null = null;
  // let currentTheme: "system" | "light" | "dark" | null = null;

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

    const currentThemeValue = get(theme);
    selectTheme(currentThemeValue);
    lastAppliedTheme = currentThemeValue;
  }

  /**
   * Updates the theme when the store value changes.
   */
  function updateTheme() {
    if (!browser) return;

    const currentThemeValue = get(theme);
    if (currentThemeValue !== lastAppliedTheme) {
      selectTheme(currentThemeValue);
      lastAppliedTheme = currentThemeValue;
    }
  }

  // Subscribe to theme changes
  if (browser) {
    theme.subscribe(updateTheme);
  }

  return {
    initializeTheme,
    selectTheme,
    cleanupSystemListener
  };
}
