/**
 * Completion Analysis Utilities
 *
 * This module provides reusable functions for analyzing completion data.
 *
 * @example Basic usage in a component:
 * ```typescript
 * import { getCompletionsForDate, getCompletionHistory } from "$lib/utils/completions";
 * import { completionsStore } from "$lib/stores/completions";
 * import { get } from "svelte/store";
 *
 * // Get completions for today
 * const todayCount = getCompletionsForDate(get(completionsStore), "2024-01-15");
 *
 * // Get 7-day history
 * const weekHistory = getCompletionHistory(get(completionsStore), 7);
 * ```
 *
 * @example Using derived stores (preferred for reactive components):
 * ```typescript
 * import { getCompletionCountForDate, completionsByDate } from "$lib/stores/completions";
 *
 * // In Svelte component
 * const countForDate = $getCompletionCountForDate("2024-01-15");
 * const allDateCounts = $completionsByDate; // Map<string, number>
 * ```
 */

import type { Completion } from "$lib/stores/completions";
import { getLocalDayRange, formatLocalDate } from "./date";

/**
 * Counts completions for a specific date using local timezone.
 * @param completions Array of completions to filter
 * @param dateStr Date string in 'YYYY-MM-DD' format
 * @returns Number of completions for that date
 */
export function getCompletionsForDate(completions: Completion[], dateStr: string): number {
  const { start, end } = getLocalDayRange(dateStr);

  return completions.filter((completion) => {
    const completionDate = new Date(completion.completedAt);
    return completionDate >= start && completionDate < end;
  }).length;
}

/**
 * Groups completions by date (local timezone).
 * @param completions Array of completions
 * @returns Map of date strings to completion counts
 */
export function groupCompletionsByDate(completions: Completion[]): Map<string, number> {
  const groups = new Map<string, number>();

  for (const completion of completions) {
    const date = new Date(completion.completedAt);
    // Use consistent formatLocalDate function instead of inline formatting
    const dateStr = formatLocalDate(date);

    groups.set(dateStr, (groups.get(dateStr) || 0) + 1);
  }

  return groups;
}

/**
 * Gets completions for a specific habit on a specific date.
 * @param completions Array of completions
 * @param habitId Habit ID to filter by
 * @param dateStr Date string in 'YYYY-MM-DD' format
 * @returns Number of completions for that habit on that date
 */
export function getHabitCompletionsForDate(
  completions: Completion[],
  habitId: string,
  dateStr: string
): number {
  const habitCompletions = completions.filter((c) => c.habitId === habitId);
  return getCompletionsForDate(habitCompletions, dateStr);
}

/**
 * Gets completion counts for the last N days.
 * @param completions Array of completions
 * @param numDays Number of days to include
 * @returns Array of { date, count } objects for the last numDays
 */
export function getCompletionHistory(
  completions: Completion[],
  numDays: number
): Array<{ date: string; count: number }> {
  const today = new Date();
  const history: Array<{ date: string; count: number }> = [];

  for (let i = numDays - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const count = getCompletionsForDate(completions, dateStr);

    history.push({ date: dateStr, count });
  }

  return history;
}
