<!-- /**
  * Hybrid Dashboard (Temporary: dashboard-new)
  *
  * Combines the Activity Monitor and the habits dashboard into a single view:
  * - Activity Monitor appears at the very top, styled with its own theme
  *   and intentionally NOT part of any drag-and-drop zone
  * - Below it, the existing calendars/habits list with full DnD behavior
  * - Includes the "New Calendar" flow and keeps data local-first
  * - Uses the same stores as the original dashboard, so state persists locally
  *
  * Notes on design/behavior:
  * - We deliberately render <ActivityMonitor /> outside of the calendar dnd-zone
  *   defined in `src/lib/components/dashboard-calendars.svelte`, so it's undraggable.
  * - Data refresh uses `useDashboardData()` which loads from local stores (SQLite)
  *   and does not trigger server syncs on every refresh.
  */ -->

<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import ActivityCalendar from "$lib/components/activity-calendar.svelte";
  import DashboardMainPanel from "$lib/components/dashboard-main-panel.svelte";
  import SampleDataGenerator from "$lib/components/sample-data-generator.svelte";
  import TierLimitGuard from "$lib/components/tier-limit-guard.svelte";

  // UI
  import { Button } from "$lib/components/ui/button";
  import * as Tooltip from "$lib/components/ui/tooltip";

  // Data / hooks
  import { useDashboardData } from "$lib/hooks/use-dashboard-data.svelte";
  import { calendarsStore } from "$lib/stores/calendars";

  // Simple local state
  let isReorderMode = $state(false);
  let activityMonitorKey = $state(0); // used to force-remount when generating sample data

  // Dashboard data hook (local-first refresh)
  const { loading, initialize, refreshData } = useDashboardData();

  // Derived: sorted calendars for empty state check
  const calendars = $derived(
    [...($calendarsStore ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  );

  // Lifecycle: only load local data; no server sync triggered here
  onMount(async () => {
    await initialize();
  });

  // Navigation
  function openCreateDialog() {
    goto("/dashboard/new");
  }

  // When sample data is generated, refresh from local stores and remount activity monitor
  async function handleDataGenerated() {
    try {
      await refreshData();
      activityMonitorKey++;
    } catch (error) {
      console.error("[dashboard-new] post-sample refresh failed:", error);
    }
  }
</script>

<!-- Top action: New Calendar button -->
<div class="flex justify-center pb-4">
  <TierLimitGuard type="calendars">
    <Button size="lg" onclick={openCreateDialog} class="btn-3d">New Calendar</Button>
  </TierLimitGuard>
</div>

<Tooltip.Provider>
  {#if loading()}
    <!-- Loading state: local-first store initialization -->
    <div class="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
      <div class="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
        <div
          class="border-t-primary border-b-secondary h-8 w-8 animate-spin rounded-full border-t-4 border-b-4"
        ></div>
      </div>
      <p class="text-muted-foreground">Loading...</p>
    </div>
  {:else}
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-6 px-2 sm:px-4">
      <!--
        Activity Monitor as the "top calendar" (non-draggable)
        - We wrap in a keyed block so we can remount on data generation
        - Styling/theme is the component's own (not calendar theme)
      -->
      {#key activityMonitorKey}
        <div class="flex w-full justify-center">
          <ActivityCalendar />
        </div>
      {/key}

      {#if calendars.length === 0}
        <!-- Empty state with CTA and sample data generator -->
        <div class="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
          <p class="text-muted-foreground">No calendars yet. Create one to get started!</p>
          <div class="mt-2 flex justify-center gap-2">
            <SampleDataGenerator ondatagenerated={handleDataGenerated} />
          </div>
        </div>
      {/if}

      <!--
        Existing calendars/habits list with full DnD behavior and toggle in header.
        We reuse `DashboardMainPanel` (which includes the reorder toggle and
        renders `DashboardCalendars`) to keep DnD logic intact and reactive.
      -->
      <DashboardMainPanel bind:isReorderMode />
    </div>
  {/if}
</Tooltip.Provider>
