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
  import DashboardHeader from "$lib/components/dashboard-header.svelte";

  // --- Store Imports ---
  // Core data stores for calendars, habits, and completions
  import { calendarsStore, type Calendar } from "$lib/stores/calendars";
  import { habits as habitsStore, type Habit } from "$lib/stores/habits";
  import { completionsByHabit } from "$lib/stores/completions";

  // --- Component Imports ---
  // UI components for drag-and-drop, habit controls, and visualization
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { dndzone, type DndEvent } from "svelte-dnd-action";
  import { flip } from "svelte/animate";
  import { GripVertical } from "@lucide/svelte";
  import HabitCompletionControl from "$lib/components/habit-completion-control.svelte";
  import HabitHistoryGrid from "$lib/components/habit-history-grid.svelte";
  import { formatDate } from "$lib/utils/date";
  import { IsMobile } from "$lib/hooks/is-mobile.svelte.ts";
  import { Card } from "$lib/components/ui/card";
  import SampleDataGenerator from "$lib/components/sample-data-generator.svelte";

  // --- Data Initialization Hook ---
  // Custom hook for loading and refreshing dashboard data from stores
  const { loading, initialize, refreshData } = useDashboardData();

  // --- Mobile Detection ---
  // Reactive mobile detection for responsive UI adjustments
  const isMobile = new IsMobile();

  // --- Local State Management ---
  // Local copies of store data for optimistic UI updates during drag operations
  let localCalendars = $state<Calendar[]>([]);
  let localHabitsByCalendar = $state(new Map<string, Habit[]>());

  // Drag-and-drop state tracking
  let isHabitZoneActive = $state(false); // Prevents calendar reordering when dragging habits
  let activeHabitCalendarId = $state<string | null>(null); // Tracks which calendar's habits are being dragged

  // Component lifecycle state
  let initialized = $state(false); // Prevents duplicate initialization

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

  /**
   * Habits grouped by calendar ID and sorted by position within each calendar
   */
  const habitsByCalendar = $derived.by(() => {
    const allHabits = $habitsStore ?? [];
    const newMap = new Map<string, Habit[]>();

    // Group habits by calendar
    for (const habit of allHabits) {
      if (!habit.calendarId) continue;
      if (!newMap.has(habit.calendarId)) {
        newMap.set(habit.calendarId, []);
      }
      newMap.get(habit.calendarId)!.push(habit);
    }

    // Sort habits within each calendar by position
    for (const [key, value] of newMap.entries()) {
      newMap.set(
        key,
        value.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      );
    }
    return newMap;
  });

  /**
   * Today's completion counts per habit for quick access
   */
  const completionsTodayByHabit = $derived.by(() => {
    const todayStr = formatDate(new Date());
    const newMap = new Map<string, number>();
    const allCompletions = $completionsByHabit;

    for (const [habitId, completions] of allCompletions.entries()) {
      const todayCount = completions.filter(
        (c) => formatDate(new Date(c.completedAt)) === todayStr
      ).length;
      newMap.set(habitId, todayCount);
    }
    return newMap;
  });

  // --- Reactive Effects ---
  // Svelte 5 effects for managing component state and synchronization

  /**
   * Initialize local state when store data becomes available
   * This effect runs once when calendars are first loaded
   */
  $effect(() => {
    if (!loading() && !initialized && calendars.length > 0) {
      localCalendars = [...calendars];
      const newHabitsMap = new Map();
      for (const [key, value] of habitsByCalendar.entries()) {
        newHabitsMap.set(key, [...value]);
      }
      localHabitsByCalendar = newHabitsMap;
      initialized = true;
    }
  });

  /**
   * Sync local habit state with store when not actively dragging
   * This ensures UI consistency after external changes
   */
  $effect(() => {
    if (initialized && !isHabitZoneActive && !activeHabitCalendarId) {
      const newHabitsMap = new Map();
      for (const [key, value] of habitsByCalendar.entries()) {
        newHabitsMap.set(key, [...value]);
      }
      localHabitsByCalendar = newHabitsMap;
    }
  });

  /**
   * Reset drag states when no calendars exist
   * Prevents orphaned drag state
   */
  $effect(() => {
    if (calendars.length === 0) {
      isHabitZoneActive = false;
      activeHabitCalendarId = null;
    }
  });

  /**
   * Clean up drag states when exiting reorder mode
   * Ensures clean state transitions
   */
  $effect(() => {
    if (!isReorderMode) {
      isHabitZoneActive = false;
      activeHabitCalendarId = null;
    }
  });

  // --- Component Lifecycle ---
  /**
   * Initialize dashboard data on component mount
   */
  onMount(async () => {
    await initialize();
  });

  // --- Event Handlers ---

  /**
   * Handles calendar drag-and-drop reordering
   * Updates positions in the database for persistence
   */
  function handleCalendarDnd(e: CustomEvent<DndEvent<Calendar>>) {
    // Prevent calendar reordering when dragging habits
    if (isHabitZoneActive || activeHabitCalendarId) return;

    localCalendars = e.detail.items;

    // Update positions in database for persistence
    const updatePromises = localCalendars.map((cal, index) =>
      calendarsStore.update(cal.id, { position: index })
    );
    Promise.all(updatePromises);
  }

  /**
   * Handles habit drag-and-drop reordering within a calendar
   * Uses optimistic updates for smooth UX
   */
  function handleHabitDnd(e: CustomEvent<DndEvent<Habit>>, calendarId: string) {
    e.stopPropagation(); // Prevent calendar drag events

    const reorderedHabits = e.detail.items;
    const newMap = new Map(localHabitsByCalendar);
    newMap.set(calendarId, [...reorderedHabits]);
    localHabitsByCalendar = newMap;

    // Only persist to database on finalize (drag end)
    if (e.type === "finalize") {
      const updatePromises = reorderedHabits.map((habit, index) =>
        habitsStore.update(habit.id, { position: index })
      );
      Promise.all(updatePromises).catch(console.error);
    }
  }

  /**
   * Activates habit zone when mouse enters during reorder mode
   * Prevents calendar reordering while over habit areas
   */
  function handleHabitZoneEnter(calendarId: string) {
    if (!isReorderMode) return;
    isHabitZoneActive = true;
    activeHabitCalendarId = calendarId;
  }

  /**
   * Deactivates habit zone with slight delay to prevent flickering
   * Delay allows for smooth transitions between habit cards
   */
  function handleHabitZoneLeave() {
    if (!isReorderMode) return;
    setTimeout(() => {
      isHabitZoneActive = false;
      activeHabitCalendarId = null;
    }, 50);
  }

  /**
   * Handles habit drag start events
   * Ensures proper zone activation for drag operations
   */
  function handleHabitDragStart(calendarId: string) {
    if (!isReorderMode) return;
    isHabitZoneActive = true;
    activeHabitCalendarId = calendarId;
  }

  /**
   * Handles habit drag end events
   * Cleans up drag state after operations complete
   */
  function handleHabitDragEnd() {
    if (!isReorderMode) return;
    isHabitZoneActive = false;
    activeHabitCalendarId = null;
  }

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
      initialized = false; // Trigger re-initialization
      console.log("Dashboard refreshed after sample data generation");
    } catch (error) {
      console.error("Error refreshing dashboard after data generation:", error);
    }
  }
