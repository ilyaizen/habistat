<script lang="ts">
  import { SvelteDate, SvelteMap } from "svelte/reactivity";
  import type { Completion } from "$lib/stores/completions";
  import { formatDate } from "$lib/utils/date";
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
    isToday: boolean;
  }

  // Compute a 5-level shade using CSS color-mix in oklab space from the base calendar color.
  // This works with OKLCH strings (Tailwind v4 style) and hex fallbacks.
  function shadeFor(base: string, level: number): string {
    const idx = Math.max(0, Math.min(level, 4));
    // Lighter to darker progression across 5 levels
    const mixes = ["white 35%", "white 25%", "white 15%", "white 5%", "black 10%"];
    return `color-mix(in oklab, ${base}, ${mixes[idx]})`;
  }

  const days = $derived(() => {
    const today = new SvelteDate();
    const todayStr = formatDate(today);
    const squares: DaySquare[] = [];

    const completionsByDate = new SvelteMap<string, number>();
    for (const completion of completions) {
      const dateStr = formatDate(new SvelteDate(completion.completedAt));
      completionsByDate.set(dateStr, (completionsByDate.get(dateStr) ?? 0) + 1);
    }

    for (let i = numDays - 1; i >= 0; i--) {
      const date = new SvelteDate();
      date.setDate(today.getDate() - i);
      const dateStr = formatDate(date);
      const count = completionsByDate.get(dateStr) ?? 0;

      let color = "var(--muted-foreground-transparent)";
      if (count > 0) color = shadeFor(calendarColor, Math.min(count - 1, 4));

      squares.push({
        date: dateStr,
        count,
        color,
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
      style="--day-color: {day.color};"
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
</style>
