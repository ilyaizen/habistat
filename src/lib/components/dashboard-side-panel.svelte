<!-- src/lib/components/dashboard-side-panel.svelte -->
<script lang="ts">
  import ActivityMonitor from "$lib/components/activity-monitor.svelte";
  import VirtualGarden from "$lib/components/virtual-garden.svelte";

  let { activityMonitorKey = 0 }: { activityMonitorKey?: number } = $props();
</script>

<div class="flex flex-col items-end justify-start gap-4">
  {#key activityMonitorKey}
    <ActivityMonitor />
  {/key}
  <!-- TODO: 2025-07-12 - Add virtual garden back in when we have a better way to handle the canvas -->
  <VirtualGarden />
</div>
