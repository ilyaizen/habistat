/**
 * Simplified user tracking and session management for Habistat
 *
 * This module provides functionality for:
 * - Anonymous user session ID generation and persistence
 * - Tracking the session state (anonymous vs. claimed/authenticated)
 * - Marking the transition from anonymous to claimed state
 */

import { browser } from "$app/environment";
import { writable, get, derived } from "svelte/store";
import { v4 as uuidv4 } from "uuid";

/**
 * Represents an anonymous user session identifier.
 */
interface AnonymousSession {
  id: string; // Unique identifier for the session
  createdAt: number; // Timestamp when session was created
  lastModified: number; // Timestamp when session was last updated (touch point)
}

// Storage keys
const STORAGE_KEY = "habistat_anonymous_session"; // Stores AnonymousSession object
const AUTH_CLAIMED_KEY = "habistat_auth_claimed"; // "true" if user is authenticated
// Key to indicate if the *initial* anonymous session data has been associated/migrated
// after the first login. We still need this distinction.
export const SESSION_MIGRATED_KEY = "habistat_session_migrated";
// Optional: Store the claimed user ID if needed elsewhere
export const SESSION_USER_ID_KEY = "habistat_session_user_id";
// Optional: Store the claimed user email if needed elsewhere
export const SESSION_USER_EMAIL_KEY = "habistat_session_user_email";

// --- Add back History Constants ---
const LAST_LOGGED_OPEN_KEY = "habistat_last_logged_open_at";
const APP_OPEN_HISTORY_KEY = "habistat_app_open_history";
const HOUR_MS = 60 * 60 * 1000; // Throttle app open logging

/**
 * Creates a new anonymous session object.
 */
function createNewSessionObject(): AnonymousSession {
  return {
    id: uuidv4(),
    createdAt: Date.now(),
    lastModified: Date.now()
  };
}

/**
 * Loads the anonymous session object from localStorage.
 */
function loadSession(): AnonymousSession | null {
  if (!browser) return null;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    // TODO: Add validation if session structure changes significantly over time
    return JSON.parse(stored) as AnonymousSession;
  } catch (error) {
    console.error("Failed to parse stored session, clearing:", error);
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

// Initialize session on module load for browser environments
let initialSession: AnonymousSession | null = null;
if (browser) {
  initialSession = loadSession();
  // Ensure a session exists if running in browser
  if (!initialSession) {
    initialSession = createNewSessionObject();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialSession));
  }
}

/**
 * Svelte store for managing the anonymous session object.
 */
