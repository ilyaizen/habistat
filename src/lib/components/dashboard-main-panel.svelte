<!-- src/lib/components/dashboard-main-panel.svelte -->
<script lang="ts">
  import DashboardCalendars from "$lib/components/dashboard-calendars.svelte";
  // Activity calendar is a presentational card that mirrors a calendar group header
  // and must always appear above the DnD calendars list.
  import ActivityCalendar from "$lib/components/activity-calendar.svelte";
</script>

<div class="flex flex-col gap-6">
  {#if true}
    <!-- Activity calendar section (always on top, outside DnD) -->
    <ActivityCalendar />
  {/if}
  <DashboardCalendars />
</div>
