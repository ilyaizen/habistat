<!-- src/lib/components/dashboard-main-panel.svelte -->
<script lang="ts">
  import { Switch } from "$lib/components/ui/switch";
  import { ArrowUpDown } from "@lucide/svelte";
  import { Tooltip, TooltipTrigger, TooltipContent } from "$lib/components/ui/tooltip";
  import DashboardCalendars from "$lib/components/dashboard-calendars.svelte";

  let { isReorderMode = $bindable() }: { isReorderMode: boolean } = $props();
</script>

<div class="flex flex-col gap-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">Habits</h1>
    <Tooltip>
      <TooltipTrigger>
        <div class="flex items-center gap-2">
          <ArrowUpDown class="text-muted-foreground block h-4 w-4" />
          <Switch bind:checked={isReorderMode} aria-label="Toggle reorder mode" />
        </div>
      </TooltipTrigger>
      <TooltipContent>Toggle reorder mode</TooltipContent>
    </Tooltip>
  </div>
  <DashboardCalendars {isReorderMode} />
</div>
