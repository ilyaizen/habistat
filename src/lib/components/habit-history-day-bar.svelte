<script lang="ts">
  // A single day bar used in the habit history grid. Encapsulates styles and accessibility.
  // We pass in precomputed colors to keep this component pure and cheap. This avoids recomputing
  // color shades for every render and lets the parent decide the theme strategy.
  let {
    date, // Local date string like "2025-08-31"
    count = 0, // Number of completions for the day
    colorLight, // CSS color for light mode
    colorDark, // CSS color for dark mode
    isToday = false // Flag for adding subtle context in a11y labels
  } = $props<{
    date: string;
    count?: number;
    colorLight: string;
    colorDark: string;
    isToday?: boolean;
  }>();

  // Accessible labels: title is a quick native tooltip, aria-label improves SR narration.
  const label = $derived(() => `Completions for ${date}: ${count}${isToday ? " (Today)" : ""}`);
  const title = $derived(
    () => `${date}${isToday ? " (Today)" : ""} - ${count} completion${count === 1 ? "" : "s"}`
  );
</script>

<div
  class="day-bar h-6 w-[10px] rounded-lg"
  style="--day-color-light: {colorLight}; --day-color-dark: {colorDark};"
  class:active={count > 0}
  aria-label={label()}
  title={title()}
></div>

<style>
  /*
    We define the transparent-muted helper globally so it works even if this component
    is used outside the current parent. Using :global(:root) ensures no scoping attr
    is added, keeping it truly global.
  */
  :global(:root) {
    --muted-foreground-transparent: color-mix(in srgb, var(--muted-foreground), transparent 90%);
  }

  .day-bar {
    /* default to light theme variable; override in dark mode */
    --day-color: var(--day-color-light);
    background-color: var(--day-color);
    transition:
      transform 0.2s,
      background 0.2s;
  }

  /*
    Active days render a soft vertical sheen for depth. Keeping it in the leaf component
    avoids repeating gradient logic in the parent and makes tweaking easy.
  */
  .day-bar.active {
    background: linear-gradient(
      to bottom,
      color-mix(in oklab, var(--day-color), white 20%) 0%,
      var(--day-color) 50%,
      color-mix(in oklab, var(--day-color), black 10%) 100%
    );
  }

  @media (prefers-color-scheme: dark) {
    .day-bar {
      --day-color: var(--day-color-dark);
    }
  }
</style>
