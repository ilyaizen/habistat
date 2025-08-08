/**
 * Simplified user tracking and session management for Habistat
 *
 * This module provides functionality for:
 * - Anonymous user session ID generation and persistence
 * - Tracking the session state (anonymous vs. associated/authenticated)
 * - Marking the transition from anonymous to associated state
 */

import { desc, eq } from "drizzle-orm";
import { derived, get, writable } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import { browser } from "$app/environment";
import { getDb, persistBrowserDb } from "$lib/db/client";
import { activityHistory, userProfile } from "$lib/db/schema";

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

/**
 * Validates and migrates a raw session object loaded from storage into the
 * current `UserSession` shape.
 *
 * Why: The persisted structure may change over time (missing fields, renamed
 * keys like `userId`/`clerkId`, or invalid types). This function normalizes
 * legacy shapes and drops unknown/invalid data to keep the app stable.
 */
function validateAndMigrateSession(raw: unknown): {
  session: UserSession | null;
  changed: boolean;
} {
  const now = Date.now();
  let changed = false;

  if (!raw || typeof raw !== "object") {
    return { session: null, changed };
  }

  const obj = raw as Record<string, unknown>;

  // Extract legacy keys if present
  const legacyClerkId =
    (typeof obj.clerkId === "string" ? (obj.clerkId as string) : undefined) ??
    (typeof obj.userId === "string" ? (obj.userId as string) : undefined);
  const legacyEmail = typeof obj.email === "string" ? (obj.email as string) : undefined;

  // Required: id (string)
  let id = typeof obj.id === "string" && obj.id.trim() !== "" ? (obj.id as string) : undefined;
  if (!id) {
    id = crypto?.randomUUID?.() ?? `anon-${now}`;
    changed = true;
  }

  // createdAt (number)
  const createdAt = typeof obj.createdAt === "number" ? (obj.createdAt as number) : now;
  if (typeof obj.createdAt !== "number") changed = true;

  // lastModified (number)
  const lastModified =
    typeof obj.lastModified === "number" ? (obj.lastModified as number) : createdAt;
  if (typeof obj.lastModified !== "number") changed = true;

  // state (enum)
  const stateRaw = obj.state;
  const state: "anonymous" | "associated" =
    stateRaw === "associated" || stateRaw === "anonymous"
      ? (stateRaw as "anonymous" | "associated")
      : legacyClerkId
        ? "associated"
        : "anonymous";
  if (state !== stateRaw) changed = true;

  // clerk user fields
  let clerkUserId: string | undefined;
  let clerkUserEmail: string | undefined;
  if (state === "associated") {
    const explicitClerkUserId =
      typeof obj.clerkUserId === "string" ? (obj.clerkUserId as string) : undefined;
    const explicitEmail =
      typeof obj.clerkUserEmail === "string" ? (obj.clerkUserEmail as string) : undefined;
    clerkUserId = explicitClerkUserId ?? legacyClerkId ?? undefined;
    clerkUserEmail = explicitEmail ?? legacyEmail ?? undefined;
    if (clerkUserId !== explicitClerkUserId || clerkUserEmail !== explicitEmail) changed = true;
  }

  const session: UserSession = {
    id,
    createdAt,
    lastModified,
    state,
    ...(clerkUserId ? { clerkUserId } : {}),
    ...(clerkUserEmail ? { clerkUserEmail } : {})
  };

  return { session, changed };
}

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
        const parsed = JSON.parse(stored) as unknown;
        const { session, changed } = validateAndMigrateSession(parsed);
        if (session) {
          initialSession = session;
          // Persist migrated shape immediately to avoid re-migrating next load
          if (changed) {
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
          }
        } else {
          // Invalid/unknown data -> clear
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
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
// type AppOpenRow = { id: string; timestamp: number };

/**
 * Ensures user profile exists and tracks first app open timestamp globally.
 */
async function ensureUserProfile(): Promise<void> {
  const db = await getDb();
  const sessionId = getSessionId() || "anonymous";

  // Check if user profile exists
  const existing = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.id, sessionId))
    .limit(1)
    .execute();

  if (existing.length === 0) {
    // Create user profile with first app open timestamp
    const now = Date.now();
    const newProfile = {
      id: sessionId,
      userId: null, // Will be updated when user authenticates
      firstAppOpenAt: now, // This is the very first app open
      createdAt: now,
      updatedAt: now
    } as const;
    await db.insert(userProfile).values(newProfile).execute();
  }
}

/**
 * Logs an app open event to the database using the simplified activityHistory schema.
 */
