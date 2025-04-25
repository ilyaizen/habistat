/**
 * User tracking and session management utilities for Habistat
 *
 * This module provides functionality for:
 * - Anonymous user session tracking
 * - Session migration from anonymous to authenticated users
 * - App usage analytics
 */

import { browser } from "$app/environment";
import { writable, get } from "svelte/store";
import { v4 as uuidv4 } from "uuid";

/**
 * Represents an anonymous user session with unique identifier and timestamps
 */
interface AnonymousSession {
  id: string; // Unique identifier for the session
  createdAt: number; // Timestamp when session was created
  lastModified: number; // Timestamp when session was last updated
}

// Storage keys for session-related data in localStorage
const STORAGE_KEY = "habistat_anonymous_session";
const AUTH_INITIATED_KEY = "auth_initiated";
const AUTH_CLAIMED_KEY = "auth_claimed";
const MIGRATED_SESSION_KEY = "migrated_session";
// Define SESSION_MIGRATED_KEY at the top level to fix reference before definition
export const SESSION_MIGRATED_KEY = "habistat_session_migrated";
export const SESSION_USER_ID_KEY = "habistat_session_user_id";

/**
 * Creates a new anonymous session object with a UUID and current timestamps
 */
function createNewSessionObject(): AnonymousSession {
  return {
    id: uuidv4(),
    createdAt: Date.now(),
    lastModified: Date.now()
  };
}

/**
 * Attempts to load an existing session from localStorage
 * @returns The stored session object or null if none exists/invalid
 */
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

// Initialize session: Load existing or set to null
// This is only done once when the module is first loaded
let initialSession: AnonymousSession | null = null;
if (browser) {
  initialSession = loadSession();
}

/**
 * Creates a Svelte store for managing the anonymous session
 * Provides methods to update, clear, and create new sessions
 */
function createSessionStore() {
  const { subscribe, set, update } = writable<AnonymousSession | null>(initialSession);

  return {
    subscribe,
    /**
     * Updates the session's lastModified timestamp and persists to localStorage
     */
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
    /**
     * Clears the current session from storage and resets the store to null
     */
    clear: () => {
      if (browser) {
        localStorage.removeItem(STORAGE_KEY);
      }
      set(null); // Set store to null, don't create a new one immediately
    },
    /**
     * Creates and stores a new session, updating both the store and localStorage
     * @returns The newly created session object
     */
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

// Export the session store for use in the application
export const anonymousSession = createSessionStore();

/**
 * Checks if the current session is anonymous (no authentication initiated)
 * @returns true if session is anonymous, false otherwise
 */
export function isAnonymous(): boolean {
  return !browser || !localStorage.getItem(AUTH_INITIATED_KEY);
}

/**
 * Checks if the session has been claimed (authentication completed)
 * @returns true if session is claimed, false otherwise
 */
export function isClaimed(): boolean {
  return browser && localStorage.getItem(AUTH_CLAIMED_KEY) === "true";
}

/**
 * Gets the current session state as an enumerated value
 * @returns 'anonymous' if no auth initiated, 'pending' if auth initiated but not claimed, 'claimed' if fully authenticated
 */
export function getSessionState(): "anonymous" | "pending" | "claimed" {
  if (!browser) return "anonymous";

  const authInitiated = localStorage.getItem(AUTH_INITIATED_KEY) === "true";
  const authClaimed = localStorage.getItem(AUTH_CLAIMED_KEY) === "true";

  if (authClaimed) return "claimed";
  if (authInitiated) return "pending";
  return "anonymous";
}

/**
 * Marks the session as having initiated the authentication process
 * Called when user begins the auth flow but hasn't completed it
 */
export function markSessionAuthInitiated() {
  if (browser) {
    localStorage.setItem(AUTH_INITIATED_KEY, "true");
  }
}

/**
 * Marks the session as fully claimed/authenticated
 * Called when authentication is successfully completed
 */
export function markSessionClaimed() {
  if (browser) {
    localStorage.setItem(AUTH_INITIATED_KEY, "true");
    localStorage.setItem(AUTH_CLAIMED_KEY, "true");
  }
}

/**
 * Records migration data when anonymous session is linked to authenticated user
 * @param userId The authenticated user ID to associate with the session
 */
export function markSessionMigrated(userId: string) {
  if (browser) {
    localStorage.setItem(
      MIGRATED_SESSION_KEY,
      JSON.stringify({
        anonymousId: get(anonymousUserId),
        claimedUserId: userId,
        migratedAt: Date.now()
      })
    );
  }
}

/**
 * Checks if the current session has been migrated from anonymous to authenticated
 * @returns true if session has been migrated, false otherwise
 */
export function isSessionMigrated(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(SESSION_MIGRATED_KEY) === "1";
}

/**
 * Retrieves details about a migrated session if available
 * @returns Migration metadata or null if not migrated
 */
export function getMigrationDetails(): {
  anonymousId: string;
  claimedUserId: string;
  userEmail?: string;
  migratedAt: number;
} | null {
  if (!browser) return null;

  const migrationData = localStorage.getItem(MIGRATED_SESSION_KEY);
  if (!migrationData) return null;

  try {
    return JSON.parse(migrationData);
  } catch (error) {
    console.error("Failed to parse migration data:", error);
    return null;
  }
}

/**
 * Migrates an anonymous session to an authenticated user session
 * Handles merging data and recording the migration
 *
 * @param userId The authenticated user ID to associate with the session
 * @param email Optional email to associate with the session
 * @returns true if a new migration was performed, false if already migrated
 */
export async function migrateSession(userId: string, email?: string): Promise<boolean> {
  // Safety check for browser environment
  if (!browser) {
    console.warn("Cannot migrate session on server side");
    return false;
  }

  // Don't migrate if session is already migrated
  if (isSessionMigrated()) {
    console.log("Session already migrated, skipping migration for user", userId);
    return false;
  }

  try {
    console.log("Migrating session for user:", userId);

    // Store the session state for authenticated user
    markSessionClaimed();

    // Set the session as migrated first to prevent race conditions
    localStorage.setItem(SESSION_MIGRATED_KEY, "1");

    // Also store the user ID for reference
    if (userId) {
      localStorage.setItem(SESSION_USER_ID_KEY, userId);
    }

    // Store email if provided
    if (email) {
      localStorage.setItem(SESSION_USER_EMAIL_KEY, email);
    }

    // Create migration details
    try {
      localStorage.setItem(
        MIGRATED_SESSION_KEY,
        JSON.stringify({
          anonymousId: get(anonymousUserId) || "unknown",
          claimedUserId: userId,
          userEmail: email,
          migratedAt: Date.now()
        })
      );
    } catch (detailsError) {
      // If storing details fails, it's not critical
      console.warn("Failed to store migration details:", detailsError);
    }

    console.log("Session migration complete for user:", userId);
    return true;
  } catch (error) {
    console.error("Error migrating session:", error);

    // Make sure to set session as migrated even if there was an error
    // This prevents endless migration attempts that could break the app
    try {
      localStorage.setItem(SESSION_MIGRATED_KEY, "1");
    } catch (e) {
      console.error("Failed to set migrated flag after error:", e);
    }

    return false;
  }
}

// --- User Tracking Constants ---
// LocalStorage keys for user tracking data
const USER_ID_KEY = "habistat_anonymous_user_id";
const LAST_LOGGED_OPEN_KEY = "habistat_last_logged_open_at";
const APP_OPEN_HISTORY_KEY = "habistat_app_open_history";
// Hour in milliseconds - used for determining when to log new app open events
const HOUR_MS = 60 * 60 * 1000;

/**
 * Store for the anonymous user ID, accessible throughout the application
 * Initialized to null and populated during initialization
 */
export const anonymousUserId = writable<string | null>(null);

/**
 * Initializes tracking by loading user ID from localStorage
 * Should be called after the application mounts on the client
 */
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
    // No automatic app open logging here - must be called explicitly
  } catch (error) {
    console.error("Failed to initialize tracking from localStorage (on mount):", error);
  }
}

