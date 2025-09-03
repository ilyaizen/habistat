<script lang="ts">
  import { SvelteDate, SvelteMap } from "svelte/reactivity";
  import type { Completion } from "$lib/stores/completions";
  // Render history by local day to match dashboard counters and local DB semantics
  import { formatLocalDate } from "$lib/utils/date";
  import { colorNameToCss } from "$lib/utils/colors";
  import DayBar from "$lib/components/habit-history-day-bar.svelte";
  import { settings } from "$lib/stores/settings";

  // import * as Tooltip from "$lib/components/ui/tooltip";

  let {
    completions = [],
    // Default to our standard fallback OKLCH color (indigo-500 equivalent)
    calendarColor = colorNameToCss("indigo"),
    numDays = 30 // Default to 30 days for a slimmer look
  } = $props<{
    completions: Completion[];
    calendarColor: string;
    numDays?: number;
  }>();

  // Data contract emitted to the view loop. Each item is a single day bar.
  interface DayBarData {
    date: string; // Local date string (YYYY-MM-DD)
    count: number; // Completions count that day
    colorLight: string; // Light theme color for the bar
    colorDark: string; // Dark theme color for the bar
    isToday: boolean; // Helpful for a11y context
    weekStart: boolean; // Marks the start of the week for dashed divider
  }

  // Compute 5-level shades for both light and dark themes using color-mix in oklab space.
  // We generate both and let CSS @media (prefers-color-scheme) decide at render time
  // inside the child component. This keeps parent logic purely data-driven.
  //
  // Light theme ramp (reversed per request): darker colors correspond to higher levels
  // so that more completions render darker bars on light backgrounds.
  function shadeForLight(base: string, level: number): string {
    const idx = Math.max(0, Math.min(level, 4));
    // Progression (reversed): darkest -> darker -> base -> lighter -> lightest
    const mixes = ["black 30%", "black 15%", "transparent 0%", "white 15%", "white 30%"];
    if (idx === 2) return base; // ensure true base at midpoint
    return `color-mix(in oklab, ${base}, ${mixes[idx]})`;
  }

  function shadeForDark(base: string, level: number): string {
    const idx = Math.max(0, Math.min(level, 4));
    // Dark theme should start dark at low counts and get lighter as counts increase.
    // Our level mapping goes 4 (low count) -> 0 (high count), so arrange the ramp so
    // idx 4 is darkest and idx 0 is lightest.
    const mixes = ["white 30%", "white 15%", "transparent 0%", "black 15%", "black 30%"];
    if (idx === 2) return base; // ensure true base at midpoint
    return `color-mix(in oklab, ${base}, ${mixes[idx]})`;
  }

  // Build the last N days, folding completions by local day boundary.
  const days = $derived(() => {
    const today = new SvelteDate();
    const todayStr = formatLocalDate(today);
    const items: DayBarData[] = [];

    const completionsByDate = new SvelteMap<string, number>();
    for (const completion of completions) {
      const dateStr = formatLocalDate(new SvelteDate(completion.completedAt));
      completionsByDate.set(dateStr, (completionsByDate.get(dateStr) ?? 0) + 1);
    }

    for (let i = numDays - 1; i >= 0; i--) {
      const date = new SvelteDate();
      date.setDate(today.getDate() - i);
      const dateStr = formatLocalDate(date);
      const count = completionsByDate.get(dateStr) ?? 0;

      // Map completions to an intensity level where higher counts become darker on light theme.
      // We reverse the level so that larger counts pick darker entries from the reversed ramp.
      const rawLevel = Math.min(Math.max(count - 1, 0), 4);
      const level = 4 - rawLevel;
      const transparent = "var(--muted-foreground-transparent)";
      const colorLight = count > 0 ? shadeForLight(calendarColor, level) : transparent;
      const colorDark = count > 0 ? shadeForDark(calendarColor, level) : transparent;

      const dow = date.getDay(); // 0=Sun .. 6=Sat (local)
      // Week start marker: Sunday when weekStartsOn=sunday, Monday when weekStartsOn=monday
      const weekStart = $settings.weekStartsOn === "sunday" ? dow === 0 : dow === 1;

      items.push({
        date: dateStr,
        count,
        colorLight,
        colorDark,
        isToday: dateStr === todayStr,
        weekStart
      });
    }
    return items;
  });
</script>

<div class="flex items-center gap-0.5">
  <!-- Single horizontally scrolling row of daily bars (last {numDays} days) -->
  {#each days() as d (d.date)}
    <div class={$settings.showWeekStartMarkers && d.weekStart ? "week-start-marker" : ""}>
      <DayBar
        date={d.date}
        count={d.count}
        colorLight={d.colorLight}
        colorDark={d.colorDark}
        isToday={d.isToday}
      />
    </div>
  {/each}
</div>
