import type { InferModel } from "drizzle-orm";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { getDb as getDrizzleDb, persistBrowserDb } from "../db/client";
import * as schema from "../db/schema";
import type { Calendar } from "../stores/calendars";

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
  const [newCal] = await db.insert(schema.calendars).values(data).returning();
  await persistBrowserDb(); // Persist changes
  return newCal;
}

export async function updateCalendar(
  id: string,
  data: Partial<typeof schema.calendars.$inferInsert>
) {
  const db = await getDrizzleDb();
  await db.update(schema.calendars).set(data).where(eq(schema.calendars.id, id));
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

export async function getHabitsByCalendar(calendarId: string) {
  const db = await getDrizzleDb();
  return db.select().from(schema.habits).where(eq(schema.habits.calendarId, calendarId)).all();
}

export async function createHabit(data: typeof schema.habits.$inferInsert) {
  const db = await getDrizzleDb();
  await db.insert(schema.habits).values(data);
  await persistBrowserDb(); // Persist changes
  return data.id;
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

export async function setSyncMetadata(tableName: string, lastSyncTimestamp: number) {
  const db = await getDrizzleDb();

  // Try to update existing record
  const existing = await getSyncMetadata(tableName);

  if (existing) {
    await db
      .update(schema.syncMetadata)
      .set({ lastSyncTimestamp })
      .where(eq(schema.syncMetadata.id, tableName));
  } else {
    // Create new record
    await db.insert(schema.syncMetadata).values({
      id: tableName,
      lastSyncTimestamp
    });
  }

  await persistBrowserDb(); // Persist changes
}

// --- Notes ---
// - All functions are async and safe for browser/tauri.
// - Use Svelte stores to reactively update UI after CRUD operations.
// - For more advanced queries, extend as needed.