/**
 * Creates a new anonymous user session with unique ID
 * Also logs the first app open event for this new session
 *
 * @returns The newly created user ID or null if creation failed
 */
export function createUserSession(): string | null {
  if (typeof window === "undefined") return null; // Don't run on server

  try {
    const userId = uuidv4();
    localStorage.setItem(USER_ID_KEY, userId);
    anonymousUserId.set(userId);
    // Reset app open history for new session
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

/**
 * Internal helper to record an app open event to localStorage
 * Maintains a history of timestamps when the app was opened
 *
 * @param userId The user ID associated with this app open event
 */
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

/**
 * Logs an app open event if sufficient time has passed since the last one
 * Prevents logging multiple opens in a short time period (throttled by HOUR_MS)
 */
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

    // Check if we need to log a new open event (first open or enough time passed)
    if (!lastLoggedOpenAt || now - lastLoggedOpenAt > HOUR_MS) {
      logAppOpen(userId);
    }
  } catch (error) {
    console.error("Failed to check/log app open:", error);
  }
}

/**
 * Completely removes all user session data
 * Clears localStorage and resets the user ID store
 */
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

/**
 * Retrieves the history of app open events, optionally filtered by time
 *
 * @param sinceTimestamp Optional timestamp to filter history (only returns events after this time)
 * @returns Array of timestamps representing app open events
 */
export function getAppOpenHistory(sinceTimestamp?: number): number[] {
  if (!browser) return [];

  try {
    const historyStr = localStorage.getItem(APP_OPEN_HISTORY_KEY);
    if (!historyStr) return [];

    const history: number[] = JSON.parse(historyStr);

    if (sinceTimestamp === undefined) {
      return history;
    }

    return history.filter((timestamp) => timestamp >= sinceTimestamp);
  } catch (error) {
    console.error("Failed to get app open history:", error);
    return [];
  }
}

/**
 * Checks if there's an existing user session stored in localStorage
 * @returns true if a user ID exists, false otherwise
 */
export function hasExistingSession(): boolean {
  return browser && localStorage.getItem(USER_ID_KEY) !== null;
}

// Export session storage keys for external use
export const SESSION_USER_EMAIL_KEY = "habistat_session_user_email";
