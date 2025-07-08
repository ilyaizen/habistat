<script lang="ts">
  import ActivityMonitor from "$lib/components/activity-monitor.svelte";
  import { Switch } from "$lib/components/ui/switch";
  import { ArrowUpDown } from "@lucide/svelte";
  import VirtualGarden from "$lib/components/virtual-garden.svelte";

  let {
    isReorderMode = $bindable(),
    activityMonitorKey = 0
  }: { isReorderMode: boolean; activityMonitorKey?: number } = $props();
</script>

<div class="mb-6 flex w-full flex-row items-start justify-between">
  <div class="flex flex-col items-start justify-center">
    <h1 class="mb-4 text-2xl font-bold">Habits</h1>
    <p class="text-muted-foreground mb-8">
      This is the main dashboard for user calendars and habits.
    </p>
  </div>
  <div class="flex flex-col items-end justify-center gap-4">
    {#key activityMonitorKey}
      <ActivityMonitor />
    {/key}
    <!-- TODO: 2025-07-07 - Add virtual garden back in when we have a better way to handle the canvas -->
    <!-- <VirtualGarden /> -->
  </div>
</div>

<div class="mb-4 flex justify-end gap-2">
  <ArrowUpDown class="text-muted-foreground h-4 w-4" />
  <Switch bind:checked={isReorderMode} aria-label="Toggle reorder mode" />
</div>
