import { calendarsStore } from "$lib/stores/calendars";
import { habits as habitsStore } from "$lib/stores/habits";
import { completionsStore } from "$lib/stores/completions";

/**
 * Simple hook that provides dashboard data refresh functionality.
 * Uses standard store patterns without overcomplicating reactivity.
 */
export function useDashboardData() {
  let loading = $state(true);

  /**
   * Refresh all dashboard data stores
   */
  async function refreshData() {
    try {
      await Promise.all([
        calendarsStore.refresh(),
        habitsStore.refresh(),
        completionsStore.refresh()
      ]);
    } catch (error) {
      console.error("Dashboard data refresh error:", error);
      throw error;
    }
  }

  /**
   * Initialize dashboard data on mount
   */
  async function initialize() {
    try {
      await refreshData();
    } catch (error) {
      console.error("Dashboard mount error:", error);
    } finally {
      loading = false;
    }
  }

  return {
    loading: () => loading,
    refreshData,
    initialize
  };
}