async function logAppOpenDb(): Promise<void> {
  const now = Date.now();
  const todayStr = formatLocalDate(new Date(now));

  // Ensure user profile exists (tracks first app open globally)
  await ensureUserProfile();

  // Phase 3.7: Use app-level upsert-by-date helper to guarantee a single
  // row per (userId, date). Anonymous users use NULL userId.
  const { upsertActivityHistoryByDate } = await import("$lib/services/local-data");
  await upsertActivityHistoryByDate({
    userId: null,
    date: todayStr
    // Minimal schema: no openedAt/clientUpdatedAt
  });
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
 * Retrieves the history of app open timestamps from the database using activityHistory.
 * @param sinceTimestamp Optional timestamp to limit history to recent opens.
 * @returns An array of timestamps.
 */
export async function getAppOpenHistory(): Promise<number[]> {
  const db = await getDb();
  try {
    // Minimal schema: we no longer store per-open timestamps, return recent day markers instead (as YYYY-MM-DD converted to local midnight timestamps)
    const results = await db
      .select()
      .from(activityHistory)
      .orderBy(desc(activityHistory.date))
      .execute();
    return results.map((row: { date: string }) => new Date(`${row.date}T00:00:00`).getTime());
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

/**
 * Retrieves the first app open timestamp from the user profile.
 * @returns The first app open timestamp or null if not found.
 */
export async function getFirstAppOpenTimestamp(): Promise<number | null> {
  const db = await getDb();
  const sessionId = getSessionId() || "anonymous";

  try {
    const profile = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.id, sessionId))
      .limit(1)
      .execute();
    return profile[0]?.firstAppOpenAt || null;
  } catch (error) {
    console.error("Failed to retrieve first app open timestamp:", error);
    return null;
  }
}

/**
 * Clears all app open history from the database.
 * Used when generating sample data to start fresh.
 */
// export async function clearAppOpenHistory(): Promise<void> {
//   const db = await getDb();
//   try {
//     await db.delete(appOpens).execute();
//     await persistBrowserDb();

//     // Also clear localStorage tracking
//     if (browser) {
//       localStorage.removeItem(LAST_LOGGED_OPEN_KEY);
//       localStorage.removeItem(APP_OPEN_HISTORY_KEY);
//     }
//   } catch (error) {
//     console.error("Failed to clear app open history:", error);
//   }
// }

/**
 * Generates fake app open history for testing/demo purposes.
 * Creates one app open per day for the specified number of days.
 *
 * @param numDays Number of days of history to generate (default: 7)
 * @returns Promise that resolves when fake history is generated
 */
export async function generateFakeAppOpenHistory(numDays: number = 7): Promise<void> {
  const db = await getDb();
  const today = new Date();

  try {
    // Clear existing history first
    // await clearAppOpenHistory();

    // Generate app open records for the past numDays
    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      // Set time to a random hour between 8 AM and 10 PM for variety
      const randomHour = Math.floor(Math.random() * 14) + 8;
      const randomMinute = Math.floor(Math.random() * 60);
      date.setHours(randomHour, randomMinute, 0, 0);

      const newId = uuidv4();
      await db
        .insert(activityHistory)
        .values({
          id: newId,
          localUuid: newId, // Sync correlation ID
          userId: null, // Initially anonymous
          date: formatLocalDate(date)
        })
        .execute();
    }

    await persistBrowserDb();

    // Update the last logged date to today to prevent duplicate logging
    const todayStr = formatLocalDate(today);
    if (browser) {
      localStorage.setItem(LAST_LOGGED_OPEN_KEY, todayStr);
    }

    console.log(`Generated ${numDays} days of fake app open history`);
  } catch (error) {
    console.error("Failed to generate fake app open history:", error);
    throw error;
  }
}

/**
 * Updates the session creation date to simulate the user starting earlier.
 * This affects the "pre-registration" display in the activity monitor.
 *
 * @param daysAgo Number of days ago the session should appear to have started
 */
export function updateSessionStartDate(daysAgo: number): void {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - daysAgo);
  targetDate.setHours(8, 0, 0, 0); // Set to 8 AM for consistency

  sessionStore.update((session) => {
    if (!session) {
      // Create a new session if none exists
      const newSession = {
        id: uuidv4(),
        createdAt: targetDate.getTime(),
        lastModified: Date.now(),
        state: "anonymous" as const
      };
      return newSession;
    }

    return {
      ...session,
      createdAt: targetDate.getTime(),
      lastModified: Date.now()
    };
  });
}
