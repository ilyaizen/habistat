import { browser } from "$app/environment";
import { writable, get } from "svelte/store";
import { v4 as uuidv4 } from "uuid";

interface AnonymousSession {
  id: string;
  createdAt: number;
  lastModified: number;
}

const STORAGE_KEY = "habistat_anonymous_session";

// Function to create a new session object
function createNewSessionObject(): AnonymousSession {
  return {
    id: uuidv4(),
    createdAt: Date.now(),
    lastModified: Date.now()
  };
}

// Load session from localStorage or return null if none exists
function loadSession(): AnonymousSession | null {
  if (!browser) return null; // No session storage on server

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return null; // No session found
  }

  try {
    // TODO: Add validation logic here if needed (e.g., check structure, expiry)
    return JSON.parse(stored) as AnonymousSession;
  } catch (error) {
    console.error("Failed to parse stored session, clearing storage:", error);
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

// Initialize session: Load existing or return null
let initialSession: AnonymousSession | null = null;
if (browser) {
  initialSession = loadSession();
}

function createSessionStore() {
  const { subscribe, set, update } = writable<AnonymousSession | null>(initialSession);

  return {
    subscribe,
    touch: () => {
      update((session) => {
        if (!session) return null; // Do nothing if no session
        const updated = { ...session, lastModified: Date.now() };
        if (browser) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
        return updated;
      });
    },
    clear: () => {
      if (browser) {
        localStorage.removeItem(STORAGE_KEY);
      }
      set(null); // Set store to null, don't create a new one immediately
    },
    // Method to explicitly create and set a new session if needed
    startNew: (): AnonymousSession => {
      const newSession = createNewSessionObject();
      if (browser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      }
      set(newSession);
      anonymousUserId.set(newSession.id);
      return newSession;
    }
  };
}

export const anonymousSession = createSessionStore();

export function isAnonymous(): boolean {
  return !browser || !localStorage.getItem("auth_initiated");
}

export function markSessionClaimed() {
  if (browser) {
    localStorage.setItem("auth_initiated", "true");
  }
}

// --- Define Constants First ---
// LocalStorage keys
const USER_ID_KEY = "habistat_anonymous_user_id";
const LAST_LOGGED_OPEN_KEY = "habistat_last_logged_open_at";
const APP_OPEN_HISTORY_KEY = "habistat_app_open_history";
// Hour in milliseconds
const HOUR_MS = 60 * 60 * 1000;
// --- End Constants ---

// --- Remove Synchronous Initialization ---
// Create a store for the anonymous user ID, initialized to null
export const anonymousUserId = writable<string | null>(null);
// --- End Removal ---

// Initialize tracking from localStorage - runs post-mount
export function initializeTracking(): void {
  if (typeof window === "undefined") return; // Don't run on server

  try {
    const storedUserId = localStorage.getItem(USER_ID_KEY);
    const currentStoreId = get(anonymousUserId);

    if (storedUserId && storedUserId !== currentStoreId) {
      anonymousUserId.set(storedUserId);
    } else if (!storedUserId && currentStoreId) {
      anonymousUserId.set(null);
    }
    // Remove auto-logging of app open
  } catch (error) {
    console.error("Failed to initialize tracking from localStorage (on mount):", error);
  }
}

// Create a new anonymous user session using localStorage
export function createUserSession(): string | null {
  if (typeof window === "undefined") return null; // Don't run on server

  try {
    const userId = uuidv4();
    localStorage.setItem(USER_ID_KEY, userId);
    anonymousUserId.set(userId);
    localStorage.removeItem(APP_OPEN_HISTORY_KEY);
    localStorage.removeItem(LAST_LOGGED_OPEN_KEY);
    // Log first app open when explicitly creating session
    logAppOpen(userId);
    return userId;
  } catch (error) {
    console.error("Failed to create user session in localStorage:", error);
    return null;
  }
}

// Helper function to log an app open event to localStorage
function logAppOpen(userId: string): void {
  if (!browser) return;

  try {
    const now = Date.now();
    const historyStr = localStorage.getItem(APP_OPEN_HISTORY_KEY);
    const history: number[] = historyStr ? JSON.parse(historyStr) : [];

    history.push(now);

    // Store updated history (consider potential size limits of localStorage)
    localStorage.setItem(APP_OPEN_HISTORY_KEY, JSON.stringify(history));

    // Update the last logged open time
    localStorage.setItem(LAST_LOGGED_OPEN_KEY, now.toString());
  } catch (error) {
    console.error("Failed to log app open to localStorage:", error);
  }
}

// Log an app open event if needed based on localStorage timestamps
export function logAppOpenIfNeeded(): void {
  if (!browser) return; // Don't run on server

  try {
    const userId = get(anonymousUserId);

    // If there's no user ID, do nothing
    if (!userId) {
      return;
    }

    const now = Date.now();

    // Get the last logged open time from localStorage
    const lastLoggedOpenAtStr = localStorage.getItem(LAST_LOGGED_OPEN_KEY);
    const lastLoggedOpenAt = lastLoggedOpenAtStr ? parseInt(lastLoggedOpenAtStr) : null;

    // Check if we need to log a new open event
    if (!lastLoggedOpenAt || now - lastLoggedOpenAt > HOUR_MS) {
      logAppOpen(userId);
    }
  } catch (error) {
    console.error("Failed to check/log app open:", error);
  }
}

// Delete the current anonymous user session
export function deleteUserSession(): void {
  if (typeof window === "undefined") return; // Don't run on server

  try {
    // Clear all localStorage data
    localStorage.clear();
    // Reset stores
    anonymousUserId.set(null);
    anonymousSession.clear();
  } catch (error) {
    console.error("Failed to delete user session from localStorage:", error);
  }
}

// Get app open history for a date range from localStorage
export function getAppOpenHistory(sinceTimestamp?: number): number[] {
  if (!browser) return []; // Don't run on server

  try {
    const userId = get(anonymousUserId); // Ensure we operate for the current user

    if (!userId) {
      return [];
    }

    const historyStr = localStorage.getItem(APP_OPEN_HISTORY_KEY);
    if (!historyStr) {
      return [];
    }

    const timestamps: number[] = JSON.parse(historyStr);

    if (sinceTimestamp) {
      return timestamps.filter((ts) => ts >= sinceTimestamp);
    }

    return timestamps;
  } catch (error) {
    console.error("Failed to get app open history from localStorage:", error);
    return [];
  }
}

// Add a new function to check if a session exists
export function hasExistingSession(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(USER_ID_KEY) !== null;
}
