<script lang="ts">
  /**
   * Activity Monitor Component
   * -----------------------------------
   * Displays a visual overview of user activity over the past N days.
   * Each bar represents a day: green for active, red for inactive, gray for pre-registration (before tracking started).
   * Used to give users a quick glance at their recent app usage.
   *
   * Props:
   * - activeDates: Set<string> of 'YYYY-MM-DD' dates when user was active
   * - numDays: number of days to show (default 30)
   * - sessionStartDate: optional 'YYYY-MM-DD' string, first day of tracking
   */
  import { ScrollArea } from "$lib/components/ui/scroll-area";

  let {
    activeDates = $bindable(new Set<string>()), // Set of 'YYYY-MM-DD' strings
    numDays = 30, // Number of past days to display including current
    sessionStartDate = null // Optional 'YYYY-MM-DD' string for the start of tracking
  }: {
    activeDates?: Set<string>;
    numDays?: number;
    sessionStartDate?: string | null;
  } = $props();

  /**
   * Formats a Date object as 'YYYY-MM-DD'.
   * Used for consistent date string comparison.
   */
  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Represents the status of a single day in the activity bar.
   */
  interface DayStatus {
    date: string; // YYYY-MM-DD
    status: "active" | "inactive" | "pre-registration";
    isToday: boolean;
  }

  // Array of day statuses for rendering the activity bars
  let activityDays: DayStatus[] = $state([]);

  /**
   * Generates the activity data for the past numDays.
   * Each day is marked as active, inactive, or pre-registration.
   * Most recent day is left-most in the bar.
   */
  function generateActivityData() {
    const days: DayStatus[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date
    const todayStr = formatDate(today);
    const sessionStart = sessionStartDate ? new Date(sessionStartDate + "T00:00:00") : null;
    if (sessionStart) sessionStart.setHours(0, 0, 0, 0); // Normalize session start date

    for (let i = numDays - 1; i >= 0; i--) {
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      currentDate.setDate(today.getDate() - i); // Go back i days from today

      const currentDateStr = formatDate(currentDate);
      let status: "active" | "inactive" | "pre-registration";
      const isToday = currentDateStr === todayStr;

      // Determine the status for this day
      if (sessionStart && currentDate < sessionStart) {
        status = "pre-registration";
      } else if (activeDates.has(currentDateStr)) {
        status = "active";
      } else {
        status = "inactive";
      }

      days.push({ date: currentDateStr, status, isToday });
    }
    // Reverse days so the newest is first (left-most)
    activityDays = days.reverse();
  }

  // Regenerate data when props change
  $effect(() => {
    // Ensure activeDates is a Set before generating
    if (activeDates instanceof Set) {
      generateActivityData();
    }
  });
</script>

<!-- Activity Monitor UI -->
<div class="bg-card max-w-[320px] rounded-md border p-2" aria-label="Activity Monitor Overview">
  <!-- Heading -->
  <div class="mb-2 flex items-center justify-between">
    <span class="text-base font-semibold">Activity Overview</span>
    <span class="text-muted-foreground text-xs">Last {numDays} days</span>
  </div>

  <!-- Activity Bars -->
  <div class="flex space-x-0.5 p-0.5" aria-label="Activity bars">
    {#each activityDays as day (day.date)}
      <div
        class="h-6 w-2 rounded"
        class:activity-bar-green={day.status === "active"}
        class:activity-bar-red={day.status === "inactive"}
        class:bg-secondary={day.status === "pre-registration"}
        aria-label={`Activity for ${day.date}: ${day.status}${day.isToday ? " (Today)" : ""}`}
        title={`${day.date}${day.isToday ? " (Today)" : ""} - ${day.status}`}
      >
        <!-- Bar content is empty; color indicates status -->
      </div>
    {/each}
  </div>

  <!-- Legend for color meanings -->
  <div class="text-muted-foreground mt-3 flex flex-row items-center justify-between text-xs">
    <div class="flex items-center space-x-1">
      <span class="activity-bar-green border-border inline-block h-3 w-3 rounded border"></span>
      <span>Active</span>
    </div>
    <div class="flex items-center space-x-1">
      <span class="activity-bar-red border-border inline-block h-3 w-3 rounded border"></span>
      <span>Inactive</span>
    </div>
    <div class="flex items-center space-x-1">
      <span class="bg-secondary border-border inline-block h-3 w-3 rounded border"></span>
      <span>Pre-registration</span>
    </div>
  </div>
</div>

<style>
  /*
  Custom gradient and hover styles for activity bars using project CSS variables.
  - Green: Uses --primary for active days, with a lighter highlight at the top using color-mix.
  - Red: Uses --destructive for inactive days, with a lighter highlight at the top using color-mix.
  - Both have smooth hover transitions and a scale effect.
  - This approach ensures theme consistency and supports dark mode.
*/
  .activity-bar-green {
    background: linear-gradient(
      to bottom,
      color-mix(in oklab, var(--primary), white 70%) 0%,
      /* highlight */ var(--primary) 20%,
      color-mix(in oklab, var(--primary), black 20%) 100% /* base shadow */
    );
    transition:
      /* box-shadow 0.2s, */
      transform 0.2s,
      background 0.2s;
  }
  .activity-bar-green:hover {
    background: linear-gradient(
      to bottom,
      color-mix(in oklab, var(--primary), white 85%) 0%,
      color-mix(in oklab, var(--primary), white 40%) 20%,
      var(--primary) 100%
    );
    /* box-shadow: 0 0 8px 2px color-mix(in oklab, var(--primary), white 40%); */
    /* transform: scaleY(1.15); */
  }

  .activity-bar-red {
    background: linear-gradient(
      to bottom,
      color-mix(in oklab, var(--destructive), white 70%) 0%,
      /* highlight */ var(--destructive) 20%,
      color-mix(in oklab, var(--destructive), black 20%) 100% /* base shadow */
    );
    transition:
      box-shadow 0.2s,
      transform 0.2s,
      background 0.2s;
  }
  .activity-bar-red:hover {
    background: linear-gradient(
      to bottom,
      color-mix(in oklab, var(--destructive), white 85%) 0%,
      color-mix(in oklab, var(--destructive), white 40%) 20%,
      var(--destructive) 100%
    );
    /* box-shadow: 0 0 8px 2px color-mix(in oklab, var(--destructive), white 40%); */
    /* transform: scaleY(1.15); */
  }
</style>
