import { writable } from "svelte/store";
import { browser } from "$app/environment";

export type ThemeMode = "system" | "light" | "dark";

interface Settings {
  developerMode: boolean;
  showUsageHistory: boolean;
  enableMotion: boolean;
  verboseLogs: boolean;
  // Preferred start of the week for calendars and date pickers
  weekStartsOn: "sunday" | "monday";
  // Preferred time format across the app
  timeFormat: "12h" | "24h";
  // Optional display name used for lightweight personalization (e.g. greetings)
  displayName: string;
}

const defaultSettings: Settings = {
  developerMode: false,
  showUsageHistory: false,
  enableMotion: true,
  verboseLogs: false,
  // Defaults favor common US conventions; first-run heuristics below may adjust
  weekStartsOn: "sunday",
  timeFormat: "12h",
  displayName: ""
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
          // Backfill new settings with sensible defaults if missing
          weekStartsOn: parsed.weekStartsOn ?? defaultSettings.weekStartsOn,
          timeFormat: parsed.timeFormat ?? defaultSettings.timeFormat,
          displayName: parsed.displayName ?? defaultSettings.displayName
        };
      } else {
        // First run: infer regional defaults when possible
        // - US: Sunday start + 12h
        // - Others: Monday start + 24h
        const lang = navigator.language || "";
        const isUS = /(^|-)US\b/i.test(lang);
        initial = {
          ...defaultSettings,
          weekStartsOn: isUS ? "sunday" : "monday",
          timeFormat: isUS ? "12h" : "24h"
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