</script>

<!-- Main dashboard container with responsive padding -->
<Tooltip.Provider>
  <div class="container mx-auto max-w-6xl p-8">
    <!-- Header with reorder mode toggle -->
    <DashboardHeader bind:isReorderMode />

    {#if loading()}
      <!-- Loading state -->
      <div class="text-center">
        <p class="text-muted-foreground">Loading dashboard...</p>
      </div>
    {:else if calendars.length === 0}
      <!-- Empty state with action buttons -->
      <div class="text-center">
        <p class="text-muted-foreground mb-4">No calendars yet. Create one to get started!</p>
        <div class="mt-4 flex justify-center gap-2">
          <Button size="sm" onclick={openCreateDialog}>New Calendar</Button>
          <SampleDataGenerator ondatagenerated={handleDataGenerated} />
        </div>
      </div>
    {:else}
      <!-- Main calendars and habits list -->
      <!-- Drag-and-drop zone for calendar reordering with visual feedback -->
      <div
        class="flex flex-col gap-5 transition-all duration-200 ease-in-out {isReorderMode
          ? 'border-primary/30 bg-primary/10 rounded-lg border-2 border-dashed p-2'
          : 'border-2 border-transparent p-0'}"
        data-dnd-zone="calendar"
        use:dndzone={{
          items: localCalendars,
          flipDurationMs: 200,
          dragDisabled: !isReorderMode || isHabitZoneActive,
          dropTargetStyle: {},
          type: "calendar"
        }}
        onconsider={handleCalendarDnd}
        onfinalize={handleCalendarDnd}
      >
        {#each localCalendars as cal (cal.id)}
          {@const calHabits = localHabitsByCalendar.get(cal.id) ?? []}
          {@const isCalendarDisabled = cal.isEnabled === 0}

          <!-- Individual calendar container with flip animation -->
          <div animate:flip={{ duration: 200 }} data-calendar-id={cal.id}>
            <div class="flex flex-col">
              <!-- Calendar Title Section -->
              <div class="flex items-center justify-center">
                <!-- Drag handle for calendar reordering (shows only in reorder mode) -->
                <div
                  class="overflow-hidden transition-all duration-200 {isReorderMode
                    ? 'w-5 opacity-100'
                    : 'w-0 opacity-0'}"
                >
                  <GripVertical
                    class="text-muted-foreground h-5 w-5 cursor-grab hover:opacity-70 active:cursor-grabbing {isReorderMode
                      ? 'pointer-events-auto'
                      : 'pointer-events-none'}"
                    data-drag-handle="calendar"
                  />
                </div>

                <!-- Calendar name link with disabled state handling -->
                <a
                  href={isCalendarDisabled ? undefined : `/dashboard/${cal.id}`}
                  class="nunito-header mb-2 inline-block text-xl font-semibold transition-opacity hover:opacity-80 {isCalendarDisabled
                    ? 'text-muted-foreground/60 pointer-events-none opacity-60'
                    : ''}"
                  aria-disabled={isCalendarDisabled}
                  tabindex={isCalendarDisabled ? -1 : 0}
                  onclick={() => {
                    if (!isCalendarDisabled) goto(`/dashboard/${cal.id}`);
                  }}
                  onkeydown={(e: KeyboardEvent) => {
                    if (!isCalendarDisabled && (e.key === "Enter" || e.key === " ")) {
                      goto(`/dashboard/${cal.id}`);
                    }
                  }}
                >
                  {cal.name}
                </a>
              </div>

              <!-- Habits List Section -->
              <!-- Drag-and-drop zone for habit reordering within calendar -->
              <div
                class="flex flex-col gap-1"
                role="group"
                data-dnd-zone="habit"
                data-calendar-id={cal.id}
                use:dndzone={{
                  items: calHabits,
                  flipDurationMs: 200,
                  dropTargetStyle: {},
                  type: "habit",
                  morphDisabled: true,
                  dragDisabled: !isReorderMode
                }}
                onconsider={(e) => handleHabitDnd(e, cal.id)}
                onfinalize={(e) => handleHabitDnd(e, cal.id)}
                onmouseenter={() => handleHabitZoneEnter(cal.id)}
                onmouseleave={handleHabitZoneLeave}
                ondragstart={() => handleHabitDragStart(cal.id)}
                ondragend={handleHabitDragEnd}
              >
                {#if calHabits.length > 0}
                  {#each calHabits as habit (habit.id)}
                    {@const habitCompletions = $completionsByHabit.get(habit.id) ?? []}
                    {@const completionsToday = completionsTodayByHabit.get(habit.id) ?? 0}
                    {@const isHabitDisabled = habit.isEnabled === 0 || isCalendarDisabled}

                    <!-- Individual habit card with flip animation -->
                    <div animate:flip={{ duration: 200 }} data-habit-id={habit.id}>
                      <Card
                        class="bg-card flex flex-row flex-nowrap items-center justify-between gap-2 rounded-3xl border p-1 shadow-xs transition-all {isHabitDisabled
                          ? 'pointer-events-none opacity-50 grayscale'
                          : ''} {habit.isEnabled === 0 ? 'border-dashed' : 'hover:bg-card/90'}"
                        aria-disabled={isHabitDisabled}
                      >
                        <!-- Left side: Drag handle and habit name -->
                        <div class="flex min-w-0 flex-1 items-center">
                          <!-- Drag handle for habit reordering (shows only in reorder mode) -->
                          <div
                            class="overflow-hidden transition-all duration-200 {isReorderMode
                              ? 'w-5 opacity-100'
                              : 'w-0 opacity-0'}"
                          >
                            <GripVertical
                              class="text-muted-foreground/50 hover:text-muted-foreground h-5 w-5 flex-shrink-0 cursor-grab active:cursor-grabbing {isReorderMode
                                ? 'pointer-events-auto'
                                : 'pointer-events-none'}"
                              data-drag-handle="habit"
                            />
                          </div>

                          <!-- Habit name with navigation functionality -->
                          {#if habit.description}
                            <Tooltip.Root>
                              <Tooltip.Trigger>
                                {#snippet child({ props })}
                                  <div
                                    {...props}
                                    class="min-w-0 flex-1 truncate overflow-hidden font-medium whitespace-nowrap {isHabitDisabled
                                      ? 'text-muted-foreground/70'
                                      : ''}"
                                    role="button"
                                    tabindex={isHabitDisabled ? -1 : 0}
                                    onclick={() => {
                                      if (!isHabitDisabled)
                                        goto(`/dashboard/${cal.id}/${habit.id}`);
                                    }}
                                    onkeydown={(e: KeyboardEvent) => {
                                      if (
                                        !isHabitDisabled &&
                                        (e.key === "Enter" || e.key === " ")
                                      ) {
                                        goto(`/dashboard/${cal.id}/${habit.id}`);
                                      }
                                    }}
                                    aria-disabled={isHabitDisabled}
                                  >
                                    {habit.name}
                                    {#if habit.timerEnabled && habit.targetDurationSeconds && habit.targetDurationSeconds > 0}
                                      <span class="text-muted-foreground/80 ml-1"
                                        >({Math.round(habit.targetDurationSeconds / 60)}m)</span
                                      >
                                    {/if}
                                  </div>
                                {/snippet}
                              </Tooltip.Trigger>
                              <Tooltip.Content align="start">
                                <p>{habit.description}</p>
                              </Tooltip.Content>
                            </Tooltip.Root>
                          {:else}
                            <div
                              class="min-w-0 flex-1 truncate overflow-hidden font-medium whitespace-nowrap {isHabitDisabled
                                ? 'text-muted-foreground/70'
                                : ''}"
                              role="button"
                              tabindex={isHabitDisabled ? -1 : 0}
                              onclick={() => {
                                if (!isHabitDisabled) goto(`/dashboard/${cal.id}/${habit.id}`);
                              }}
                              onkeydown={(e: KeyboardEvent) => {
                                if (!isHabitDisabled && (e.key === "Enter" || e.key === " ")) {
                                  goto(`/dashboard/${cal.id}/${habit.id}`);
                                }
                              }}
                              aria-disabled={isHabitDisabled}
                            >
                              {habit.name}
                              {#if habit.timerEnabled && habit.targetDurationSeconds && habit.targetDurationSeconds > 0}
                                <span class="text-muted-foreground/80 ml-1"
                                  >({Math.round(habit.targetDurationSeconds / 60)}m)</span
                                >
                              {/if}
                            </div>
                          {/if}
                        </div>

                        <!-- Right side: History grid and completion control -->
                        <div class="flex shrink-0 flex-row items-center gap-4">
                          <!-- Visual history grid with responsive day count -->
                          <HabitHistoryGrid
                            completions={habitCompletions}
                            calendarColor={cal.colorTheme || "#3b82f6"}
                            numDays={isMobile.current ? 14 : 30}
                          />

                          <!-- Completion control button (fixed width for alignment) -->
                          <div class="flex w-16 items-center justify-end">
                            {#if !isHabitDisabled}
                              <HabitCompletionControl {habit} {completionsToday} />
                            {/if}
                          </div>
                        </div>
                      </Card>
                    </div>
                  {/each}
                {:else}
                  <!-- Empty habits state with call-to-action -->
                  <div class="text-muted-foreground p-4 text-center text-sm">
                    No habits in this calendar.
                    <Button
                      variant="link"
                      class="h-auto p-0 pl-1"
                      onclick={() => goto(`/dashboard/${cal.id}/new`)}
                      disabled={isCalendarDisabled}>Add one!</Button
                    >
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</Tooltip.Provider>