function createSessionStore() {
  // If initialSession is null (SSR), the store starts null.
  // If initialSession has a value (Browser), the store starts with it.
  const { subscribe, set, update } = writable<AnonymousSession | null>(initialSession);

  return {
    subscribe,
    /**
     * Updates the session's lastModified timestamp. Call this on significant user actions.
     */
    touch: () => {
      if (!browser) return; // Only run touch logic in browser
      update((session) => {
        // If session is null (maybe SSR or cleared), do nothing
        // Or, if in browser and somehow null, create a new one
        if (!session) {
          console.warn("Touching session when it's null. Creating new session.");
          const newSession = createNewSessionObject();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
          return newSession; // Update store with new session
        }
        // Update existing session
        const updated = { ...session, lastModified: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    /**
     * Resets the session: clears storage and sets store to null.
     * Used primarily during logout/session deletion.
     */
    clear: () => {
      if (browser) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(AUTH_CLAIMED_KEY);
        localStorage.removeItem(SESSION_MIGRATED_KEY);
        localStorage.removeItem(SESSION_USER_ID_KEY);
        localStorage.removeItem(SESSION_USER_EMAIL_KEY);
        // --- Add clearing history keys --- >
        localStorage.removeItem(LAST_LOGGED_OPEN_KEY);
        localStorage.removeItem(APP_OPEN_HISTORY_KEY);
        // <----------------------------------
      }
      set(null); // Reset store state
    },
    /**
     * Ensures a session exists, creating one if needed.
     * Typically called on app initialization.
     * Returns the current or newly created session.
     */
    ensure: (): AnonymousSession => {
      let currentSession = get(sessionStore); // Use the exported store name
      if (!currentSession) {
        if (browser) {
          currentSession = createNewSessionObject();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSession));
          set(currentSession); // Update the store
        } else {
          // Should not happen if initialSession logic is correct, but handle defensively
          throw new Error("Cannot ensure session on server-side without initial session.");
        }
      }
      return currentSession;
    }
  };
}

// Export the session store instance
export const sessionStore = createSessionStore();

/**
 * Store for the anonymous user ID. Derived from the main session store.
 * Provides easy access to just the ID string.
 */
export const anonymousUserId = derived(
  sessionStore,
  ($session: AnonymousSession | null) => $session?.id ?? null
);

/**
 * Initializes tracking. Ensures an anonymous session exists on the client.
 * Should be called once when the app mounts client-side.
 */
export function initializeTracking(): void {
  if (!browser) return;
  sessionStore.ensure(); // Make sure a session exists and the store is populated
  console.log("Tracking initialized. Anonymous User ID:", get(anonymousUserId));
}

// --- Session State Management ---

/**
 * Gets the current session state based on localStorage flags.
 * @returns 'anonymous' if no auth claimed flag, 'claimed' otherwise.
 */
export function getSessionState(): "anonymous" | "claimed" {
  if (!browser) return "anonymous"; // Default to anonymous server-side or if browser check fails
  // Check if the authentication claimed flag is set
  return localStorage.getItem(AUTH_CLAIMED_KEY) === "true" ? "claimed" : "anonymous";
}

/**
 * Marks the session as claimed (authenticated).
 * Call this function immediately after successful authentication via Clerk.
 * Also stores user ID and email if provided.
 *
 * @param userId The authenticated user's Clerk ID.
 * @param email Optional user email.
 */
export function markSessionClaimed(userId: string, email?: string): void {
  if (!browser) return;
  localStorage.setItem(AUTH_CLAIMED_KEY, "true");
  if (userId) {
    localStorage.setItem(SESSION_USER_ID_KEY, userId);
  }
  if (email) {
    localStorage.setItem(SESSION_USER_EMAIL_KEY, email);
  }
  console.log(`Session marked as claimed for user ${userId} at ${new Date().toISOString()}`);
  // Touch the session to update lastModified timestamp
  sessionStore.touch();
}

/**
 * Marks that the initial anonymous data associated with this session ID
 * has been processed or migrated after the *first* login.
 * This prevents repeated migration attempts on subsequent logins.
 *
 * Call this *after* backend confirmation that any necessary anonymous data
 * associated with get(anonymousUserId) has been linked to the claimedUserId.
 * If no data migration is needed, call this immediately after markSessionClaimed.
 */
export function markSessionMigrated(): void {
  if (!browser) return;
  localStorage.setItem(SESSION_MIGRATED_KEY, "true"); // Use "true" for consistency
  console.log("Session marked as migrated at", new Date().toISOString());
}

/**
 * Checks if the initial anonymous session data has been marked as migrated.
 * @returns true if the migration flag is set, false otherwise.
 */
export function isSessionMigrated(): boolean {
  if (!browser) return false;
  return localStorage.getItem(SESSION_MIGRATED_KEY) === "true";
}

/**
 * Retrieves the stored claimed user ID, if available.
 * @returns The user ID string or null.
 */
export function getClaimedUserId(): string | null {
  if (!browser) return null;
  return localStorage.getItem(SESSION_USER_ID_KEY);
}

/**
 * Retrieves the stored claimed user email, if available.
 * @returns The user email string or null.
 */
export function getClaimedUserEmail(): string | null {
  if (!browser) return null;
  return localStorage.getItem(SESSION_USER_EMAIL_KEY);
}

/**
 * Retrieves basic details about the claimed/migrated session.
 * @returns Object with IDs and email, or null if not claimed/details unavailable.
 */
export function getClaimedSessionDetails(): {
  anonymousId: string | null;
  claimedUserId: string | null;
  claimedUserEmail: string | null;
} | null {
  if (!browser || getSessionState() !== "claimed") {
    return null;
  }

  return {
    anonymousId: get(anonymousUserId), // Get current anonymous ID from store
    claimedUserId: getClaimedUserId(),
    claimedUserEmail: getClaimedUserEmail()
  };
}

// --- Utility ---

/**
 * Logs current session status and stored values to the console for debugging.
 */
export function debugSessionStatus(): void {
  if (!browser) {
    console.log("debugSessionStatus: Not in browser environment.");
    return;
  }

  console.group("Habistat Session Debug Info");
  console.log("Current Time:", new Date().toISOString());
  console.log("Anonymous Session Object:", get(sessionStore));
  console.log("Anonymous User ID (derived):", get(anonymousUserId));
  console.log("Session State (getSessionState):", getSessionState());
  console.log("Is Migrated (isSessionMigrated):", isSessionMigrated());
  console.log("Stored Auth Claimed Flag:", localStorage.getItem(AUTH_CLAIMED_KEY));
  console.log("Stored Migrated Flag:", localStorage.getItem(SESSION_MIGRATED_KEY));
  console.log("Stored Claimed User ID:", localStorage.getItem(SESSION_USER_ID_KEY));
  console.log("Stored Claimed User Email:", localStorage.getItem(SESSION_USER_EMAIL_KEY));
  console.groupEnd();
}

// --- Add back App Open Logging Functions ---

/**
 * Internal helper to record an app open event to localStorage.
 * Maintains a history of timestamps.
 *
 * @param userId The anonymous user ID associated with this app open event.
 */
function logAppOpen(userId: string): void {
  if (!browser) return;

  try {
    const now = Date.now();
    const historyStr = localStorage.getItem(APP_OPEN_HISTORY_KEY);
    const history: number[] = historyStr ? JSON.parse(historyStr) : [];

    history.push(now); // Add current timestamp

    // Store updated history (consider potential size limits of localStorage)
    localStorage.setItem(APP_OPEN_HISTORY_KEY, JSON.stringify(history));

    // Update the last logged open time
    localStorage.setItem(LAST_LOGGED_OPEN_KEY, now.toString());

    console.log(`App open logged for user ${userId} at ${new Date(now).toISOString()}`);
  } catch (error) {
    console.error("Failed to log app open to localStorage:", error);
  }
}

/**
 * Logs an app open event if sufficient time has passed since the last one.
 * Prevents logging multiple opens in a short time period (throttled by HOUR_MS).
 * Should be called when the app becomes active (e.g., on dashboard load).
 */
export function logAppOpenIfNeeded(): void {
  if (!browser) return; // Don't run on server

  try {
    const userId = get(anonymousUserId); // Get current anonymous ID

    // If there's no user ID, do nothing (shouldn't happen if initialized properly)
    if (!userId) {
      console.warn("logAppOpenIfNeeded called without an anonymousUserId.");
      return;
    }

    const now = Date.now();
    const lastLoggedOpenAtStr = localStorage.getItem(LAST_LOGGED_OPEN_KEY);
    const lastLoggedOpenAt = lastLoggedOpenAtStr ? parseInt(lastLoggedOpenAtStr) : null;

    // Check if we need to log a new open event (first open or enough time passed)
    if (!lastLoggedOpenAt || now - lastLoggedOpenAt > HOUR_MS) {
      logAppOpen(userId);
    } else {
      // Optional: Log that we skipped logging due to throttling
      // console.log("Skipped logging app open due to throttling.");
    }
  } catch (error) {
    console.error("Failed to check/log app open:", error);
  }
}

/**
 * Retrieves the history of app open events from localStorage, optionally filtered.
 *
 * @param sinceTimestamp Optional timestamp to filter history (only returns events after this time).
 * @returns Array of timestamps representing app open events, sorted ascending.
 */
export function getAppOpenHistory(sinceTimestamp?: number): number[] {
  if (!browser) return [];

  try {
    const historyStr = localStorage.getItem(APP_OPEN_HISTORY_KEY);
    if (!historyStr) return [];

    const history: number[] = JSON.parse(historyStr);

    // Ensure history is sorted if needed (though push should maintain order)
    // history.sort((a, b) => a - b);

    if (sinceTimestamp === undefined) {
      return history;
    }

    // Filter events after the specified timestamp
    return history.filter((timestamp) => timestamp >= sinceTimestamp);
  } catch (error) {
    console.error("Failed to get app open history:", error);
    return [];
  }
}
