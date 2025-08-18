<script lang="ts">
  import { SvelteDate, SvelteMap } from "svelte/reactivity";
  import type { Completion } from "$lib/stores/completions";
  // Render history by local day to match dashboard counters and local DB semantics
  import { formatLocalDate } from "$lib/utils/date";
  import { colorNameToCss } from "$lib/utils/colors";

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

  interface DaySquare {
    date: string;
    count: number;
    color: string;
    colorDark: string;
    isToday: boolean;
  }

  // Compute 5-level shades for both light and dark themes using color-mix in oklab space.
  // We emit both and let CSS @media (prefers-color-scheme) pick which to display.
  function shadeForLight(base: string, level: number): string {
    const idx = Math.max(0, Math.min(level, 4));
    // Progression: very light -> light -> base -> darker -> darkest (very pronounced)
    const mixes = ["white 30%", "white 15%", "transparent 0%", "black 15%", "black 30%"];
    if (idx === 2) return base; // ensure true base at midpoint
    return `color-mix(in oklab, ${base}, ${mixes[idx]})`;
  }

  function shadeForDark(base: string, level: number): string {
    const idx = Math.max(0, Math.min(level, 4));
    // Reverse: darkest -> darker -> base -> lighter -> lightest (very pronounced)
    const mixes = ["black 30%", "black 15%", "transparent 0%", "white 15%", "white 30%"];
    if (idx === 2) return base; // ensure true base at midpoint
    return `color-mix(in oklab, ${base}, ${mixes[idx]})`;
  }

  const days = $derived(() => {
    const today = new SvelteDate();
    const todayStr = formatLocalDate(today);
    const squares: DaySquare[] = [];

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

      const level = Math.min(Math.max(count - 1, 0), 4);
      const colorLight =
        count > 0 ? shadeForLight(calendarColor, level) : "var(--muted-foreground-transparent)";
      const colorDark =
        count > 0 ? shadeForDark(calendarColor, level) : "var(--muted-foreground-transparent)";

      squares.push({
        date: dateStr,
        count,
        // store the light color by default; CSS will swap via media query
        color: colorLight,
        colorDark,
        isToday: dateStr === todayStr
      });
    }
    return squares;
  });
</script>

<div class="flex items-center gap-0.5">
  <!-- TODO: 2025-07-05 - Add title="Last {numDays} days of activity" if needed -->
  <!-- <div class="flex items-center gap-0.5" title="Last {numDays} days of activity"> -->
  {#each days() as day (day.date)}
    <div
      class="day-square h-6 w-[10px] rounded-lg"
      style="--day-color-light: {day.color}; --day-color-dark: {day.colorDark};"
      class:active={day.count > 0}
      aria-label={`Completions for ${day.date}: ${day.count}${day.isToday ? " (Today)" : ""}`}
      title={`${day.date}${day.isToday ? " (Today)" : ""} - ${day.count} completion${day.count === 1 ? "" : "s"}`}
    ></div>
  {/each}
</div>

<style>
  :root {
    --muted-foreground-transparent: color-mix(in srgb, var(--muted-foreground), transparent 90%);
  }

  .day-square {
    /* default to light theme variable; override in dark mode */
    --day-color: var(--day-color-light);
    background-color: var(--day-color);
    transition:
      transform 0.2s,
      background 0.2s;
  }

  .day-square.active {
    background: linear-gradient(
      to bottom,
      color-mix(in oklab, var(--day-color), white 20%) 0%,
      var(--day-color) 50%,
      color-mix(in oklab, var(--day-color), black 10%) 100%
    );
  }

  @media (prefers-color-scheme: dark) {
    .day-square {
      --day-color: var(--day-color-dark);
    }
  }
</style>
