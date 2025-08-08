<!-- /**
 * Dashboard Calendars Component
 *
 * This component displays the main list of calendars and habits for the dashboard.
 * It handles all drag-and-drop reordering logic for both calendars and habits,
 * synchronizing changes with the respective data stores. It's designed to be
 * driven by Svelte stores and is responsive to data changes.
 */ -->

<script lang="ts">
  import { colorNameToCss } from "$lib/utils/colors";
  import { flip } from "svelte/animate";
  import { SvelteDate, SvelteMap } from "svelte/reactivity";
  import { type DndEvent, dndzone } from "svelte-dnd-action";
  import { goto } from "$app/navigation";
  import CalendarEditDialog from "$lib/components/calendar-edit-dialog.svelte";
  import HabitCompletionControl from "$lib/components/habit-completion-control.svelte";
  import HabitEditDialog from "$lib/components/habit-edit-dialog.svelte";
  import HabitHistoryGrid from "$lib/components/habit-history-grid.svelte";
  // --- Component Imports ---
  // UI components for drag-and-drop, habit controls, and visualization
  import Button from "$lib/components/ui/button/button.svelte";
  import { Card } from "$lib/components/ui/card";
  import { IsMobile } from "$lib/hooks/is-mobile";
  // --- Store Imports ---
  // Core data stores for calendars, habits, and completions
  import { type Calendar, calendarsStore } from "$lib/stores/calendars";
  import { completionsByHabit } from "$lib/stores/completions";
  import { type Habit, habits as habitsStore } from "$lib/stores/habits";
  // Use local-day semantics for counts so UI matches user's timezone and local DB ops
  import { formatLocalDate } from "$lib/utils/date";
  import { GripVertical } from "@lucide/svelte";

  // --- Component Props ---
  // isReorderMode is controlled by the parent component (DashboardHeader)
  let { isReorderMode } = $props<{ isReorderMode: boolean }>();

  // --- Mobile Detection ---
  // Reactive mobile detection for responsive UI adjustments
  const isMobile = new IsMobile();

  // --- Local State Management ---
  // Local copies of store data for optimistic UI updates during drag operations
  let localCalendars = $state<Calendar[]>([]);
  let localHabitsByCalendar = $state(new SvelteMap<string, Habit[]>());
  let editingHabitId = $state<string | null>(null);
  let editingCalendarId = $state<string | null>(null);
  let editingCalendarIdForDialog = $state<string | null>(null);
  let habitDialogOpen = $state(false);
  let calendarDialogOpen = $state(false);

  // Drag-and-drop state tracking
  let isCalendarDragging = $state(false); // Tracks if a calendar is being dragged
  let isHabitZoneActive = $state(false); // Prevents calendar reordering when dragging habits
  let activeHabitCalendarId = $state<string | null>(null); // Tracks which calendar's habits are being dragged

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
    const newMap = new SvelteMap<string, Habit[]>();

    // Group habits by calendar
    for (const habit of allHabits) {
      if (!habit.calendarId) continue;
      if (!newMap.has(habit.calendarId)) {
        newMap.set(habit.calendarId, []);
      }
      newMap.get(habit.calendarId)?.push(habit);
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
   * Today's completion counts per habit for quick access.
   * NOTE: Count by local day (not UTC) to align with how completions are created and
   * how "delete latest for today" works in the local SQLite layer.
   */
  const completionsTodayByHabit = $derived.by(() => {
    const todayStr = formatLocalDate(new SvelteDate());
    const newMap = new SvelteMap<string, number>();
    const allCompletions = $completionsByHabit;

    for (const [habitId, completions] of allCompletions.entries()) {
      const todayCount = completions.filter(
        (c) => formatLocalDate(new SvelteDate(c.completedAt)) === todayStr
      ).length;
      newMap.set(habitId, todayCount);
    }
    return newMap;
  });

  // --- Reactive Effects ---
  // Svelte 5 effects for managing component state and synchronization

  /**
   * Initialize or update local state when store data changes.
   * This effect runs whenever the calendars or habits stores are updated.
   */
  $effect(() => {
    localCalendars = [...calendars];
    const newHabitsMap = new SvelteMap<string, Habit[]>();
    for (const [key, value] of habitsByCalendar.entries()) {
      newHabitsMap.set(key, [...value]);
    }
    localHabitsByCalendar = newHabitsMap;
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

  // --- Event Handlers ---

  /**
   * Handles the 'finalize' event for calendar drag-and-drop.
   * This is where we commit the new order to our local state and persist it.
   */
  function handleCalendarDndFinalize(e: CustomEvent<DndEvent<Calendar>>) {
    // Prevent calendar reordering when dragging habits
    if (isHabitZoneActive || activeHabitCalendarId) return;

    // Additional guard against placeholder items from svelte-dnd-action
    if (e.detail.items.some((item) => item.id.includes("dnd-shadow-placeholder"))) {
      return;
    }

    // Update the local state to match the final dropped order
    localCalendars = e.detail.items;

    // Persist the new order to the database via the store's dedicated method.
    calendarsStore.updateOrder(e.detail.items);
  }

  /**
   * Handles the 'consider' event for calendar drag-and-drop.
   * We update the local state here to reflect the visual reordering during the drag.
   * This keeps Svelte's view of the data in sync with what svelte-dnd-action is doing
   * in the DOM, which is crucial for preventing race conditions and crashes.
   */
  function handleCalendarDndConsider(e: CustomEvent<DndEvent<Calendar>>) {
    // Update local state to show visual reordering during drag
    localCalendars = e.detail.items;
  }

  /**
   * Handles habit drag-and-drop reordering within and between calendars.
   * Uses optimistic updates for smooth UX and persists changes on finalization.
   */
  function handleHabitDnd(e: CustomEvent<DndEvent<Habit>>, calendarId: string) {
    e.stopPropagation(); // Prevent calendar drag events

    const reorderedHabits = e.detail.items;

    // Optimistic UI update: immediately reflect the new state in the local component state.
    const newMap = new SvelteMap(localHabitsByCalendar);
    newMap.set(calendarId, [...reorderedHabits]);
    localHabitsByCalendar = newMap;

    // Only persist changes to the database on the 'finalize' event (i.e., when the user drops the item).
    if (e.type === "finalize") {
      const draggedHabitId = e.detail.info.id;

      // This check determines if the current dnd-zone is the destination for the drop.
      const isDestinationZone = reorderedHabits.some((h) => h.id === draggedHabitId);

      if (isDestinationZone) {
        // This is the destination calendar.
        // We update all habits in this list with their new positions.
        // If a habit was moved from another calendar, its calendarId is also updated.
        const updatePromises = reorderedHabits.map((habit, index) => {
          if (habit.id === draggedHabitId && habit.calendarId !== calendarId) {
            // This is the dragged habit, and it has been moved to a new calendar.
            // We update its calendarId and its new position in the list.
            return habitsStore.update(habit.id, { calendarId: calendarId, position: index });
          } else {
            // This is a habit being reordered within the same calendar, or another habit in the
            // destination list that needs its position updated due to the new item.
            return habitsStore.update(habit.id, { position: index });
          }
        });
        Promise.all(updatePromises).catch(console.error);
      }
    }
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

  function openEditDialog(habit: Habit, calendarId: string) {
    if (isReorderMode) return;
    editingHabitId = habit.id;
    editingCalendarId = calendarId;
    habitDialogOpen = true;
  }

  function openCalendarEditDialog(calendarId: string) {
    if (isReorderMode) return;
    editingCalendarIdForDialog = calendarId;
    calendarDialogOpen = true;
  }
</script>

<!-- Main calendars and habits list -->
<!-- Drag-and-drop zone for calendar reordering with visual feedback -->
<div
  class="flex w-full min-w-0 flex-col gap-5 transition-all duration-200 ease-in-out {isReorderMode
    ? 'border-primary/30 bg-primary/10 rounded-lg border-2 border-dashed p-2'
    : 'border-2 border-transparent p-0'}"
  data-dnd-zone="calendar"
  role="list"
  use:dndzone={{
    items: localCalendars,
    flipDurationMs: 200,
    dragDisabled: !isReorderMode || isHabitZoneActive,
    dropTargetStyle: {},
    type: "calendar"
  }}
  onconsider={handleCalendarDndConsider}
  onfinalize={handleCalendarDndFinalize}
  ondragstart={() => (isCalendarDragging = true)}
  ondragend={() => (isCalendarDragging = false)}
>
  {#each localCalendars as cal (cal.id)}
    {@const calHabits = localHabitsByCalendar.get(cal.id) ?? []}
    {@const isCalendarDisabled = cal.isEnabled === 0}

    <!-- Individual calendar container with flip animation -->
    <div animate:flip={{ duration: 200 }} data-calendar-id={cal.id} role="listitem">
      <div class="flex flex-col">
        <!-- Calendar Title Section -->
        <div class="flex items-start">
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

          <!-- Calendar name, clickable to open edit dialog -->
          <button
            type="button"
            class="nunito-header disabled:text-muted-foreground/60 mb-2 inline-block cursor-pointer text-left text-xl font-semibold transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-60"
            disabled={isCalendarDisabled}
            onclick={() => openCalendarEditDialog(cal.id)}
          >
            {cal.name}
          </button>
        </div>

        <!-- Habits List Section -->
        <!-- Drag-and-drop zone for habit reordering within calendar -->
        <div
          class="flex flex-col gap-1"
          role="list"
          data-dnd-zone="habit"
          data-calendar-id={cal.id}
          use:dndzone={{
            items: calHabits,
            flipDurationMs: 200,
            dropTargetStyle: {},
            type: "habit",
            morphDisabled: true,
            dragDisabled: !isReorderMode || isCalendarDragging
          }}
          onconsider={(e) => handleHabitDnd(e, cal.id)}
          onfinalize={(e) => handleHabitDnd(e, cal.id)}
          ondragstart={() => handleHabitDragStart(cal.id)}
          ondragend={handleHabitDragEnd}
        >
          {#if calHabits.length > 0}
            {#each calHabits as habit (habit.id)}
              {@const habitCompletions = $completionsByHabit.get(habit.id) ?? []}
              {@const completionsToday = completionsTodayByHabit.get(habit.id) ?? 0}
              {@const isHabitDisabled = habit.isEnabled === 0 || isCalendarDisabled}

              <!-- Individual habit card with flip animation -->
              <div animate:flip={{ duration: 200 }} data-habit-id={habit.id} role="listitem">
                <Card
                  class="bg-card flex w-full min-w-0 flex-row flex-nowrap items-center justify-between gap-2 rounded-3xl border p-1 shadow-xs transition-all {isHabitDisabled
                    ? 'pointer-events-none opacity-50 grayscale'
                    : ''} {habit.isEnabled === 0 ? 'border-dashed' : 'hover:bg-card/90'}"
                  aria-disabled={isHabitDisabled}
                >
                  <!-- Left side: Drag handle and habit name -->
                  <div class="flex min-w-0 flex-1 items-center">
                    <!-- Drag handle for habit reordering (shows only in reorder mode) -->
                    <div
                      class="shrink-0 overflow-hidden transition-all duration-200 {isReorderMode
                        ? 'w-5 opacity-100'
                        : 'w-0 opacity-0'}"
                    >
                      <GripVertical
                        class="text-muted-foreground h-5 w-5 cursor-grab hover:opacity-70 active:cursor-grabbing {isReorderMode
                          ? 'pointer-events-auto'
                          : 'pointer-events-none'}"
                        data-drag-handle="habit"
                      />
                    </div>

                    <!-- Habit name with navigation functionality -->
                    <div
                      class="min-w-0 flex-1 cursor-pointer truncate overflow-hidden font-medium whitespace-nowrap {isHabitDisabled ||
                      isReorderMode
                        ? '' // text-muted-foreground/70
                        : ''}"
                      role="button"
                      tabindex={isHabitDisabled ? -1 : 0}
                      onclick={() => openEditDialog(habit, cal.id)}
                      onkeydown={(e: KeyboardEvent) => {
                        if (!isHabitDisabled && (e.key === "Enter" || e.key === " ")) {
                          openEditDialog(habit, cal.id);
                        }
                      }}
                      aria-disabled={isHabitDisabled}
                      title={habit.description ?? undefined}
                    >
                      {habit.name}
                      {#if habit.timerEnabled && habit.targetDurationSeconds && habit.targetDurationSeconds > 0}
                        <span class="text-muted-foreground/80 ml-1"
                          >({Math.round(habit.targetDurationSeconds / 60)}m)</span
                        >
                      {/if}
                    </div>
                  </div>

                  <!-- Right side: History grid and completion control -->
                  <div class="flex shrink-0 flex-row items-center gap-4">
                    <!-- Visual history grid with responsive day count -->
                    <HabitHistoryGrid
                      completions={habitCompletions}
                      calendarColor={colorNameToCss(cal.colorTheme)}
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

{#if editingHabitId && editingCalendarId}
  <HabitEditDialog
    habitId={editingHabitId}
    calendarId={editingCalendarId}
    bind:open={habitDialogOpen}
  />
{/if}

{#if editingCalendarIdForDialog}
  <CalendarEditDialog calendarId={editingCalendarIdForDialog} bind:open={calendarDialogOpen} />
{/if}
