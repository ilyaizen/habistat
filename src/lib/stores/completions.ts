import { derived, writable } from "svelte/store";
import { v4 as uuid } from "uuid";
import { convexMutation, mapLocalHabitIdToConvexId } from "$lib/utils/convex-operations";
import { api } from "../../convex/_generated/api";
import type { completions as completionsSchema } from "../db/schema";
import * as localData from "../services/local-data";
import { groupCompletionsByDate } from "../utils/completions";
import { formatLocalDate } from "../utils/date";

// Drizzle: use table.$inferSelect instead of deprecated InferModel
export type Completion = typeof completionsSchema.$inferSelect;

function createCompletionsStore() {
  const { subscribe, set, update } = writable<Completion[]>([]);

  const refresh = async () => {
    const rows = await localData.getAllCompletions();
    set(rows);
  };

  return {
    subscribe,
    refresh,
    logCompletion: async (habitId: string, userId?: string | null) => {
      const now = Date.now();
      const newCompletion: Completion = {
        id: uuid(),
        habitId,
        completedAt: now,
        clientUpdatedAt: now,
        userId: userId || null // Associate with user if provided
      };
      await localData.createCompletion(newCompletion);
      update((completions) => [...completions, newCompletion]);
      // Best-effort push to Convex immediately to minimize drift
      try {
        // Map local habit ID to Convex habit _id for server-side storage
        const convexHabitId = await mapLocalHabitIdToConvexId(habitId);
        if (convexHabitId) {
          await convexMutation(api.completions.batchUpsertCompletions, {
            completions: [
              {
                localUuid: newCompletion.id,
                habitId: convexHabitId,
                completedAt: newCompletion.completedAt
              }
            ]
          });
        }
      } catch {
        // Non-fatal; periodic sync will reconcile
      }
      return newCompletion;
    },
    deleteLatestCompletionForToday: async (habitId: string) => {
      const deletedCompletion = await localData.deleteLatestCompletionForToday(habitId);
      if (deletedCompletion) {
        update((completions) => completions.filter((c) => c.id !== deletedCompletion.id));
        // Compute local day bounds and request Convex to delete the latest for that day too
        try {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(start.getDate() + 1);
          const convexHabitId = await mapLocalHabitIdToConvexId(habitId);
          if (convexHabitId) {
            await convexMutation(api.completions.deleteLatestCompletionForDay, {
              habitId: convexHabitId,
              dayStartMs: start.getTime(),
              dayEndMs: end.getTime()
            });
          }
        } catch {
          // Non-fatal; next sync will reconcile
        }
      }
    },
    // Sync-specific functions
    setUserId: async (userId: string) => {
      // Update all anonymous completions to belong to this user
      const completions = await localData.getAnonymousCompletions();
      for (const completion of completions) {
        await localData.updateCompletion(completion.id, {
          userId
        });
      }
      // Refresh the store to reflect changes
      await refresh();
    },
    updateFromSync: async (completions: Completion[]) => {
      // Used by sync service to update store with synced data
      set(completions);
    }
  };
}

export const completionsStore = createCompletionsStore();

/**
 * Derived store that groups completions by habit ID for efficient lookup.
 */
export const completionsByHabit = derived(completionsStore, ($completions) => {
  const map = new Map<string, Completion[]>();
  for (const completion of $completions) {
    if (!completion.habitId) continue;
    if (!map.has(completion.habitId)) {
      map.set(completion.habitId, []);
    }
    map.get(completion.habitId)?.push(completion);
  }
  return map;
});

/**
 * Derived store that groups all completions by date for efficient daily queries.
 * Returns a Map where keys are 'YYYY-MM-DD' strings and values are completion counts.
 */
export const completionsByDate = derived(completionsStore, ($completions) => {
  return groupCompletionsByDate($completions);
});

/**
 * Derived store that provides a function to get completion count for any date.
 * This is optimized for reactive components that need date-based completion counts.
 */
export const getCompletionCountForDate = derived(completionsByDate, ($completionsByDate) => {
  return (dateStr: string): number => {
    return $completionsByDate.get(dateStr) || 0;
  };
});

/**
 * Derived store that provides today's total completion count.
 */
export const todaysCompletionCount = derived(completionsByDate, ($completionsByDate) => {
  const today = formatLocalDate(new Date());
  return $completionsByDate.get(today) || 0;
});
