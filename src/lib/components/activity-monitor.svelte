<script lang="ts">
  import { onMount } from "svelte";
  import { triggerFireworks } from "$lib/stores/ui";
  import { sessionStore, getAppOpenHistory, logAppOpenIfNeeded } from "$lib/utils/tracking";
  import { completionsStore, getCompletionCountForDate } from "$lib/stores/completions";
  import { formatLocalDate } from "$lib/utils/date";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
  } from "$lib/components/ui/tooltip";

  // State for the component
  let sessionStartDate: string | null = $state(null);
  let activeDates: Set<string> = $state(new Set());
  let loadingHistory = $state(true);
  let activityDays: DayStatus[] = $state([]);

  const { numDays = 30 } = $props<{ numDays?: number }>();

  /**
   * Represents the status of a single day in the activity bar.
   */
  interface DayStatus {
    date: string; // YYYY-MM-DD
    status: "active" | "inactive" | "pre-registration";
    isToday: boolean;
    completionCount: number; // Number of completions for this day
  }

  /**
   * Loads activity data from the database and updates the component state.
   * This function can be called to refresh the data after changes.
   */
  async function loadActivityData() {
    loadingHistory = true;

    try {
      const session = $sessionStore;
      if (session?.createdAt) {
        const created = new Date(session.createdAt);
        sessionStartDate = formatLocalDate(created);
      }

      // Get all app open history as dates
      const history = await getAppOpenHistory();
      const newActiveDates = new Set((history ?? []).map((ts) => formatLocalDate(new Date(ts))));

      // Safeguard: Always ensure today is marked as active after a load.
      newActiveDates.add(formatLocalDate(new Date()));

      activeDates = newActiveDates;
    } catch (error) {
      console.error("Failed to load activity data:", error);
    } finally {
      loadingHistory = false;
    }
  }

  /**
   * Public refresh function that can be called to reload activity data.
   * Useful when sample data is generated or when the user wants to refresh manually.
   */
  export function refresh() {
    return loadActivityData();
  }

  onMount(async () => {
    // Ensure a session exists before logging app open
    sessionStore.ensure();

    // Load completions data first
    await completionsStore.refresh();

    // Log app open and check if it was the first for the day
    const wasJustLogged = await logAppOpenIfNeeded();
    if (wasJustLogged) {
      // If it's a new day log, trigger the fireworks
      triggerFireworks.set(true);
    }

    // Load the initial activity data
    await loadActivityData();
  });

  /**
   * Generates the activity data for the past numDays.
   */
  function generateActivityData() {
    const days: DayStatus[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatLocalDate(today);
    const sessionStart = sessionStartDate ? new Date(sessionStartDate + "T00:00:00") : null;
    if (sessionStart) sessionStart.setHours(0, 0, 0, 0);

    // Get the completion count function from the derived store
    const getCompletionCount = $getCompletionCountForDate;

    for (let i = numDays - 1; i >= 0; i--) {
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      currentDate.setDate(today.getDate() - i);
      const currentDateStr = formatLocalDate(currentDate);
      let status: "active" | "inactive" | "pre-registration";
      const isToday = currentDateStr === todayStr;
      const completionCount = getCompletionCount(currentDateStr);

      if (sessionStart && currentDate < sessionStart) {
        status = "pre-registration";
      } else if (activeDates.has(currentDateStr)) {
        status = "active";
      } else {
        status = "inactive";
      }
      days.push({ date: currentDateStr, status, isToday, completionCount });
    }
    activityDays = days.reverse();
  }

  // Reactive statement that regenerates activity data when dependencies change
  $effect(() => {
    // Subscribe to all the dependencies that should trigger a refresh
    const currentCompletionCountFn = $getCompletionCountForDate;
    const currentSession = $sessionStore;

    if (!loadingHistory && activeDates.size > 0) {
      generateActivityData();
    }
  });

  // Watch for changes in the session store and refresh when session changes
  $effect(() => {
    const session = $sessionStore;
    if (session && !loadingHistory) {
      // Update session start date if it changed
      if (session.createdAt) {
        const newSessionStartDate = formatLocalDate(new Date(session.createdAt));
        if (newSessionStartDate !== sessionStartDate) {
          sessionStartDate = newSessionStartDate;
          generateActivityData();
        }
      }
    }
  });
</script>

<TooltipProvider>
  <div
    class="bg-card w-full max-w-[380px] rounded-md border p-2 shadow-xs sm:w-[380px]"
    aria-label="Activity Monitor Overview"
  >
    <div class="mb-2 flex items-center justify-between">
      <span class="text-base font-semibold">Activity Overview</span>
      <span class="text-muted-foreground text-xs">Last {numDays} days</span>
    </div>

    {#if loadingHistory}
      <div class="space-y-3">
        <div class="flex space-x-0.5 p-0.5 pb-6">
          {#each Array(numDays) as _, i}
            <Skeleton class="h-6 w-[10px] rounded-lg" />
          {/each}
        </div>
      </div>
    {:else}
      <div class="flex space-x-0.5 p-0.5" aria-label="Activity bars">
        {#each activityDays.slice().reverse() as day (day.date)}
          <Tooltip>
            <TooltipTrigger>
              <div
                class="h-6 w-[10px] rounded-lg"
                class:activity-bar-green={day.status === "active" && day.completionCount > 0}
                class:activity-bar-green-half={day.status === "active" && day.completionCount === 0}
                class:activity-bar-red={day.status === "inactive"}
                class:bg-secondary={day.status === "pre-registration"}
                aria-label={`Activity for ${day.date}: ${day.status}${day.isToday ? " (Today)" : ""} - ${day.completionCount} completions`}
              ></div>
            </TooltipTrigger>
            <TooltipContent>
              {#snippet children()}
                <div class="text-center">
                  <div>{day.date}{day.isToday ? " (Today)" : ""} - {day.status}</div>
                  <div>Completions: {day.completionCount}</div>
                </div>
              {/snippet}
            </TooltipContent>
          </Tooltip>
        {/each}
      </div>

      <div
        class="text-muted-foreground mt-3 flex flex-wrap items-center gap-2 text-xs sm:flex-row sm:justify-between sm:gap-0"
      >
        <div class="flex items-center space-x-1">
          <span class="bg-secondary border-border inline-block h-3 w-3 rounded border"></span>
          <span>Pre-registration</span>
        </div>
        <div class="flex items-center space-x-1">
          <span class="activity-bar-red border-border inline-block h-3 w-3 rounded border"></span>
          <span>Inactive</span>
        </div>
        <div class="flex items-center space-x-1">
          <span class="activity-bar-green border-border inline-block h-3 w-3 rounded border"></span>
          <span>Active</span>
        </div>
      </div>
    {/if}
  </div>
</TooltipProvider>

<style>
  .activity-bar-green {
    background: linear-gradient(
      to bottom,
      color-mix(in oklab, var(--primary), white 20%) 0%,
      var(--primary) 50%,
      color-mix(in oklab, var(--primary), black 10%) 100%
    );
    transition:
      transform 0.2s,
      background 0.2s;
  }

  .activity-bar-green-half {
    background: linear-gradient(
      to bottom,
      color-mix(in oklab, var(--primary), white 20%) 0%,
      var(--primary) 50%,
      color-mix(in oklab, var(--primary), black 10%) 100%
    );
    opacity: 0.5;
    transition:
      transform 0.2s,
      background 0.2s,
      opacity 0.2s;
  }

  .activity-bar-red {
    background: linear-gradient(
      to bottom,
      color-mix(in oklab, var(--destructive), white 20%) 0%,
      var(--destructive) 50%,
      color-mix(in oklab, var(--destructive), black 10%) 100%
    );
  }
</style>
