<script lang="ts">
  import ActivityMonitor from "$lib/components/activity-monitor.svelte";
  import { Switch } from "$lib/components/ui/switch";
  import { ArrowUpDown } from "@lucide/svelte";

  let { isReorderMode = $bindable() }: { isReorderMode: boolean } = $props();
</script>

<div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
  <div class="flex flex-col">
    <h1 class="mb-4 text-2xl font-bold">Habits</h1>
    <p class="text-muted-foreground mb-8">
      This is the main dashboard for user calendars and habits.
    </p>
  </div>
  <div class="flex items-center gap-4">
    <ActivityMonitor />
  </div>
</div>

<div class="mb-4 flex justify-end gap-2">
  <ArrowUpDown class="text-muted-foreground h-4 w-4" />
  <Switch bind:checked={isReorderMode} aria-label="Toggle reorder mode" />
</div>
