import { ConvexClient } from "convex/browser";
import type { InferModel } from "drizzle-orm";
import { get, writable } from "svelte/store";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import type { habits as habitsSchema } from "../db/schema";
import * as localData from "../services/local-data";
import { subscriptionStore } from "./subscription";

// Lazy initialization of Convex client to avoid undefined deployment address during static build
let convex: ConvexClient | null = null;

function getConvexClient(): ConvexClient {
  if (!convex) {
    // Use PUBLIC_CONVEX_URL for Vercel, fallback to VITE_CONVEX_URL for local dev
    const convexUrl = import.meta.env.PUBLIC_CONVEX_URL || import.meta.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("No Convex URL found. Please set PUBLIC_CONVEX_URL or VITE_CONVEX_URL");
    }
    console.log("[DEBUG] Creating ConvexClient with URL:", convexUrl);
    convex = new ConvexClient(convexUrl as string);
  }
  return convex;
}

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
        await getConvexClient().mutation(api.habits.createHabit, {
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
          clientCreatedAt: habit.createdAt,
          clientUpdatedAt: habit.updatedAt
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
  async function setUser(newClerkUserId: string | null) {
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
        const convexClient = getConvexClient();
        convexUnsubscribe = convexClient.onUpdate(
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
                createdAt: convexHabit.clientCreatedAt,
                updatedAt: convexHabit.clientUpdatedAt
              };

              if (localHabit) {
                if (convexHabit.clientUpdatedAt > localHabit.updatedAt) {
                  await localData.updateHabit(localHabit.id, serverDataForLocal);
                }
                localHabitsMap.delete(convexHabit.localUuid);
              } else {
                await localData.createHabit({ id: convexHabit.localUuid, ...serverDataForLocal });
              }
            }

            for (const localIdToDelete of localHabitsMap.keys()) {
              await localData.deleteHabit(localIdToDelete);
            }

            await _loadFromLocalDB();
            isSyncing.set(false);
            console.log("Local habits updated from Convex.");
          }
        );

        console.log("Subscribed to Convex habit updates.");
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
            await getConvexClient().mutation(api.habits.createHabit, {
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
            console.log(`Habit ${newHabit.id} synced to Convex.`);
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
            await getConvexClient().mutation(api.habits.deleteHabit, { localUuid });
            console.log(`Habit ${localUuid} deleted from Convex.`);
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
            const convexPayload: Partial<Omit<ConvexHabit, "_id" | "_creationTime">> & {
              localUuid: string;
              clientUpdatedAt: number;
            } = {
              localUuid,
              clientUpdatedAt: now
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

            await getConvexClient().mutation(
              api.habits.updateHabit,
              convexPayload as unknown as ConvexHabit
            );

            console.log(`Habit ${localUuid} updated in Convex.`);
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
