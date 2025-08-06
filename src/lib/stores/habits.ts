import type { InferModel } from "drizzle-orm";
import { get, writable } from "svelte/store";
// Use centralized Convex operations for DRY principles
import { convexMutation, convexSubscription } from "$lib/utils/convex-operations";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import type { habits as habitsSchema } from "../db/schema";
import * as localData from "../services/local-data";
import { subscriptionStore } from "./subscription";

export type Habit = InferModel<typeof habitsSchema>;
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

  // Set user for the store - to be called from Svelte components
  async function setUser(newClerkUserId: string | null, isInitialSync: boolean = false) {
    if (newClerkUserId === currentClerkUserId) {
      return;
    }

    currentClerkUserId = newClerkUserId;

    if (convexUnsubscribe) {
      convexUnsubscribe();
      convexUnsubscribe = null;
      console.log("Unsubscribed from Convex habit updates.");
    }

    if (currentClerkUserId) {
      console.log("⚙️ Habits: Syncing with Convex");
      isLoading.set(true);
      isSyncing.set(true);

      await _syncAnonymousHabits(currentClerkUserId);

      try {
        convexUnsubscribe = convexSubscription(
          api.habits.getUserHabits,
          {},
          async (convexHabitsFromServer: any) => {
            if (convexHabitsFromServer === undefined) return;

            isSyncing.set(true);
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
                if (isInitialSync || convexHabit.clientUpdatedAt > localHabit.updatedAt) {
                  try {
                    await localData.updateHabit(localHabit.id, serverDataForLocal);
                    if (isInitialSync) {
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
                    if (isInitialSync) {
                      console.log(
                        `📥 Initial sync: Creating habit ${convexHabit.localUuid} from server data`
                      );
                    }
                  } else {
                    // Habit exists, update it instead
                    if (isInitialSync || convexHabit.clientUpdatedAt > existingHabit.updatedAt) {
                      await localData.updateHabit(existingHabit.id, serverDataForLocal);
                      if (isInitialSync) {
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
              if (isInitialSync) {
                console.log(
                  `📥 Initial sync: Deleting local habit ${localIdToDelete} not found on server`
                );
              }
            }

            await _loadFromLocalDB();
            isSyncing.set(false);
            console.log("Local habits updated from Convex.");
          }
        );

        // Check if subscription was successful by verifying we have a valid unsubscribe function
        console.log("Subscribed to Convex habit updates.");
        await _loadFromLocalDB();
      } catch (error) {
        console.error("Convex watch for habits failed:", error);
        await _loadFromLocalDB();
      } finally {
        isSyncing.set(false);
        isLoading.set(false);
      }
    } else {
      console.log("User logged out, loading local/anonymous habits.");
      await _loadFromLocalDB();
    }
  }

  _loadFromLocalDB();

  return {
    subscribe: _habits.subscribe,
    isLoading: { subscribe: isLoading.subscribe },
    isSyncing: { subscribe: isSyncing.subscribe },
    setUser, // Expose setUser method

    async refresh() {
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

        if (currentClerkUserId) {
          isSyncing.set(true);
          try {
            const result = await convexMutation(api.habits.createHabit, {
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
              clientCreatedAt: newHabit.createdAt,
              clientUpdatedAt: newHabit.updatedAt
            });
            if (result !== null) {
              console.log(`Habit ${newHabit.id} synced to Convex.`);
            } else {
              console.warn("Failed to sync habit to Convex");
            }
          } catch (error) {
            console.error(`Failed to sync new habit ${newHabit.id} to Convex:`, error);
          } finally {
            isSyncing.set(false);
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

        if (currentClerkUserId) {
          isSyncing.set(true);
          try {
            const result = await convexMutation(api.habits.deleteHabit, { localUuid });
            if (result !== null) {
              console.log(`Habit ${localUuid} deleted from Convex.`);
            } else {
              console.warn("Failed to delete habit from Convex");
            }
          } catch (error) {
            console.error(`Failed to delete habit ${localUuid} from Convex:`, error);
          } finally {
            isSyncing.set(false);
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

        if (currentClerkUserId) {
          isSyncing.set(true);
          try {
            const convexPayload: any = {
              localUuid,
              updatedAt: now
            };
            if ("name" in data && data.name !== undefined) convexPayload.name = data.name;
            if ("description" in data) convexPayload.description = data.description ?? undefined;
            if ("type" in data && data.type !== undefined) convexPayload.type = data.type;
            if ("timerEnabled" in data && data.timerEnabled !== undefined)
              convexPayload.timerEnabled = data.timerEnabled === 1;
            if ("targetDurationSeconds" in data)
              convexPayload.targetDurationSeconds = data.targetDurationSeconds ?? undefined;
            if ("pointsValue" in data) convexPayload.pointsValue = data.pointsValue ?? undefined;
            if ("position" in data && data.position !== undefined)
              convexPayload.position = data.position;
            if ("isEnabled" in data && data.isEnabled !== undefined)
              convexPayload.isEnabled = data.isEnabled === 1;

            if ("calendarId" in data && data.calendarId !== undefined) {
              convexPayload.calendarId = data.calendarId;
            }

            const result = await convexMutation(
              api.habits.updateHabit,
              convexPayload as unknown as ConvexHabit
            );
            if (result !== null) {
              console.log(`Habit ${localUuid} updated in Convex.`);
            } else {
              console.warn("Failed to update habit in Convex");
            }
          } catch (error) {
            console.error(`Failed to update habit ${localUuid} in Convex:`, error);
          } finally {
            isSyncing.set(false);
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
