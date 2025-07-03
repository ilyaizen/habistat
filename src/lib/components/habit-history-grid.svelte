<script lang="ts">
  import type { Completion } from "$lib/stores/completions";
  import { formatDate, generateColorShades } from "$lib/utils/date";

  let {
    completions = [],
    calendarColor = "#3b82f6",
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

  let shades = $state(generateColorShades(calendarColor, 5, 8));
  let days = $state<DaySquare[]>([]);

  $effect(() => {
    shades = generateColorShades(calendarColor, 5, 8);
  });

  $effect(() => {
    const today = new Date();
    const todayStr = formatDate(today);
    const squares: DaySquare[] = [];

    const completionsByDate = new Map<string, number>();
    for (const completion of completions) {
      const dateStr = formatDate(new Date(completion.completedAt));
      completionsByDate.set(dateStr, (completionsByDate.get(dateStr) ?? 0) + 1);
    }

    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = formatDate(date);
      const count = completionsByDate.get(dateStr) ?? 0;

      let color = "var(--muted-foreground-transparent)";
      if (count > 0) {
        color = shades[Math.min(count - 1, shades.length - 1)];
      }

      squares.push({
        date: dateStr,
        count,
        color,
        isToday: dateStr === todayStr
      });
    }
    days = squares;
  });
</script>

<div class="flex items-center gap-0.5" title="Last {numDays} days of activity">
  {#each days as day (day.date)}
    <div
      class="day-square h-6 w-2 rounded border-transparent"
      style="--day-color: {day.color};"
      class:active={day.count > 0}
      class:border-primary={day.isToday}
      class:border={day.isToday}
      title="{day.date}: {day.count} completions"
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
