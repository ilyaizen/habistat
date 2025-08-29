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
  import { completionsStore, getCompletionCountForDate } from "$lib/stores/completions";

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
    completionCount: number; // number of completions for the date
  }

  /**
   * Load activity metadata and completions from local DB/stores.
   * This function is local-first and avoids triggering server sync here.
   */
  async function loadActivity() {
    loading = true;
    try {
      // Ensure we derive session metadata if present; avoid forcing any sync here

      // Refresh completions from local DB so counts are accurate (local-first)
      try {
        await completionsStore.refresh();
      } catch (e) {
        console.warn("[ActivityCalendar] completions refresh failed (continuing local-first):", e);
      }

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

    // Derived getter from store: returns (dateStr: string) => number
    const getCompletionCount = $getCompletionCountForDate;

    const days: DayStatus[] = [];
    for (let i = 0; i < numDays; i++) {
      const d = new SvelteDate(today);
      d.setDate(today.getDate() - i);
      const dStr = formatLocalDate(d);

      const isToday = dStr === todayStr;
      const inSession = !sessionStartDate || dStr >= sessionStartDate;
      const isActive = activeDates.has(dStr);
      const completionCount = getCompletionCount(dStr) ?? 0;
      let status: DayStatus["status"]; // derive status
      if (!inSession) status = "pre-registration";
      else if (isActive) status = "active";
      else status = "inactive";

      days.push({ date: dStr, status, isToday, completionCount });
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
  <div class="activity-container mr-20 flex items-center justify-between gap-4 rounded-full p-2">
    <!-- Left side: Logo and Title -->
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <!-- Logo container -->
      <div class="flex h-8 w-8 shrink-0 items-center justify-center pl-1">
        <img src="/logo.svg" alt="Habistat" class="h-6 w-6" />
      </div>

      <!-- Title text -->
      <div class="nunito-header min-w-0 flex-1 truncate pl-[6px] text-left text-xl font-semibold">
        Habistat
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
                  class:activity-bar-green={day.status === "active" && day.completionCount > 0}
                  class:activity-bar-green-half={day.status === "active" &&
                    day.completionCount === 0}
                  class:activity-bar-red={day.status === "inactive"}
                  class:bg-secondary={day.status === "pre-registration"}
                  aria-label={`Activity for ${day.date}: ${day.status}${day.isToday ? " (Today)" : ""} - ${day.completionCount} completions`}
                ></div>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <div class="text-center">
                  <div>{day.date}{day.isToday ? " (Today)" : ""} - {day.status}</div>
                  <div>Completions: {day.completionCount}</div>
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
  /*
    Apply a left-to-right fading background and dashed 2px border to the
    activity row, using the app primary color. Matches the calendar title styling.
  */
  .activity-container {
    position: relative;
  }
  .activity-container > * {
    position: relative;
    z-index: 1;
  }
  /*
    Temporarily disabled decorative background and dashed border around the
    calendar title row. Keeping this code commented for potential future reuse.

  .activity-container::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 9999px; 
    pointer-events: none;
    z-index: 0;
    background: var(--primary);
    opacity: 0.2;
    -webkit-mask-image: linear-gradient(
      90deg,
      rgba(0, 0, 0, 1) 0rem,
      rgba(0, 0, 0, 1) 4rem,
      rgba(0, 0, 0, 0) 50%
    );
    mask-image: linear-gradient(
      90deg,
      rgba(0, 0, 0, 1) 0rem,
      rgba(0, 0, 0, 1) 4rem,
      rgba(0, 0, 0, 0) 50%
    );
  }
  .activity-container::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 9999px; 
    pointer-events: none;
    z-index: 0;
    border: 2px dashed color-mix(in oklab, var(--primary) 5%, transparent);
    -webkit-mask-image: linear-gradient(
      90deg,
      rgba(0, 0, 0, 1) 0rem,
      rgba(0, 0, 0, 1) 4rem,
      rgba(0, 0, 0, 0) 50%
    );
    mask-image: linear-gradient(
      90deg,
      rgba(0, 0, 0, 1) 0rem,
      rgba(0, 0, 0, 1) 4rem,
      rgba(0, 0, 0, 0) 50%
    );
  }
  */

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
