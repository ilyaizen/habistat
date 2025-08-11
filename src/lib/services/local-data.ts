import type { InferModel } from "drizzle-orm";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { getDb as getDrizzleDb, persistBrowserDb } from "../db/client";
import * as schema from "../db/schema";
import type { Calendar } from "../stores/calendars";
// Enforce and normalize calendar color themes at the data layer to guarantee
// consistency regardless of the caller. This supports Phase 3.7 R1 (normalize
// invalid values) while allowing us to later harden server validation (R2).
import { normalizeCalendarColor } from "../utils/colors";

// --- Types ---
type Habit = InferModel<typeof schema.habits>;
type Completion = InferModel<typeof schema.completions>;

// --- Local SQLite DB initialization (sql.js for browser) ---
// This service is browser-safe and Tauri-safe. It uses the central DB client.
// All `persistBrowserDb` calls are essential for saving data in the browser.

// --- CRUD Operations for each table ---

// Calendars
export async function getAllCalendars(): Promise<Calendar[]> {
  const db = await getDrizzleDb();
  return db.select().from(schema.calendars).all();
}

export async function createCalendar(data: typeof schema.calendars.$inferInsert) {
  const db = await getDrizzleDb();
  // Normalize color theme to an allowed value before persisting.
  const values: typeof schema.calendars.$inferInsert = {
    ...data,
    colorTheme: normalizeCalendarColor(data.colorTheme)
  };
  const [newCal] = await db.insert(schema.calendars).values(values).returning();
  await persistBrowserDb(); // Persist changes
  return newCal;
}

export async function updateCalendar(
  id: string,
  data: Partial<typeof schema.calendars.$inferInsert>
) {
  const db = await getDrizzleDb();
  const nextData: Partial<typeof schema.calendars.$inferInsert> = { ...data };
  // If colorTheme is being updated, normalize it to the nearest/default allowed name.
  if (typeof nextData.colorTheme === "string") {
    nextData.colorTheme = normalizeCalendarColor(nextData.colorTheme);
  }
  await db.update(schema.calendars).set(nextData).where(eq(schema.calendars.id, id));
  await persistBrowserDb(); // Persist changes
}

export async function deleteCalendar(id: string) {
  const db = await getDrizzleDb();
  await db.delete(schema.calendars).where(eq(schema.calendars.id, id));
  await persistBrowserDb(); // Persist changes
}

// Habits
export async function getAllHabits(): Promise<Habit[]> {
  const db = await getDrizzleDb();
  return db.select().from(schema.habits).all();
}

/**
 * Create a new habit in the local database
 * This function is called by the habits store when creating new habits
 */
export async function createHabit(data: typeof schema.habits.$inferInsert) {
  const db = await getDrizzleDb();
  await db.insert(schema.habits).values(data);
  await persistBrowserDb(); // Persist changes to browser storage
  return data.id;
}

export async function getHabitsByCalendar(calendarId: string) {
  const db = await getDrizzleDb();
  return db.select().from(schema.habits).where(eq(schema.habits.calendarId, calendarId)).all();
}

export async function getHabitById(id: string): Promise<Habit | null> {
  const db = await getDrizzleDb();
  const results = await db.select().from(schema.habits).where(eq(schema.habits.id, id)).limit(1);
  return results[0] || null;
}

// Note: convexId field was removed from schema - sync now uses localUuid for mapping
// This function maps Convex habit IDs back to local habits using localUuid
export async function getHabitByConvexId(convexId: string): Promise<Habit | null> {
  const db = await getDrizzleDb();
  // In the new schema, we use localUuid to correlate with Convex records
  // The convexId parameter is actually the localUuid from the server
  const results = await db
    .select()
    .from(schema.habits)
    .where(eq(schema.habits.localUuid, convexId))
    .limit(1);
  return results[0] || null;
}

export async function updateHabit(id: string, data: Partial<typeof schema.habits.$inferInsert>) {
  const db = await getDrizzleDb();
  await db.update(schema.habits).set(data).where(eq(schema.habits.id, id));
  await persistBrowserDb(); // Persist changes
}

export async function deleteHabit(id: string) {
  const db = await getDrizzleDb();
  await db.delete(schema.habits).where(eq(schema.habits.id, id));
  await persistBrowserDb(); // Persist changes
}

