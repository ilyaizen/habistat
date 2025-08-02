<!-- src/lib/components/dashboard-main-panel.svelte -->
<script lang="ts">
  import { ArrowUpDown } from "@lucide/svelte";
  import DashboardCalendars from "$lib/components/dashboard-calendars.svelte";
  import { Switch } from "$lib/components/ui/switch";
  import { Tooltip, TooltipContent, TooltipTrigger } from "$lib/components/ui/tooltip";

  let { isReorderMode = $bindable() }: { isReorderMode: boolean } = $props();
</script>

<div class="flex flex-col gap-6">
  <div class="flex items-center justify-between">
    <Tooltip>
      <TooltipTrigger>
        <div class="flex items-center gap-2">
          <ArrowUpDown class="text-muted-foreground block h-4 w-4" />
          <Switch bind:checked={isReorderMode} aria-label="Toggle reorder mode" />
        </div>
      </TooltipTrigger>
      <TooltipContent>Toggle reorder mode</TooltipContent>
    </Tooltip>
    <!-- <h1 class="text-2xl font-bold">Habits</h1> -->
  </div>
  <DashboardCalendars {isReorderMode} />
</div>
