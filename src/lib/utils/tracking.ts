/**
 * Simplified user tracking and session management for Habistat
 *
 * This module provides functionality for:
 * - Anonymous user session ID generation and persistence
 * - Tracking the session state (anonymous vs. associated/authenticated)
 * - Marking the transition from anonymous to associated state
 */

import { browser } from "$app/environment";
import { writable, get, derived } from "svelte/store";
import { v4 as uuidv4 } from "uuid";

/**
 * Represents a user session identifier.
 * Can be anonymous or associated with a Clerk user.
 */
export interface UserSession {
  id: string; // Unique identifier for the session (anonymous ID)
  createdAt: number; // Timestamp when session was created
  lastModified: number; // Timestamp when session was last updated (touch point)
  state: "anonymous" | "associated"; // Tracks if linked to a Clerk user
  clerkUserId?: string; // Clerk User ID if associated
  clerkUserEmail?: string; // Clerk User Email if associated
}

// Storage keys
const SESSION_STORAGE_KEY = "habistat_user_session"; // Stores UserSession object

// --- Add back History Constants ---
const LAST_LOGGED_OPEN_KEY = "habistat_last_logged_open_at";
const APP_OPEN_HISTORY_KEY = "habistat_app_open_history";
const HOUR_MS = 60 * 60 * 1000; // Throttle app open logging

/**
 * Creates a new anonymous session object.
 */
function createNewSessionObject(): UserSession {
  return {
    id: uuidv4(),
    createdAt: Date.now(),
    lastModified: Date.now(),
    state: "anonymous"
  };
}

/**
 * Loads the anonymous session object from localStorage.
 */