// Completions
export async function getAllCompletions(): Promise<Completion[]> {
  const db = await getDrizzleDb();
  return db.select().from(schema.completions).all();
}

export async function getCompletionsByHabit(habitId: string) {
  const db = await getDrizzleDb();
  return db.select().from(schema.completions).where(eq(schema.completions.habitId, habitId)).all();
}

export async function createCompletion(data: typeof schema.completions.$inferInsert) {
  const db = await getDrizzleDb();
  await db.insert(schema.completions).values(data);
  await persistBrowserDb(); // Persist changes
  return data.id;
}

export async function updateCompletion(
  id: string,
  data: Partial<typeof schema.completions.$inferInsert>
) {
  const db = await getDrizzleDb();
  await db.update(schema.completions).set(data).where(eq(schema.completions.id, id));
  await persistBrowserDb(); // Persist changes
}

export async function deleteCompletion(id: string) {
  const db = await getDrizzleDb();
  await db.delete(schema.completions).where(eq(schema.completions.id, id));
  await persistBrowserDb(); // Persist changes
}

export async function deleteLatestCompletionForToday(habitId: string) {
  const db = await getDrizzleDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the latest completion for today for this habit
  const latestToday = await db
    .select()
    .from(schema.completions)
    .where(
      and(
        eq(schema.completions.habitId, habitId),
        gte(schema.completions.completedAt, today.getTime())
      )
    )
    .orderBy(desc(schema.completions.completedAt))
    .limit(1);

  if (latestToday.length > 0) {
    const completion = latestToday[0];
    await db.delete(schema.completions).where(eq(schema.completions.id, completion.id));
    await persistBrowserDb(); // Persist changes
    return completion;
  }
  return null;
}

// Sync-specific completion functions
export async function getCompletionByLocalUuid(localUuid: string): Promise<Completion | null> {
  const db = await getDrizzleDb();
  const results = await db
    .select()
    .from(schema.completions)
    .where(eq(schema.completions.id, localUuid))
    .limit(1);
  return results[0] || null;
}

export async function getAnonymousCompletions(): Promise<Completion[]> {
  const db = await getDrizzleDb();
  return db.select().from(schema.completions).where(isNull(schema.completions.userId)).all();
}

/**
 * Get completions for a specific user
 * Used for sync operations to filter completions by user ID
 */
export async function getUserCompletions(userId: string): Promise<Completion[]> {
  const db = await getDrizzleDb();
  return db.select().from(schema.completions).where(eq(schema.completions.userId, userId)).all();
}

// ActiveTimers
export async function getActiveTimersByHabit(habitId: string) {
  const db = await getDrizzleDb();
  return db
    .select()
    .from(schema.activeTimers)
    .where(eq(schema.activeTimers.habitId, habitId))
    .all();
}

export async function createActiveTimer(data: typeof schema.activeTimers.$inferInsert) {
  const db = await getDrizzleDb();
  await db.insert(schema.activeTimers).values(data);
  await persistBrowserDb(); // Persist changes
  return data.id;
}

export async function updateActiveTimer(
  id: string,
  data: Partial<typeof schema.activeTimers.$inferInsert>
) {
  const db = await getDrizzleDb();
  await db.update(schema.activeTimers).set(data).where(eq(schema.activeTimers.id, id));
  await persistBrowserDb(); // Persist changes
}

export async function deleteActiveTimer(id: string) {
  const db = await getDrizzleDb();
  await db.delete(schema.activeTimers).where(eq(schema.activeTimers.id, id));
  await persistBrowserDb(); // Persist changes
}

// Sync Metadata Operations
export async function getSyncMetadata(tableName: string) {
  const db = await getDrizzleDb();
  const results = await db
    .select()
    .from(schema.syncMetadata)
    .where(eq(schema.syncMetadata.id, tableName))
    .limit(1);
  return results[0] || null;
}

/**
 * Update or insert the last successful sync timestamp for a specific table.
 */
export async function setSyncMetadata(tableName: string, lastSyncTimestamp: number) {
  const db = await getDrizzleDb();
  const existing = await getSyncMetadata(tableName);
  if (existing) {
    await db
      .update(schema.syncMetadata)
      .set({ lastSyncTimestamp })
      .where(eq(schema.syncMetadata.id, tableName));
  } else {
    await db.insert(schema.syncMetadata).values({ id: tableName, lastSyncTimestamp });
  }
  await persistBrowserDb();
}

