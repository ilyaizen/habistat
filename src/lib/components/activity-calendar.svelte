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
  import { IsMobile } from "$lib/hooks/is-mobile";
  import { getDefaultHistoryDays } from "$lib/constants/ui";

  // Activity + completion sources (local-first)
  import { formatLocalDate } from "$lib/utils/date";
  import { getAppOpenHistory, sessionStore } from "$lib/utils/tracking";
  import { completionsStore, getCompletionCountForDate } from "$lib/stores/completions";
  import { settings } from "$lib/stores/settings";

  // Props
  // If parent doesn't pass numDays, we fall back to a mobile‑reactive default
  const { numDays } = $props<{ numDays?: number }>();

  // Mobile-aware day count: 30 on mobile, 90 otherwise, unless explicitly overridden by prop
  const isMobile = new IsMobile();
  const computedNumDays = $derived(numDays ?? getDefaultHistoryDays(isMobile.current));

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
    weekStart: boolean; // marks start of a week (Sunday/Monday per settings)
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
    for (let i = 0; i < computedNumDays; i++) {
      const d = new SvelteDate(today);
      d.setDate(today.getDate() - i);
      const dStr = formatLocalDate(d);

      const isToday = dStr === todayStr;
      const inSession = !sessionStartDate || dStr >= sessionStartDate;
      const isActive = activeDates.has(dStr);
      const completionCount = getCompletionCount(dStr) ?? 0;
      const dow = d.getDay(); // 0=Sun..6=Sat (local)
      const weekStart = $settings.weekStartsOn === "sunday" ? dow === 0 : dow === 1;
      let status: DayStatus["status"]; // derive status
      if (!inSession) status = "pre-registration";
      else if (isActive) status = "active";
      else status = "inactive";

      days.push({ date: dStr, status, isToday, completionCount, weekStart });
    }

    activityDays = days.reverse();
  }

  // Refresh the activity days whenever active dates are updated and not loading
  $effect(() => {
    if (!loading && activeDates.size > 0) {
      generateActivityDays();
    }
  });

  // Recompute markers when the user's week start preference changes
  $effect(() => {
    // Access store to establish dependency. Do NOT read activityDays here,
    // otherwise updating it inside generateActivityDays() will re-trigger
    // this effect and create a reactive loop.
    const _weekStartsOn = $settings.weekStartsOn;
    if (!loading) generateActivityDays();
  });

  // Regenerate when day count changes (e.g., on mobile ↔ desktop transitions)
  $effect(() => {
    const _n = computedNumDays;
    if (!loading) generateActivityDays();
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
  <div class="activity-container relative w-full pr-2">
    <!-- Under-layer: bars fill available width and align to inline-end, truncating under overlay -->
    <div class="flex w-full items-center gap-4 overflow-hidden">
      <div class="flex-1 overflow-hidden">
        <div class="history-justify flex justify-end overflow-hidden">
          {#if loading}
            <!-- Loading state: pulse animation for bars -->
            <div class="flex space-x-0.5 p-0.5">
              {#each Array(computedNumDays), i (i)}
                <div class="bg-secondary rounded-text-xl h-6 w-[10px] animate-pulse"></div>
              {/each}
            </div>
          {:else}
            <!-- Activity bars display -->
            <div class="flex space-x-0.5 p-0.5 pr-16" aria-label="Activity bars">
              {#each activityDays as day (day.date)}
                <div
                  class={$settings.showWeekStartMarkers && day.weekStart
                    ? "week-start-marker h-6"
                    : "h-6"}
                  aria-label={`Activity for ${day.date}: ${day.status}${day.isToday ? " (Today)" : ""} - ${day.completionCount} completions`}
                >
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <div
                        class="h-6 w-[10px] rounded-lg"
                        class:activity-bar-green={day.status === "active" &&
                          day.completionCount > 0}
                        class:activity-bar-green-half={day.status === "active" &&
                          day.completionCount === 0}
                        class:activity-bar-red={day.status === "inactive"}
                        class:activity-bar-empty={day.status === "pre-registration"}
                      ></div>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <div class="text-center">
                        <div>{day.date}{day.isToday ? " (Today)" : ""} - {day.status}</div>
                        <div>Completions: {day.completionCount}</div>
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
      <!-- Spacer to keep end alignment consistent (no controls here) -->
      <div class="w-0 shrink-0"></div>
    </div>

    <!-- Overlay: logo + title on solid background with LTR/RTL gradient fade hiding bars underneath -->
    <div
      class="title-overlay pointer-events-none absolute inset-y-0 left-0 z-40 flex items-center gap-0"
    >
      <!-- Title group: logo + text, no truncation -->
      <div class="flex items-center gap-2">
        <div class="flex h-10 w-10 items-center justify-center">
          <img src="/logo.svg" alt="Habistat Logo" class="h-8 w-8" />
        </div>
        <div class="inline-flex text-xl font-semibold">Activity Calendar</div>
      </div>
    </div>
  </div>
</Tooltip.Provider>

<style>
  /* Align bars to inline-end so today sits near the (hypothetical) control side */
  :global([dir="ltr"]) .history-justify {
    justify-content: flex-end;
  }
  :global([dir="rtl"]) .history-justify {
    justify-content: flex-start;
  }
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
  /* Critical: keep the overlay absolute and above the bars */
  .activity-container > .title-overlay {
    position: absolute;
    z-index: 40;
  }

  /* Temporarily disabled decorative background and dashed border around the
    calendar title row. Keeping this code commented for potential future reuse. */

  /* .activity-container::before {
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
  } */

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

  .activity-bar-empty {
    background-color: oklch(from var(--border) l c h / 0.2);
    transition:
      transform 0.2s,
      background 0.2s;
  }
</style>
