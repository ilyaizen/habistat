import { writable } from "svelte/store";
import { browser } from "$app/environment";

export type ThemeMode = "system" | "light" | "dark";

interface Settings {
  developerMode: boolean;
  showUsageHistory: boolean;
  enableMotion: boolean;
  verboseLogs: boolean;
  /**
   * When true, the app will load and prefer the Noto Color Emoji webfont for emoji rendering.
   * This improves emoji consistency across platforms. Off by default to avoid extra font load
   * unless the user explicitly opts in.
   * Note: the property name remains `useNotoEmoji` for backward compatibility.
   */
  useNotoEmoji: boolean;
}

const defaultSettings: Settings = {
  developerMode: false,
  showUsageHistory: false,
  enableMotion: true,
  verboseLogs: false,
  useNotoEmoji: true // Temporarily enabled for testing
};

function createSettingsStore() {
  let initial = defaultSettings;

  if (browser) {
    try {
      const saved = localStorage.getItem("habistat_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        initial = {
          ...defaultSettings,
          ...parsed,
          // Always ensure enableMotion and verboseLogs are defined
          enableMotion: parsed.enableMotion ?? defaultSettings.enableMotion,
          verboseLogs: parsed.verboseLogs ?? defaultSettings.verboseLogs,
          // Backward compatibility for the new emoji font toggle
          useNotoEmoji: parsed.useNotoEmoji ?? defaultSettings.useNotoEmoji
        };
      }
    } catch (error) {
      console.warn("Failed to load settings from localStorage:", error);
    }
  }

  const store = writable<Settings>(initial);

  if (browser) {
    store.subscribe((value) => {
      try {
        localStorage.setItem("habistat_settings", JSON.stringify(value));
      } catch (error) {
        console.warn("Failed to save settings to localStorage:", error);
      }
    });
  }

  return {
    ...store,
    reset: () => store.set(defaultSettings)
  };
}

export const settings = createSettingsStore();

// Theme store: 'system' (default), 'light', 'dark'
function getInitialTheme(): ThemeMode {
  if (browser) {
    try {
      const t = localStorage.getItem("habistat_theme");
      if (t === "light" || t === "dark" || t === "system") return t;
    } catch (error) {
      console.warn("Failed to load theme from localStorage:", error);
    }
  }
  return "system";
}

export const theme = writable<ThemeMode>(getInitialTheme());

if (browser) {
  theme.subscribe((val) => {
    try {
      localStorage.setItem("habistat_theme", val);
    } catch (error) {
      console.warn("Failed to save theme to localStorage:", error);
    }
  });
}