/**
 * Compute the most recent local update timestamp across key synced tables.
 * Uses:
 * - calendars.updatedAt
 * - habits.updatedAt
 * - completions.clientUpdatedAt
 */
export async function getLatestUpdatedAt(): Promise<number> {
  const db = await getDrizzleDb();

  // Our DB client typing expects select() with no arguments. We then pick fields off the row.
  const latestCal = await db
    .select()
    .from(schema.calendars)
    .orderBy(desc(schema.calendars.updatedAt))
    .limit(1);
  const calTs = latestCal[0]?.updatedAt ?? 0;

  const latestHabit = await db
    .select()
    .from(schema.habits)
    .orderBy(desc(schema.habits.updatedAt))
    .limit(1);
  const habitTs = latestHabit[0]?.updatedAt ?? 0;

  const latestCompletion = await db
    .select()
    .from(schema.completions)
    .orderBy(desc(schema.completions.clientUpdatedAt))
    .limit(1);
  const completionTs = latestCompletion[0]?.clientUpdatedAt ?? 0;

  return Math.max(calTs, habitTs, completionTs, 0);
}

/**
 * Determine if there are unsynced local changes since each table's last sync.
 * Compares latest local timestamps with sync metadata for calendars, habits, and completions.
 */
export async function hasLocalChanges(): Promise<boolean> {
  const db = await getDrizzleDb();

  const loadLast = async (table: string) => {
    const row = await getSyncMetadata(table);
    return row?.lastSyncTimestamp ?? 0;
  };

  const latestCal = await db
    .select()
    .from(schema.calendars)
    .orderBy(desc(schema.calendars.updatedAt))
    .limit(1);
  if ((latestCal[0]?.updatedAt ?? 0) > (await loadLast("calendars"))) return true;

  const latestHabit = await db
    .select()
    .from(schema.habits)
    .orderBy(desc(schema.habits.updatedAt))
    .limit(1);
  if ((latestHabit[0]?.updatedAt ?? 0) > (await loadLast("habits"))) return true;

  const latestCompletion = await db
    .select()
    .from(schema.completions)
    .orderBy(desc(schema.completions.clientUpdatedAt))
    .limit(1);
  if ((latestCompletion[0]?.clientUpdatedAt ?? 0) > (await loadLast("completions"))) return true;

  // activityHistory omitted: minimal local schema lacks per-row timestamps
  return false;
}

// Activity History (for sync operations)
export async function getActivityHistorySince(_timestamp: number = 0) {
  const db = await getDrizzleDb();
  // Minimal schema: no clientUpdatedAt locally. Return all; caller filters by date or handles timestamps externally.
  return db.select().from(schema.activityHistory).all();
}

export async function updateActivityHistoryUserId(localUuid: string, userId: string) {
  const db = await getDrizzleDb();
  await db
    .update(schema.activityHistory)
    .set({ userId })
    .where(eq(schema.activityHistory.id, localUuid));
  await persistBrowserDb();
}

/**
 * Migrate anonymous activity history to authenticated user with proper merge strategy
 * to avoid UNIQUE constraint violations on (userId, date) combinations.
 * Returns the number of entries successfully migrated.
 */
export async function migrateAnonymousActivityHistory(userId: string): Promise<number> {
  const db = await getDrizzleDb();
  
  // Get all anonymous activity history entries
  const anonymousEntries = await db
    .select()
    .from(schema.activityHistory)
    .where(isNull(schema.activityHistory.userId))
    .all();
  
  if (anonymousEntries.length === 0) {
    return 0;
  }
  
  let migratedCount = 0;
  
  for (const entry of anonymousEntries) {
    try {
      // Check if user already has an entry for this date
      const existingEntry = await db
        .select()
        .from(schema.activityHistory)
        .where(
          and(
            eq(schema.activityHistory.userId, userId),
            eq(schema.activityHistory.date, entry.date)
          )
        )
        .get();
      
      if (existingEntry) {
        // User already has an entry for this date, delete the anonymous one
        await db
          .delete(schema.activityHistory)
          .where(eq(schema.activityHistory.id, entry.id));
      } else {
        // No existing entry, update the anonymous entry to have the userId
        await db
          .update(schema.activityHistory)
          .set({ userId })
          .where(eq(schema.activityHistory.id, entry.id));
        migratedCount++;
      }
    } catch (error) {
      console.warn(`Failed to migrate activity history entry ${entry.id}:`, error);
      // Continue with other entries even if one fails
    }
  }
  
  await persistBrowserDb();
  return migratedCount;
}

