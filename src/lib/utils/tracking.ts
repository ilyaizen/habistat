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
import { getDb, persistBrowserDb } from "$lib/db/client";
import { appOpens } from "$lib/db/schema";
import { desc } from "drizzle-orm";
// import { formatDate } from "./date"; // No longer using the UTC-based formatter

/**
 * Formats a Date object as 'YYYY-MM-DD' in the user's local timezone.
 * This is crucial for correctly tracking daily activity based on the user's calendar day.
 *
 * @param date The date to format.
 * @returns A string in 'YYYY-MM-DD' format.
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
const LAST_LOGGED_OPEN_KEY = "habistat_last_logged_open_date"; // YYYY-MM-DD
const APP_OPEN_HISTORY_KEY = "habistat_app_open_history";

// --- Svelte Store for Session Management ---

/**
 * Creates a writable Svelte store for managing the UserSession,
 * with automatic persistence to localStorage.
 */
function createSessionStore() {
  // Load initial value from localStorage
  let initialSession: UserSession | null = null;
  if (browser) {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      try {
        // TODO: Add validation/migration logic for session object shape
        initialSession = JSON.parse(stored) as UserSession;
      } catch (error) {
        console.error("Failed to parse session from localStorage, clearing:", error);
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  }

  // Create the underlying writable store
  const { subscribe, set, update } = writable<UserSession | null>(initialSession);

  // Subscribe to changes and persist them to localStorage
  if (browser) {
    subscribe((session) => {
      if (session) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } else {
        // If session is null (cleared), remove it from storage
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    });
  }

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
   * Ensures a session exists, creating one if it doesn't.
   * This is the primary method for components to obtain a session.
   * @returns The existing or newly created UserSession.
   */
  function ensureSession(): UserSession {
    let session!: UserSession;
    update((currentSession) => {
      if (currentSession) {
        session = currentSession;
        return currentSession;
      }
      // Create a new session if one doesn't exist
      const newSession = createNewSessionObject();
      session = newSession;
      return newSession;
    });
    return session;
  }

  /**
   * Updates the session's lastModified timestamp.
   */
  function touchSession() {
    update((session) => {
      if (!session) return null;
      return { ...session, lastModified: Date.now() };
    });
  }

  /**
   * Clears all session data from storage and resets the store.
   */
  function clearSession() {
    if (browser) {
      localStorage.removeItem(LAST_LOGGED_OPEN_KEY);
      localStorage.removeItem(APP_OPEN_HISTORY_KEY);
    }
    set(null); // This will trigger the subscription to remove from localStorage
  }

  return {
    subscribe,
    set,
    update,
    ensure: ensureSession,
    touch: touchSession,
    clear: clearSession
  };
}

// Export the singleton session store instance
export const sessionStore = createSessionStore();

/**
 * Derived store providing direct access to the anonymous user ID string.
 */
export const anonymousUserId = derived(
  sessionStore,
  ($session: UserSession | null) => $session?.id ?? null
);

// --- Session State Management ---

/**
 * Gets the current session state.
 * @returns 'anonymous' or 'associated'.
 */
export function getSessionState(): "anonymous" | "associated" {
  const session = get(sessionStore);
  return session?.state ?? "anonymous";
}

/**
 * Marks the session as 'associated' with a Clerk user.
 * Call this function after successful authentication.
 *
 * @param clerkUserId The authenticated user's Clerk ID.
 * @param email Optional user email.
 */
export function markSessionAssociated(clerkUserId: string, email?: string): void {
  sessionStore.update((session) => {
    if (!session) {
      console.error("[Auth] No session found to associate with Clerk user.");
      // Potentially create a new session here if that's desired behavior
      return null;
    }

    return {
      ...session,
      state: "associated" as const,
      clerkUserId,
      clerkUserEmail: email,
      lastModified: Date.now()
    };
  });
}

/**
 * Retrieves the stored associated Clerk user ID, if available.
 * @returns The user ID string or null.
 */
export function getAssociatedUserId(): string | null {
  const session = get(sessionStore);
  return session?.clerkUserId ?? null;
}

/**
 * Retrieves the stored associated Clerk user email, if available.
 * @returns The user email string or null.
 */
export function getAssociatedUserEmail(): string | null {
  const session = get(sessionStore);
  return session?.clerkUserEmail ?? null;
}

/**
 * Retrieves details of the current session if available.
 * @returns Session details object or null if no session exists.
 */
export function getAssociatedSessionDetails(): {
  id: string;
  state: "anonymous" | "associated";
  clerkUserId: string | null;
  clerkUserEmail: string | null;
} | null {
  const session = get(sessionStore);
  if (!session) return null;

  return {
    id: session.id,
    state: session.state,
    clerkUserId: session.clerkUserId ?? null,
    clerkUserEmail: session.clerkUserEmail ?? null
  };
}

// --- Debugging and History (unchanged from original) ---
// Type for appOpens row
type AppOpenRow = { id: string; timestamp: number };

/**
 * Logs an app open event to the database.
 */
async function logAppOpenDb(): Promise<void> {
  const db = await getDb();
  const entry = { id: uuidv4(), timestamp: Date.now() };
  await db.insert(appOpens).values(entry).execute();
  await persistBrowserDb(); // Explicitly save the DB after writing.
}

/**
 * Logs an app open event, but only once per day based on local time.
 * This prevents multiple logs if the user opens/closes the app frequently.
 * @returns {Promise<boolean>} True if an open was logged, false otherwise.
 */
export async function logAppOpenIfNeeded(): Promise<boolean> {
  if (!browser) return false;

  const todayStr = formatLocalDate(new Date());
  const lastLoggedDate = localStorage.getItem(LAST_LOGGED_OPEN_KEY);

  if (lastLoggedDate !== todayStr) {
    await logAppOpenDb();
    localStorage.setItem(LAST_LOGGED_OPEN_KEY, todayStr);
    return true;
  }
  return false;
}

/**
 * Retrieves the history of app open timestamps from the database.
 * @param sinceTimestamp Optional timestamp to limit history to recent opens.
 * @returns An array of timestamps.
 */
export async function getAppOpenHistory(sinceTimestamp?: number): Promise<number[]> {
  const db = await getDb();
  try {
    const query = db
      .select({ timestamp: appOpens.timestamp })
      .from(appOpens)
      .orderBy(desc(appOpens.timestamp));
    const results = await query.execute();
    const timestamps = results.map((row: { timestamp: number | null }) => row.timestamp);
    return timestamps;
  } catch (error) {
    console.error("Failed to retrieve app open history:", error);
    return [];
  }
}

/**
 * Utility function to get just the session ID.
 * @returns The session ID string or null.
 */
export function getSessionId(): string | null {
  return get(anonymousUserId);
}
