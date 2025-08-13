import { get, writable } from "svelte/store";
// Use centralized Convex operations for DRY principles
import { convexMutation, convexSubscription } from "$lib/utils/convex-operations";
// Centralized debug flag
import { DEBUG_VERBOSE } from "$lib/utils/debug";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import type { habits as habitsSchema } from "../db/schema";
import * as localData from "../services/local-data";
import { subscriptionStore } from "./subscription";

// Drizzle: use table.$inferSelect instead of deprecated InferModel
export type Habit = typeof habitsSchema.$inferSelect;
export type ConvexHabit = Doc<"habits">;
export type HabitInputData = Pick<
  Habit,
  | "name"
  | "description"
  | "type"
  | "timerEnabled"
  | "targetDurationSeconds"
  | "pointsValue"
  | "calendarId"
> & { position?: number; isEnabled?: number };

function createHabitsStore() {
  const _habits = writable<Habit[]>([]);
  const isLoading = writable(true);
  const isSyncing = writable(false);

  let currentClerkUserId: string | null = null;
  let convexUnsubscribe: (() => void) | null = null;
  let isInitialized = false;

  async function _loadFromLocalDB() {
    isLoading.set(true);
    try {
      const allHabits = await localData.getAllHabits();
      if (currentClerkUserId) {
        _habits.set(allHabits.filter((h) => h.userId === currentClerkUserId || !h.userId));
      } else {
        _habits.set(allHabits.filter((h) => !h.userId));
      }
    } catch (error) {
      console.error("Error loading habits from local DB:", error);
      _habits.set([]);
    } finally {
      isLoading.set(false);
    }
  }

  async function _syncAnonymousHabits(clerkUserId: string) {
    isSyncing.set(true);
    const allHabits = await localData.getAllHabits();
    const anonymousHabits = allHabits.filter((h) => !h.userId);

    if (anonymousHabits.length === 0) {
      isSyncing.set(false);
      return;
    }

    if (DEBUG_VERBOSE)
      console.log(`Syncing ${anonymousHabits.length} anonymous habits for user ${clerkUserId}`);

    for (const habit of anonymousHabits) {
      try {
        await convexMutation(api.habits.createHabit, {
          localUuid: habit.id,
          calendarId: habit.calendarId,
          name: habit.name,
          description: habit.description ?? undefined,
          type: habit.type,
          timerEnabled: habit.timerEnabled === 1,
          targetDurationSeconds: habit.targetDurationSeconds ?? undefined,
          pointsValue: habit.pointsValue ?? undefined,
          position: habit.position,
          isEnabled: habit.isEnabled === 1,
          createdAt: habit.createdAt,
          updatedAt: habit.updatedAt
        });
        await localData.updateHabit(habit.id, { userId: clerkUserId, updatedAt: Date.now() });
      } catch (error) {
        console.error(`Failed to sync anonymous habit ${habit.id} to Convex:`, error);
      }
    }
    await _loadFromLocalDB();
    isSyncing.set(false);
  }

  // Helper function to push existing authenticated user habits to Convex
  async function _pushExistingHabits(clerkUserId: string) {
    const allHabits = await localData.getAllHabits();
    const userHabits = allHabits.filter((h) => h.userId === clerkUserId);

    if (userHabits.length === 0) {
      if (DEBUG_VERBOSE) console.log(`No existing habits to push for user ${clerkUserId}`);
      return;
    }

    if (DEBUG_VERBOSE)
      console.log(`Pushing ${userHabits.length} existing habits to Convex for user ${clerkUserId}`);

    for (const habit of userHabits) {
      try {
        // Push existing authenticated user habit to Convex
        await convexMutation(api.habits.createHabit, {
          localUuid: habit.id,
          calendarId: habit.calendarId,
          name: habit.name,
          description: habit.description ?? undefined,
          type: habit.type,
          timerEnabled: habit.timerEnabled === 1,
          targetDurationSeconds: habit.targetDurationSeconds ?? undefined,
          pointsValue: habit.pointsValue ?? undefined,
          position: habit.position,
          isEnabled: habit.isEnabled === 1,
          createdAt: habit.createdAt,
          updatedAt: habit.updatedAt
        });
        if (DEBUG_VERBOSE) console.log(`✅ Pushed habit ${habit.id} to Convex`);
      } catch (error) {
        console.error(`Failed to push habit ${habit.id} to Convex:`, error);
      }
    }
  }

  // Set user for the store - to be called from Svelte components
  // subscribeConvex controls whether we attach Convex subscriptions (network sync)
  // Set subscribeConvex=false to only filter local data without triggering sync
  async function setUser(
    newClerkUserId: string | null,
    isInitialSync: boolean = false,
    subscribeConvex: boolean = true
  ) {
    // If userId didn't change, we may still need to transition from
    // local-only (no Convex subscription) to subscribed mode. Allow that.
    if (newClerkUserId === currentClerkUserId) {
      if (subscribeConvex && !convexUnsubscribe) {
        // proceed to set up subscription without changing userId
      } else {
        return; // Nothing to do
      }
    }

    currentClerkUserId = newClerkUserId;

    if (convexUnsubscribe) {
      convexUnsubscribe();
      convexUnsubscribe = null;
      if (DEBUG_VERBOSE) console.log("Unsubscribed from Convex habit updates.");
    }

    if (currentClerkUserId) {
      // Local-only mode: show signed-in user's local data without network activity
      if (!subscribeConvex) {
        await _loadFromLocalDB();
        return;
      }
      if (DEBUG_VERBOSE) console.log("Habits: enabling Convex subscription/sync...");
      isLoading.set(true);
      isSyncing.set(true);

      await _syncAnonymousHabits(currentClerkUserId);

      // Push any existing authenticated user habits to Convex
      await _pushExistingHabits(currentClerkUserId);

      try {
        convexUnsubscribe = convexSubscription(
          api.habits.getUserHabits,
          {},
          async (convexHabitsFromServer: any) => {
            if (convexHabitsFromServer === undefined) return;

            isSyncing.set(true);
            // Phase 3.7: Determine initial sync per-type using local sync metadata if not explicitly provided
            const { getLastSyncTimestamp, updateLastSyncTimestamp } = await import(
              "../utils/convex-operations"
            );
            const initialFlag = isInitialSync || (await getLastSyncTimestamp("habits")) === 0;
            const localUserHabits = (await localData.getAllHabits()).filter(
              (h) => h.userId === currentClerkUserId
            );

            const localHabitsMap = new Map(localUserHabits.map((h) => [h.id, h]));

            for (const convexHabit of convexHabitsFromServer) {
              if (!currentClerkUserId) return;

              const localHabit = localHabitsMap.get(convexHabit.localUuid);
              const serverDataForLocal: Omit<Habit, "id"> = {
                localUuid: convexHabit.localUuid,
                userId: currentClerkUserId,
                calendarId: convexHabit.calendarId,
                name: convexHabit.name,
                description: convexHabit.description ?? null,
                type: convexHabit.type,
                timerEnabled: convexHabit.timerEnabled ? 1 : 0,
                targetDurationSeconds: convexHabit.targetDurationSeconds ?? null,
                pointsValue: convexHabit.pointsValue ?? null,
                position: convexHabit.position,
                isEnabled: convexHabit.isEnabled ? 1 : 0,
                createdAt: convexHabit.createdAt,
                updatedAt: convexHabit.updatedAt
              };

              if (localHabit) {
                // During initial sync (user sign-in), always overwrite local data with server data
                // During ongoing sync, use Last-Write-Wins conflict resolution
                if (initialFlag || convexHabit.clientUpdatedAt > localHabit.updatedAt) {
                  try {
                    await localData.updateHabit(localHabit.id, serverDataForLocal);
                    if (initialFlag && DEBUG_VERBOSE) {
                      console.log(
                        `📥 Initial sync: Overwriting local habit ${localHabit.id} with server data`
                      );
                    }
                  } catch (error) {
                    console.error(`Failed to update habit ${localHabit.id}:`, error);
                  }
                }
                localHabitsMap.delete(convexHabit.localUuid);
              } else {
                // Create new habit from server data with duplicate protection
                try {
                  // Check if habit already exists before creating (race condition protection)
                  const existingHabit = await localData.getHabitById(convexHabit.localUuid);
                  if (!existingHabit) {
                    await localData.createHabit({
                      id: convexHabit.localUuid,
                      ...serverDataForLocal
                    });
                    if (initialFlag && DEBUG_VERBOSE) {
                      console.log(
                        `📥 Initial sync: Creating habit ${convexHabit.localUuid} from server data`
                      );
                    }
                  } else {
                    // Habit exists, update it instead
                    if (initialFlag || convexHabit.clientUpdatedAt > existingHabit.updatedAt) {
                      await localData.updateHabit(existingHabit.id, serverDataForLocal);
                      if (initialFlag && DEBUG_VERBOSE) {
                        console.log(
                          `📥 Initial sync: Updating existing habit ${existingHabit.id} with server data`
                        );
                      }
                    }
                  }
                } catch (error) {
                  console.error(`Failed to create/update habit ${convexHabit.localUuid}:`, error);
                  // Continue processing other habits even if one fails
                }
              }
            }

            // During initial sync, delete any local habits not present on server
            // During ongoing sync, only delete if they were removed from server
            for (const localIdToDelete of localHabitsMap.keys()) {
              await localData.deleteHabit(localIdToDelete);
              if (initialFlag && DEBUG_VERBOSE) {
                console.log(
                  `📥 Initial sync: Deleting local habit ${localIdToDelete} not found on server`
                );
              }
            }

            await _loadFromLocalDB();
            isSyncing.set(false);
            if (DEBUG_VERBOSE) console.log("Local habits updated from Convex.");

            // Mark habits as synced now that pull/merge completed
            await updateLastSyncTimestamp("habits", Date.now());
          }
        );

        // Check if subscription was successful by verifying we have a valid unsubscribe function
        if (DEBUG_VERBOSE) console.log("Subscribed to Convex habit updates.");
        await _loadFromLocalDB();
      } catch (error) {
        console.error("Convex watch for habits failed:", error);
        await _loadFromLocalDB();
      } finally {
        isSyncing.set(false);
        isLoading.set(false);
      }
    } else {
      if (DEBUG_VERBOSE) console.log("User logged out, loading local/anonymous habits.");
      await _loadFromLocalDB();
    }
  }

  // Initialize the store immediately when created
  _loadFromLocalDB()
    .then(() => {
      isInitialized = true;
      if (DEBUG_VERBOSE) console.log("Habits: Auto-initialized from local DB");
    })
    .catch((error) => {
      console.error("Habits: Auto-initialization failed:", error);
      isLoading.set(false); // Stop loading state even on error
    });

  return {
    subscribe: _habits.subscribe,
    isLoading: { subscribe: isLoading.subscribe },
    isSyncing: { subscribe: isSyncing.subscribe },
    setUser, // Expose setUser method
    /**
     * Batch reorder and optionally reparent a set of habits belonging to a calendar.
     * This is optimized for drag-and-drop finalize where the destination list order
     * is authoritative. It performs a minimal set of local DB writes and defers
     * any cloud sync to the event-driven SyncService.
     */
    async batchReorder(destinationCalendarId: string, orderedHabits: Habit[]) {
      const originalItems = get(_habits);
      const now = Date.now();

      // Compute new in-memory snapshot with correct positions and calendarId
      const updatedById = new Map<string, Habit>();
      orderedHabits.forEach((habit, index) => {
        updatedById.set(habit.id, {
          ...habit,
          calendarId: destinationCalendarId,
          position: index,
          updatedAt: now
        });
      });

      const next = originalItems.map((h) => updatedById.get(h.id) ?? h);
      _habits.set(next);

      try {
        // Persist only rows that actually changed
        const writes: Promise<unknown>[] = [];
        for (const habit of orderedHabits) {
          const newPos = updatedById.get(habit.id)?.position;
          const newCal = destinationCalendarId;
          if (habit.position !== newPos || habit.calendarId !== newCal) {
            writes.push(
              localData.updateHabit(habit.id, {
                calendarId: newCal,
                position: newPos,
                updatedAt: now
              })
            );
          }
        }
        await Promise.all(writes);

        // Defer cloud sync; event-driven sync will observe local updates.
      } catch (error) {
        console.error("Failed to persist batch habit reorder:", error);
        // Best-effort revert to DB snapshot
        await this.refresh();
      }
    },

    /**
     * Resequence the positions of habits within a single calendar without
     * changing their calendar. Used to persist the source list after a cross-
     * calendar drag where one item was removed from it.
     */
    async resequenceCalendar(calendarId: string, orderedHabits: Habit[]) {
      const originalItems = get(_habits);
      const now = Date.now();

      // Compute updated snapshot for the affected calendar
      const updates: Array<Promise<unknown>> = [];
      const next = originalItems.map((h) => {
        if (h.calendarId !== calendarId) return h;
        const idx = orderedHabits.findIndex((x) => x.id === h.id);
        if (idx === -1) return h; // Item moved out already
        if (h.position === idx) return h; // No change
        updates.push(
          localData.updateHabit(h.id, {
            position: idx,
            updatedAt: now
          })
        );
        return { ...h, position: idx, updatedAt: now };
      });

      _habits.set(next);

      try {
        await Promise.all(updates);
      } catch (error) {
        console.error("Failed to resequence calendar habits:", error);
        await this.refresh();
      }
    },

    async refresh() {
      if (!isInitialized) {
        isInitialized = true;
        if (DEBUG_VERBOSE) console.log("Habits: Initial load from local DB");
      }
      await _loadFromLocalDB();
    },

    async add(data: HabitInputData) {
      // Check subscription limits before creating
      const canCreate = subscriptionStore.checkLimit("habits", data.calendarId);
      if (!canCreate) {
        const upgradeMessage = subscriptionStore.getUpgradeMessage("habits");
        throw new Error(`Habit creation limit reached for this calendar. ${upgradeMessage}`);
      }

      const allHabits = get(_habits);
      const habitsInCalendar = allHabits.filter((h) => h.calendarId === data.calendarId);
      const newPosition = habitsInCalendar.length;

      const localUuid = crypto.randomUUID();
      const now = Date.now();
      const habitUserId = currentClerkUserId || null;

      const newHabit: Habit = {
        id: localUuid,
        localUuid: localUuid, // Sync correlation ID
        userId: habitUserId,
        calendarId: data.calendarId,
        name: data.name,
        description: data.description ?? null,
        type: data.type,
        timerEnabled: data.timerEnabled ? 1 : 0,
        targetDurationSeconds: data.targetDurationSeconds ?? null,
        pointsValue: data.pointsValue ?? 0,
        position: data.position ?? newPosition,
        isEnabled: data.isEnabled ?? 1,
        createdAt: now,
        updatedAt: now
      };

      _habits.update((current) => [...current, newHabit]);

      try {
        await localData.createHabit(newHabit);

        // Immediately mirror create to Convex when authenticated to minimize drift
        if (currentClerkUserId) {
          try {
            await convexMutation(api.habits.createHabit, {
              localUuid: newHabit.id,
              calendarId: newHabit.calendarId,
              name: newHabit.name,
              description: newHabit.description ?? undefined,
              type: newHabit.type,
              timerEnabled: newHabit.timerEnabled === 1,
              targetDurationSeconds: newHabit.targetDurationSeconds ?? undefined,
              pointsValue: newHabit.pointsValue ?? undefined,
              position: newHabit.position,
              isEnabled: newHabit.isEnabled === 1,
              createdAt: newHabit.createdAt,
              updatedAt: newHabit.updatedAt
            });
          } catch (err) {
            console.warn("Failed to immediately mirror habit create to Convex:", err);
          }
        }
      } catch (e) {
        console.error("Failed to add habit locally:", e);
        await _loadFromLocalDB();
        throw e;
      }
    },

    async remove(localUuid: string) {
      const originalItems = get(_habits);
      const itemToRemove = originalItems.find((h) => h.id === localUuid);
      if (!itemToRemove) return;

      const calendarIdOfRemoved = itemToRemove.calendarId;

      _habits.update((items) => items.filter((h) => h.id !== localUuid));
      this.updatePositions(calendarIdOfRemoved);

      try {
        await localData.deleteHabit(localUuid);

        // Immediately mirror delete to Convex when authenticated
        if (currentClerkUserId) {
          try {
            await convexMutation(api.habits.deleteHabit, { localUuid });
          } catch (err) {
            console.warn("Failed to immediately mirror habit delete to Convex:", err);
          }
        }
      } catch (e) {
        console.error("Failed to remove habit locally:", e);
        _habits.set(originalItems);
        throw e;
      }
    },

    async update(localUuid: string, data: Partial<Omit<Habit, "id" | "userId" | "createdAt">>) {
      const originalItems = get(_habits);
      const itemToUpdate = originalItems.find((h) => h.id === localUuid);
      if (!itemToUpdate) return;

      const oldCalendarId = itemToUpdate.calendarId;
      const newCalendarId = data.calendarId;

      const now = Date.now();
      const updatedData = { ...data, updatedAt: now };
      const updatedHabit = { ...itemToUpdate, ...updatedData };

      _habits.update((items) => items.map((h) => (h.id === localUuid ? updatedHabit : h)));

      try {
        await localData.updateHabit(localUuid, updatedData);

        if (newCalendarId && oldCalendarId !== newCalendarId) {
          this.updatePositions(oldCalendarId);
        }

        // Immediately mirror update to Convex when authenticated
        if (currentClerkUserId) {
          try {
            const payload: any = {
              localUuid,
              updatedAt: updatedData.updatedAt
            };
            if (updatedData.calendarId !== undefined) payload.calendarId = updatedData.calendarId;
            if (updatedData.name !== undefined) payload.name = updatedData.name;
            if (updatedData.description !== undefined)
              payload.description = updatedData.description ?? undefined;
            if (updatedData.type !== undefined) payload.type = updatedData.type;
            if (updatedData.timerEnabled !== undefined)
              payload.timerEnabled = updatedData.timerEnabled === 1;
            if (updatedData.targetDurationSeconds !== undefined)
              payload.targetDurationSeconds = updatedData.targetDurationSeconds ?? undefined;
            if (updatedData.pointsValue !== undefined)
              payload.pointsValue = updatedData.pointsValue ?? undefined;
            if (updatedData.position !== undefined) payload.position = updatedData.position;
            if (updatedData.isEnabled !== undefined)
              payload.isEnabled = updatedData.isEnabled === 1;
            await convexMutation(api.habits.updateHabit, payload);
          } catch (err) {
            console.warn("Failed to immediately mirror habit update to Convex:", err);
          }
        }
      } catch (e) {
        console.error("Failed to update habit locally:", e);
        _habits.set(originalItems);
        throw e;
      }
    },

    async updatePositions(calendarId: string) {
      const allHabits = get(_habits);
      const habitsInCalendar = allHabits
        .filter((h) => h.calendarId === calendarId)
        .sort((a, b) => a.position - b.position);

      const updatePromises: Promise<unknown>[] = [];

      const updatedHabits = allHabits.map((habit) => {
        if (habit.calendarId === calendarId) {
          const newPosition = habitsInCalendar.findIndex((h) => h.id === habit.id);
          if (habit.position !== newPosition) {
            updatePromises.push(this.update(habit.id, { position: newPosition }));
            return { ...habit, position: newPosition };
          }
        }
        return habit;
      });

      _habits.set(updatedHabits);

      try {
        await Promise.all(updatePromises);
      } catch (error) {
        console.error(`Failed to update positions for calendar ${calendarId}:`, error);
        await this.refresh();
      }
    }
  };
}

export const habits = createHabitsStore();