export async function getAnonymousActivityHistory() {
  const db = await getDrizzleDb();
  return db
    .select()
    .from(schema.activityHistory)
    .where(isNull(schema.activityHistory.userId))
    .all();
}

export async function createActivityHistory(data: typeof schema.activityHistory.$inferInsert) {
  const db = await getDrizzleDb();
  await db.insert(schema.activityHistory).values(data);
  await persistBrowserDb();
  return data.id;
}

export async function getActivityHistoryByDate(date: string) {
  const db = await getDrizzleDb();
  const results = await db
    .select()
    .from(schema.activityHistory)
    .where(eq(schema.activityHistory.date, date))
    .limit(1);
  return results[0] || null;
}

/**
 * Returns activity history for a given (userId, date) pair.
 * - When userId is null/empty, we treat it as anonymous and search with IS NULL.
 * - This function underpins app-level uniqueness guarantees for anonymous rows,
 *   since SQLite UNIQUE treats NULLs as distinct values.
 */
export async function getActivityHistoryByUserAndDate(userId: string | null, date: string) {
  const db = await getDrizzleDb();
  const normalizedUserId = userId && userId.trim() !== "" ? userId : null;
  const results = await db
    .select()
    .from(schema.activityHistory)
    .where(
      and(
        eq(schema.activityHistory.date, date),
        normalizedUserId === null
          ? isNull(schema.activityHistory.userId)
          : eq(schema.activityHistory.userId, normalizedUserId)
      )
    )
    .limit(1);
  return results[0] || null;
}

/**
 * Upserts an activityHistory row keyed by (userId, date).
 * Behavior (minimal schema):
 * - Insert when no row exists for (userId, date). Anonymous uses NULL userId.
 * - If a row exists, no-op (no per-row timestamps locally; server uses _creationTime).
 *
 * Notes:
 * - Implemented at the app layer to handle SQLite UNIQUE + NULL semantics for anonymous rows.
 * - DB-level UNIQUE(userId, date) enforces uniqueness for non-NULL userIds; this helper closes
 *   the gap for NULL (anonymous) by checking existence first.
 */
export async function upsertActivityHistoryByDate(params: {
  id?: string; // optional explicit local row id
  localUuid?: string; // optional explicit sync correlation id
  userId: string | null;
  date: string; // YYYY-MM-DD
  // Minimal schema: no openedAt/clientUpdatedAt required
}) {
  const db = await getDrizzleDb();
  const normalizedUserId = params.userId && params.userId.trim() !== "" ? params.userId : null;

  const existing = await getActivityHistoryByUserAndDate(normalizedUserId, params.date);

  if (!existing) {
    const genId =
      params.localUuid ??
      params.id ??
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

    await db.insert(schema.activityHistory).values({
      id: genId,
      localUuid: genId,
      userId: normalizedUserId,
      date: params.date
    });
    await persistBrowserDb();
    return genId;
  }

  // Nothing to update in minimal schema; ensure row exists
  return (existing as any).id as string;
}

/**
 * Update activity history entry (for sync conflict resolution)
 */
export async function updateActivityHistory(
  id: string,
  data: Partial<typeof schema.activityHistory.$inferInsert>
) {
  const db = await getDrizzleDb();
  await db.update(schema.activityHistory).set(data).where(eq(schema.activityHistory.id, id));
  await persistBrowserDb();
}

/**
 * Clears all user-specific data from the local database.
 * This is a destructive operation used when a user signs out.
 */
export async function clearAllLocalData() {
  const db = await getDrizzleDb();
  console.log("Clearing all local data...");
  // The order is important to respect foreign key constraints if they were enforced.
  await db.delete(schema.completions);
  await db.delete(schema.activeTimers);
  await db.delete(schema.habits);
  await db.delete(schema.calendars);
  await db.delete(schema.activityHistory);
  await db.delete(schema.syncMetadata);
  await persistBrowserDb();
  console.log("Local data cleared successfully.");
}

// --- Notes ---
// - All functions are async and safe for browser/tauri.
// - Use Svelte stores to reactively update UI after CRUD operations.
// - For more advanced queries, extend as needed.
