<script lang="ts">
  import { onMount } from "svelte";
  import { triggerFireworks } from "$lib/stores/ui";
  import { sessionStore, getAppOpenHistory, logAppOpenIfNeeded } from "$lib/utils/tracking";
  import { get } from "svelte/store";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
  } from "$lib/components/ui/tooltip";

  // Helper to format a date as YYYY-MM-DD in the local timezone.
  function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

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
  }

  onMount(async () => {
    // Ensure a session exists before logging app open
    sessionStore.ensure();

    // Log app open and check if it was the first for the day
    const wasJustLogged = await logAppOpenIfNeeded();
    if (wasJustLogged) {
      // If it's a new day log, trigger the fireworks
      triggerFireworks.set(true);
    }

    const session = get(sessionStore);
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
    loadingHistory = false;
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

    for (let i = numDays - 1; i >= 0; i--) {
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      currentDate.setDate(today.getDate() - i);
      const currentDateStr = formatLocalDate(currentDate);
      let status: "active" | "inactive" | "pre-registration";
      const isToday = currentDateStr === todayStr;

      if (sessionStart && currentDate < sessionStart) {
        status = "pre-registration";
      } else if (activeDates.has(currentDateStr)) {
        status = "active";
      } else {
        status = "inactive";
      }
      days.push({ date: currentDateStr, status, isToday });
    }
    activityDays = days.reverse();
  }

  $effect(() => {
    if (!loadingHistory) {
      generateActivityData();
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
        <div class="flex space-x-0.5 p-0.5">
          {#each Array(numDays) as _, i}
            <Skeleton class="h-6 w-[10px] rounded-lg" />
          {/each}
        </div>
        <div class="flex justify-between">
          <Skeleton class="h-4 w-16" />
          <Skeleton class="h-4 w-16" />
          <Skeleton class="h-4 w-24" />
        </div>
      </div>
    {:else}
      <div class="flex space-x-0.5 p-0.5" aria-label="Activity bars">
        {#each activityDays.slice().reverse() as day (day.date)}
          <Tooltip>
            <TooltipTrigger>
              <div
                class="h-6 w-[10px] rounded-lg"
                class:activity-bar-green={day.status === "active"}
                class:activity-bar-red={day.status === "inactive"}
                class:bg-secondary={day.status === "pre-registration"}
                aria-label={`Activity for ${day.date}: ${day.status}${day.isToday ? " (Today)" : ""}`}
              ></div>
            </TooltipTrigger>
            <TooltipContent>
              {#snippet children()}
                {day.date}{day.isToday ? " (Today)" : ""} - {day.status}
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

  .activity-bar-red {
    background: linear-gradient(
      to bottom,
      color-mix(in oklab, var(--destructive), white 20%) 0%,
      var(--destructive) 50%,
      color-mix(in oklab, var(--destructive), black 10%) 100%
    );
  }
</style>
