<!-- src/lib/components/dashboard-main-panel.svelte -->
<script lang="ts">
  import CalendarHabits from "$lib/components/calendar-habits.svelte";
  import ActivityCalendar from "$lib/components/activity-calendar.svelte";
</script>

<div class="flex flex-col gap-8">
  <!-- Activity calendar section (always on top, outside DnD) -->
  <ActivityCalendar />
  <CalendarHabits />
</div>
