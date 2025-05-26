<script lang="ts">
  import ActivityMonitorOld from "$lib/components/activity-monitor-old.svelte";
  import { onMount } from "svelte";
  import { sessionStore, getAppOpenHistory, logAppOpenIfNeeded } from "$lib/utils/tracking";
  import { get } from "svelte/store";

  let sessionStartDate: string | null = null;
  let activeDates: Set<string> = new Set();

  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  onMount(() => {
    // Ensure a session exists before logging app open, so anonymousUserId is valid
    sessionStore.ensure();
    // Log app open (throttled) to ensure usage history is recorded for activity monitor
    logAppOpenIfNeeded();
    const session = get(sessionStore);
    if (session?.createdAt) {
      const created = new Date(session.createdAt);
      sessionStartDate = formatDate(created);
    }
    // Get all app open history as dates
    const history = getAppOpenHistory();
    activeDates = new Set(history.map((ts) => formatDate(new Date(ts))));
  });
</script>

<div class="mx-auto max-w-2xl p-6">
  <h1 class="mb-4 text-2xl font-bold">Dashboard</h1>

  <ActivityMonitorOld {activeDates} {sessionStartDate} />

  <p class="text-muted-foreground">Your habit stats and progress will appear here soon.</p>
</div>

<!--
  Comments:
  - This is a scaffold for the dashboard main view.
  - Replace with actual dashboard content in later phases.
-->
