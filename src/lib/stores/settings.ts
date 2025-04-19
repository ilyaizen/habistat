import { writable } from "svelte/store";

export type ThemeMode = "system" | "light" | "dark";

interface Settings {
  developerMode: boolean;
  showUsageHistory: boolean;
  enableMotion: boolean;
}

const defaultSettings: Settings = {
  developerMode: false,
  showUsageHistory: false,
  enableMotion: true
};

function createSettingsStore() {
  let initial = defaultSettings;

  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem("habistat_settings");
    if (saved) {
      try {
        initial = { ...defaultSettings, ...JSON.parse(saved) };
      } catch {}
    }
  }

  const store = writable<Settings>(initial);

  store.subscribe((value) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("habistat_settings", JSON.stringify(value));
    }
  });

  return store;
}

export const settings = createSettingsStore();

// Theme store: 'system' (default), 'light', 'dark'
function getInitialTheme(): ThemeMode {
  if (typeof localStorage !== 'undefined') {
    const t = localStorage.getItem('habistat_theme');
    if (t === 'light' || t === 'dark' || t === 'system') return t;
  }
  return 'system';
}

export const theme = writable<ThemeMode>(getInitialTheme());

theme.subscribe((val) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('habistat_theme', val);
  }
});
