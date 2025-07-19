<!-- /**
 * Dashboard Page Component
 *
 * This is the main dashboard for Habistat, featuring:
 * - Calendar and habit management with drag-and-drop reordering
 * - Real-time completion tracking and history visualization
 * - Mobile-responsive design with touch-friendly controls
 * - Integration with local SQLite storage and optional cloud sync
 * - Dynamic state management using Svelte 5 runes and stores
 */ -->

<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { useDashboardData } from "$lib/hooks/use-dashboard-data.svelte.ts";
  import DashboardMainPanel from "$lib/components/dashboard-main-panel.svelte";
  import DashboardSidePanel from "$lib/components/dashboard-side-panel.svelte";

  // --- Store Imports ---
  // Core data stores for calendars
  import { calendarsStore } from "$lib/stores/calendars";

  // --- Component Imports ---
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import SampleDataGenerator from "$lib/components/sample-data-generator.svelte";

  // --- Data Initialization Hook ---
  // Custom hook for loading and refreshing dashboard data from stores
  const { loading, initialize, refreshData } = useDashboardData();

  // Add key for ActivityMonitor remount
  let activityMonitorKey = $state(0);

  // Reorder mode state (controlled by header component)
  let isReorderMode = $state(false);

  // --- Derived Store Values ---
  // Reactive computed values that automatically update when stores change

  /**
   * Sorted calendars by position for consistent ordering
   */
  const calendars = $derived(
    [...($calendarsStore ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  );

  // --- Component Lifecycle ---
  /**
   * Initialize dashboard data on component mount
   */
  onMount(async () => {
    await initialize();
  });

  // --- Event Handlers ---

  /**
   * Navigation handler for creating new calendars
   * Uses SvelteKit's programmatic navigation
   */
  function openCreateDialog() {
    goto("/dashboard/new");
  }

  /**
   * Refreshes dashboard data after sample data generation
   * Ensures UI reflects new data immediately
   */
  async function handleDataGenerated() {
    try {
      await refreshData();
      activityMonitorKey++; // Trigger re-mount for components that use it
      console.log("Dashboard refreshed after sample data generation");
    } catch (error) {
      console.error("Error refreshing dashboard after data generation:", error);
    }
  }
</script>

<!-- Main dashboard container with responsive padding -->
<Tooltip.Provider>
  {#if loading()}
    <!-- Loading state -->
    <div class="flex h-full w-full items-center justify-center text-center">
      <p class="text-muted-foreground">Loading dashboard...</p>
    </div>
  {:else if calendars.length === 0}
    <!-- Empty state with action buttons -->
    <div class="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
      <p class="text-muted-foreground">No calendars yet. Create one to get started!</p>
      <div class="mt-4 flex justify-center gap-2">
        <Button size="sm" onclick={openCreateDialog}>New Calendar</Button>
        <SampleDataGenerator ondatagenerated={handleDataGenerated} />
      </div>
    </div>
  {:else}
    <!--
      Main dashboard layout using a responsive grid.
      - On small screens (mobile), it's a single column, so panels stack vertically.
      - On large screens (lg breakpoint and up), it's a two-column grid where:
        - The main panel (1fr) takes up all available flexible space.
        - The side panel (auto) shrinks to fit the width of its content.
          (constrained by max-w-[380px] in its children)
      - `items-start` ensures panels align to the top of their grid areas.
    -->
    <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_auto]">
      <!-- Main Content Panel: Stretches to fill available space -->
      <div>
        <DashboardMainPanel bind:isReorderMode />
      </div>
      <!-- Side Panel: Takes only the width it needs -->
      <div>
        <DashboardSidePanel {activityMonitorKey} />
      </div>
    </div>

    <!-- Create New Calendar Button at Bottom -->
    <div class="flex justify-center pt-4">
      <Button size="lg" onclick={openCreateDialog} class="btn-3d">New Calendar</Button>
    </div>
  {/if}
</Tooltip.Provider>
