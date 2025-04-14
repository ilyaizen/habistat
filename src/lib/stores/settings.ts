import { writable } from "svelte/store";

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
