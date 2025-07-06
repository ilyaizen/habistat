import { derived, type Readable } from "svelte/store";
import { habits as habitsStore, type Habit } from "$lib/stores/habits";
import { completionsStore, type Completion } from "$lib/stores/completions";
import { sessionStore } from "$lib/utils/tracking";
import { getAppOpenHistory } from "$lib/utils/tracking";

// Points constants
const POINTS_FOR_ACTIVE_DAY = 15;
const POINTS_FOR_INACTIVE_DAY = -10;

export interface GamificationState {
  totalPoints: number;
  weeklyPoints: number;
  loading: boolean;
}

/**
 * Calculates gamification points based on habits and app activity.
 * @returns A readable store with the user's points.
 */
function createGamificationStore(): Readable<GamificationState> {
  const initialState: GamificationState = {
    totalPoints: 0,
    weeklyPoints: 0,
    loading: true
  };

  return derived(
    [habitsStore, completionsStore, sessionStore],
    ([$habits, $completions, $session], set) => {
      set(initialState);

      // Async function to perform the calculation
      const calculatePoints = async () => {
        const appOpenHistory = await getAppOpenHistory();
        const allHabits: Habit[] = $habits;
        const allCompletions: Completion[] = $completions;
        const sessionCreatedAt = $session?.createdAt;

        // --- Helper function to format dates ---
        const formatLocalDate = (d: Date) => {
          const date = new Date(d);
          return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        };

        const today = formatLocalDate(new Date());
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(today.getDate() - 7);

        // --- Calculate Habit Points ---
        let totalHabitPoints = 0;
        let weeklyHabitPoints = 0;

        for (const completion of allCompletions) {
          const habit = allHabits.find((h) => h.id === completion.habitId);
          if (!habit) continue;

          const points = habit.pointsValue ?? 0;
          const pointModifier = habit.type === "positive" ? 1 : -1;
          const completionPoints = points * pointModifier;

          totalHabitPoints += completionPoints;

          const completionDate = new Date(completion.completedAt);
          if (completionDate >= oneWeekAgo) {
            weeklyHabitPoints += completionPoints;
          }
        }

        // --- Calculate Activity Points ---
        let totalActivityPoints = 0;
        let weeklyActivityPoints = 0;

        if (sessionCreatedAt) {
          const startDate = formatLocalDate(new Date(sessionCreatedAt));
          const activeDates = new Set(
            appOpenHistory.map((ts) => formatLocalDate(new Date(ts)).getTime())
          );

          // Ensure today is counted as active
          activeDates.add(today.getTime());

          for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
            const currentDate = formatLocalDate(d);
            if (activeDates.has(currentDate.getTime())) {
              totalActivityPoints += POINTS_FOR_ACTIVE_DAY;
              if (currentDate >= oneWeekAgo) {
                weeklyActivityPoints += POINTS_FOR_ACTIVE_DAY;
              }
            } else {
              totalActivityPoints += POINTS_FOR_INACTIVE_DAY;
              if (currentDate >= oneWeekAgo) {
                weeklyActivityPoints += POINTS_FOR_INACTIVE_DAY;
              }
            }
          }
        }

        set({
          totalPoints: totalHabitPoints + totalActivityPoints,
          weeklyPoints: weeklyHabitPoints + weeklyActivityPoints,
          loading: false
        });
      };

      calculatePoints();
    },
    initialState
  );
}

export const gamification = createGamificationStore();
