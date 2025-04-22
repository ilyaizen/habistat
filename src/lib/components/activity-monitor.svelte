<script lang="ts">
  let {
    activeDates = $bindable(new Set<string>()), // Set of 'YYYY-MM-DD' strings
    numDays = 60, // Number of past days to display including current
    sessionStartDate = null // Optional 'YYYY-MM-DD' string for the start of tracking
  }: {
    activeDates?: Set<string>;
    numDays?: number;
    sessionStartDate?: string | null;
  } = $props();

  // Helper function to format date as YYYY-MM-DD
  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  interface DayStatus {
    date: string; // YYYY-MM-DD
    status: "active" | "inactive" | "pre-registration";
    isToday: boolean;
  }

  let activityDays: DayStatus[] = $state([]);

  function generateActivityData() {
    const days: DayStatus[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date
    const todayStr = formatDate(today);
    const sessionStart = sessionStartDate ? new Date(sessionStartDate + "T00:00:00") : null;
    if (sessionStart) sessionStart.setHours(0, 0, 0, 0); // Normalize session start date

    for (let i = 0; i < numDays; i++) {
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      currentDate.setDate(today.getDate() - i); // Go back i days from today

      const currentDateStr = formatDate(currentDate);
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
    // Reverse days so the oldest is first (left-most)
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

<div class="bg-card flex space-x-px overflow-x-auto rounded border p-2">
  {#each activityDays as day (day.date)}
    <div
      class="activity-bar h-8 w-2 flex-shrink-0 rounded-sm"
      class:bg-green-500={day.status === "active"}
      class:bg-red-500={day.status === "inactive"}
      class:bg-secondary={day.status === "pre-registration"}
      title={`${day.date}${day.isToday ? " (Today)" : ""} - ${day.status}`}
    >
      <!-- Bar content can be empty -->
    </div>
  {/each}
</div>

<style>
  .activity-bar {
    transition: transform 0.1s ease-in-out;
  }
  .activity-bar:hover {
    transform: scaleY(1.1); /* Slightly enlarge bar on hover */
  }
</style>
