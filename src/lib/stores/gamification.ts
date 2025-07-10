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
  weeklyPointsDelta: number;
  level: number;
  loading: boolean;
}

/**
 * Calculates gamification points based on habits and app activity.
 * @returns A readable store with the user's points.
 */
function createGamificationStore(): Readable<GamificationState> {
  const initialState: GamificationState = {
    totalPoints: 0,
    weeklyPointsDelta: 0,
    level: 1,
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
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - 7);

        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - 14);

        // --- Calculate Habit Points ---
        let totalHabitPoints = 0;
        let thisWeekHabitPoints = 0;
        let lastWeekHabitPoints = 0;

        for (const completion of allCompletions) {
          const habit = allHabits.find((h) => h.id === completion.habitId);
          if (!habit) continue;

          const points = habit.pointsValue ?? 0;
          const pointModifier = habit.type === "positive" ? 1 : -1;
          const completionPoints = points * pointModifier;

          totalHabitPoints += completionPoints;

          const completionDate = new Date(completion.completedAt);
          if (completionDate >= thisWeekStart) {
            thisWeekHabitPoints += completionPoints;
          } else if (completionDate >= lastWeekStart) {
            lastWeekHabitPoints += completionPoints;
          }
        }

        // --- Calculate Activity Points ---
        let totalActivityPoints = 0;
        let thisWeekActivityPoints = 0;
        let lastWeekActivityPoints = 0;

        if (sessionCreatedAt) {
          const startDate = formatLocalDate(new Date(sessionCreatedAt));
          const activeDates = new Set(
            appOpenHistory.map((ts) => formatLocalDate(new Date(ts)).getTime())
          );

          // Ensure today is counted as active
          activeDates.add(today.getTime());

          for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
            const currentDate = formatLocalDate(d);
            let points = 0;
            if (activeDates.has(currentDate.getTime())) {
              points = POINTS_FOR_ACTIVE_DAY;
            } else {
              points = POINTS_FOR_INACTIVE_DAY;
            }

            totalActivityPoints += points;
            if (currentDate >= thisWeekStart) {
              thisWeekActivityPoints += points;
            } else if (currentDate >= lastWeekStart) {
              lastWeekActivityPoints += points;
            }
          }
        }

        const totalPoints = totalHabitPoints + totalActivityPoints;

        set({
          totalPoints,
          weeklyPointsDelta:
            thisWeekHabitPoints +
            thisWeekActivityPoints -
            (lastWeekHabitPoints + lastWeekActivityPoints),
          level: Math.max(1, Math.floor(totalPoints / 1000)),
          loading: false
        });
      };

      calculatePoints();
    },
    initialState
  );
}

export const gamification = createGamificationStore();
