<!-- /**
  * Activity Calendar Component
  *
  * A calendar-like display of recent activity (last N days), styled similarly to
  * the calendars section in `dashboard-calendars.svelte` but without any
  * drag-and-drop. This is a new visual shell around the existing activity data
  * used by `activity-monitor.svelte`, intended to replace it.
  *
  * Key points:
  * - Local-first: loads from local DB/stores and does not force a server sync
  * - No DnD: purely presentational, matches the dashboard's card aesthetics
  * - Accessible tooltips showing day status and completion counts
  */ -->

<script lang="ts">
  import { onMount } from "svelte";
  import { SvelteDate, SvelteSet } from "svelte/reactivity";

  // UI components and utilities

  import * as Tooltip from "$lib/components/ui/tooltip";

  // Activity + completion sources (local-first)
  import { formatLocalDate } from "$lib/utils/date";
  import { getAppOpenHistory, sessionStore } from "$lib/utils/tracking";

  // Props
  const { numDays = 30 } = $props<{ numDays?: number }>();

  // Local state
  let loading = $state(true);
  let activityDays: DayStatus[] = $state([]);
  let activeDates = new SvelteSet<string>();
  let sessionStartDate: string | null = $state(null);

  // Day model for the bar row
  interface DayStatus {
    date: string; // YYYY-MM-DD
    status: "active" | "inactive" | "pre-registration";
    isToday: boolean;
  }

  /**
   * Load activity metadata and completions from local DB/stores.
   * This function is local-first and avoids triggering server sync here.
   */
  async function loadActivity() {
    loading = true;
    try {
      // Ensure we derive session metadata if present; avoid forcing any sync here

      // Derive the session start date if present
      const session = $sessionStore;
      if (session?.createdAt) {
        const created = new SvelteDate(session.createdAt);
        sessionStartDate = formatLocalDate(created);
      }

      // Read full app-open history from local storage
      const history = await getAppOpenHistory();
      const newActiveDates = new SvelteSet(
        (history ?? []).map((ts) => formatLocalDate(new SvelteDate(ts)))
      );

      // Always mark today as active for visualization
      newActiveDates.add(formatLocalDate(new SvelteDate()));
      activeDates = newActiveDates;

      // Generate the day bars
      generateActivityDays();
    } catch (err) {
      console.error("[ActivityCalendar] loadActivity failed:", err);
    } finally {
      loading = false;
    }
  }

  /**
   * Compute the day-by-day status model for the last `numDays`.
   */
  function generateActivityDays() {
    const today = new SvelteDate();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatLocalDate(today);

    const days: DayStatus[] = [];
    for (let i = 0; i < numDays; i++) {
      const d = new SvelteDate(today);
      d.setDate(today.getDate() - i);
      const dStr = formatLocalDate(d);

      const isToday = dStr === todayStr;
      const inSession = !sessionStartDate || dStr >= sessionStartDate;
      const isActive = activeDates.has(dStr);
      let status: DayStatus["status"]; // derive status
      if (!inSession) status = "pre-registration";
      else if (isActive) status = "active";
      else status = "inactive";

      days.push({ date: dStr, status, isToday });
    }

    activityDays = days.reverse();
  }

  // Refresh the activity days whenever active dates are updated and not loading
  $effect(() => {
    if (!loading && activeDates.size > 0) {
      generateActivityDays();
    }
  });

  onMount(loadActivity);
</script>

<!--
  Presentation: mimic a calendar group section (title + card row) similar to
  `dashboard-calendars.svelte` but without any DnD affordances.
-->
<Tooltip.Provider>
  <!-- 
    Main container mimics a habit row from dashboard-calendars.svelte.
    It's a single flex row with title/logo on the left and activity bars on the right.
  -->
  <div class="bg-card flex items-center justify-between gap-4 rounded-lg p-2 shadow-sm">
    <!-- Left side: Logo and Title -->
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <!-- Logo container -->
      <div class="flex h-8 w-8 shrink-0 items-center justify-center">
        <img src="/logo.svg" alt="Habistat" class="h-8 w-8" />
      </div>

      <!-- Title text -->
      <div class="nunito-header min-w-0 flex-1 truncate text-left text-xl font-semibold">
        Activity
      </div>
    </div>

    <!-- Right side: Activity bars -->
    <div class="flex shrink-0 flex-row items-center">
      {#if loading}
        <!-- Loading state: pulse animation for bars -->
        <div class="flex space-x-0.5 p-0.5">
          {#each Array(numDays), i (i)}
            <div class="bg-secondary rounded-text-xl h-6 w-[10px] animate-pulse"></div>
          {/each}
        </div>
      {:else}
        <!-- Activity bars display -->
        <div class="flex space-x-0.5 p-0.5" aria-label="Activity bars">
          {#each activityDays as day (day.date)}
            <Tooltip.Root>
              <Tooltip.Trigger>
                <div
                  class="h-6 w-[10px] rounded-lg"
                  class:activity-bar-green={day.status === "active"}
                  class:activity-bar-green-half={false}
                  class:activity-bar-red={day.status === "inactive"}
                  class:bg-secondary={day.status === "pre-registration"}
                  aria-label={`Activity for ${day.date}: ${day.status}${day.isToday ? " (Today)" : ""}`}
                ></div>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <div class="text-center">
                  <div>{day.date}{day.isToday ? " (Today)" : ""} - {day.status}</div>
                </div>
              </Tooltip.Content>
            </Tooltip.Root>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</Tooltip.Provider>

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
