import { writable } from "svelte/store";
import type { InferModel } from "drizzle-orm";
import { activeTimers } from "../db/schema";
import { getDb } from "../db/client";
import { eq } from "drizzle-orm";

// Type for ActiveTimer row
export type ActiveTimer = InferModel<typeof activeTimers>;

/**
 * Svelte store for managing active timers.
 * Provides CRUD operations and loads data from the local SQLite DB via Drizzle ORM.
 */
function createActiveTimersStore() {
  const { subscribe, set, update } = writable<ActiveTimer[]>([]);

  return {
    subscribe,
    /**
     * Loads all active timers from the database and updates the store.
     */
    async load() {
      const db = await getDb();
      const rows = await db.select().from(activeTimers);
      set(rows);
    },
    /**
     * Adds a new active timer to the database and reloads the store.
     */
    async add(timer: ActiveTimer) {
      const db = await getDb();
      await db.insert(activeTimers).values(timer);
      await this.load();
    },
    /**
     * Removes an active timer by ID and reloads the store.
     */
    async remove(id: string) {
      const db = await getDb();
      await db.delete(activeTimers).where(eq(activeTimers.id, id));
      await this.load();
    },
    /**
     * Updates an active timer by ID and reloads the store.
     */
    async update(timer: ActiveTimer) {
      const db = await getDb();
      await db.update(activeTimers).set(timer).where(eq(activeTimers.id, timer.id));
      await this.load();
    }
  };
}

export const activeTimersStore = createActiveTimersStore();