function loadSession(): UserSession | null {
  if (!browser) return null;

  const stored = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) return null;

  try {
    // TODO: Add validation if session structure changes significantly over time
    const session = JSON.parse(stored) as UserSession;
    // Basic validation/migration for older structures if needed
    if (!session.state) {
      session.state = "anonymous"; // Assume anonymous if state is missing
    }
    return session;
  } catch (error) {
    console.error("Failed to parse stored session, clearing:", error);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

// Initialize session on module load for browser environments
let initialSession: UserSession | null = null;
if (browser) {
  // Try to load existing session
  initialSession = loadSession();
  // DO NOT create a new one automatically here
}

/**
 * Svelte store for managing the anonymous session object.
 */
function createSessionStore() {
  // Initialize with loaded session (or null if none/SSR)
  const { subscribe, set, update } = writable<UserSession | null>(initialSession);

  return {
    subscribe,
    set,
    update,
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
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
          return newSession; // Update store with new session
        }
        // Update existing session
        const updated = { ...session, lastModified: Date.now() };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    /**
     * Resets the session: clears storage and sets store to null.
     * Used primarily during logout/session deletion.
     */
    clear: () => {
      if (browser) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
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
    ensure: (): UserSession => {
      let currentSession = get(sessionStore);
      if (!currentSession && browser) {
        currentSession = createNewSessionObject();
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentSession));
        set(currentSession);
        console.log("[Tracking] Created new session:", currentSession.id);
      }
      return currentSession!;
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
  ($session: UserSession | null) => $session?.id ?? null
);

/**
 * Initializes tracking. Only loads existing session if present.
 * Does NOT create a new session automatically.
 * RETURNS A PROMISE that resolves when the session is loaded.
 */
export async function initializeTracking(): Promise<void> {
  console.log("[Tracking] initializeTracking: Starting...");
  if (!browser) {
    console.log("[Tracking] initializeTracking: Not in browser, returning.");
    return;
  }

  try {
    let currentSession = get(sessionStore);
    console.log(
      "[Tracking] initializeTracking: Initial store value before loading:",
      JSON.stringify(currentSession)
    );

    // Only attempt to load if the store isn't already populated
    if (!currentSession) {
      currentSession = loadSession();
      console.log(
        "[Tracking] initializeTracking: Loaded from localStorage:",
        JSON.stringify(currentSession)
      );

      // If we found a session in localStorage, set it in the store
      if (currentSession) {
        sessionStore.set(currentSession);
        console.log(
          "[Tracking] initializeTracking: Store updated with loaded session.",
          JSON.stringify(currentSession)
        );
      }
    } else {
      console.log(
        "[Tracking] initializeTracking: Using existing session already in store:",
        JSON.stringify(currentSession)
      );
    }
    console.log(
      "[Tracking] initializeTracking: Finished. Final session state in store before resolving:",
      JSON.stringify(get(sessionStore))
    );
  } catch (error) {
    console.error("[Tracking] initializeTracking: Error during initialization:", error);
  }
}

// --- Session State Management ---

/**
 * Gets the current session state based on localStorage flags.
 * @returns 'anonymous' if the session state is anonymous, 'associated' otherwise.
 */
export function getSessionState(): "anonymous" | "associated" {
  if (!browser) return "anonymous"; // Default to anonymous server-side or if browser check fails
  // Check if the authentication claimed flag is set
  const session = loadSession();
  return session?.state ?? "anonymous";
}

/**
 * Marks the session as associated (authenticated) with a Clerk user.
 * Call this function immediately after successful authentication via Clerk.
 * Also stores user ID and email if provided.
 *
 * @param userId The authenticated user's Clerk ID.
 * @param email Optional user email.
 */
export function markSessionAssociated(clerkUserId: string, email?: string): void {
  console.log("[Auth] Starting session association for:", clerkUserId);
  sessionStore.update((currentSession) => {
    console.log("[Auth] Current session state:", currentSession);
    if (!currentSession) {
      console.error("[Auth] No session to associate");
      return null;
    }

    const updatedSession: UserSession = {
      ...currentSession,
      state: "associated" as const,
      clerkUserId,
      clerkUserEmail: email,
      lastModified: Date.now()
    };

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
    return updatedSession;
  });
}

/**
 * Retrieves the stored associated Clerk user ID, if available.
 * @returns The user ID string or null.
 */
export function getAssociatedUserId(): string | null {
  if (!browser) return null;
  const session = loadSession();
  return session?.clerkUserId ?? null;
}

/**
 * Retrieves the stored associated Clerk user email, if available.
 * @returns The user email string or null.
 */
export function getAssociatedUserEmail(): string | null {
  if (!browser) return null;
  const session = loadSession();
  return session?.clerkUserEmail ?? null;
}

/**
 * Retrieves details of the current session if available.
 * Includes anonymous ID and associated Clerk user details if applicable.
 * @returns Session details object or null if no session exists.
 */
export function getAssociatedSessionDetails(): {
  anonymousId: string | null;
  state: "anonymous" | "associated";
  clerkUserId: string | null;
  clerkUserEmail: string | null;
} | null {
  if (!browser) return null;
  const session = loadSession();
  if (!session) return null;
  return {
    anonymousId: session.id,
    state: session.state,
    clerkUserId: session.clerkUserId ?? null,
    clerkUserEmail: session.clerkUserEmail ?? null
  };
}

/**
 * Logs the current session status to the console for debugging.
 */
export function debugSessionStatus(): void {
  if (!browser) {
    console.log("debugSessionStatus: Cannot check status on server.");
    return;
  }
  const session = loadSession();
  const state = getSessionState();

  console.log(`--- Session Debug Status (${new Date().toISOString()}) ---`);
  if (session) {
    console.log(`  Session ID (Anonymous): ${session.id}`);
    console.log(`  Session Created At: ${new Date(session.createdAt).toISOString()}`);
    console.log(`  Session Last Modified: ${new Date(session.lastModified).toISOString()}`);
    console.log(`  Current State: ${state}`); // 'anonymous' or 'associated'
    console.log(`  Associated User ID: ${session.clerkUserId ?? "Not set"}`);
    console.log(`  Associated User Email: ${session.clerkUserEmail ?? "Not set"}`);
  } else {
    console.log("  No active session found in localStorage.");
  }
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

/**
 * Retrieves the current session ID.
 * Returns null if no session exists.
 */
export function getSessionId(): string | null {
  const session = get(sessionStore);
  return session ? session.id : null;
}
