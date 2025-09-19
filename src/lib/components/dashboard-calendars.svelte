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
  import HabitHistoryRow from "$lib/components/habit-history-row.svelte";
  // --- Component Imports ---
  // UI components for drag-and-drop, habit controls, and visualization
  import Button from "$lib/components/ui/button/button.svelte";
  import { IsMobile } from "$lib/hooks/is-mobile";
  // --- Store Imports ---
  // Core data stores for calendars, habits, and completions
  import { type Calendar, calendarsStore } from "$lib/stores/calendars";
  import { completionsByHabit } from "$lib/stores/completions";
  import { type Habit, habits as habitsStore } from "$lib/stores/habits";
  // Use local-day semantics for counts so UI matches user's timezone and local DB ops
  import { formatLocalDate } from "$lib/utils/date";
  import { parseHabitName, parseCalendarName } from "$lib/utils/habit-display";
  import { getDefaultHistoryDays } from "$lib/constants/ui";
  // import { GripVertical } from "@lucide/svelte";

  // --- Drag configuration ---
  // Reorder mode is always enabled, but activation requires grabbing the emoji.
  // const isReorderMode = true;

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
  let isAnyEmojiGrabbed = $state(false); // Tracks if any emoji is the drag handle to stop its animation
  let calendarDragArmed = $state(false); // Only allow calendar drag when armed via emoji pointerdown
  let habitDragArmedCalendarId = $state<string | null>(null); // Only allow habit drag in this calendar when armed
  let draggingCalendarId = $state<string | null>(null); // To stop animation only on the grabbed calendar emoji
  let draggingHabitId = $state<string | null>(null); // To stop animation only on the grabbed habit emoji

  /**
   * Build a semi-transparent OKLCH color string by injecting an alpha channel.
   * Input is expected to be an OKLCH CSS color like: "oklch(.78 .14 230)".
   * If it's not OKLCH, returns the original string to avoid breaking styles.
   */
  // function withAlpha(oklchCss: string, alpha: number): string {
  //   if (!oklchCss?.startsWith("oklch(")) return oklchCss;
  //   // Insert " / <alpha>" before the closing parenthesis per CSS Color 4 syntax
  //   return oklchCss.replace(")", ` / ${alpha})`);
  // }

  // TODO: 2025-09-01 - Uncomment to re-implement light-fading highlight for calendar titles plus a themed border
  /**
   * Right-fading highlight for calendar titles plus a themed border.
   * - Background: ~20% opacity through the emoji zone (~4rem), fading to 0% by 50% width
   * - Border: same base color, slightly higher opacity for visibility, dashed, 2px via classes
   * Returns a full CSS declaration string for inline `style`.
   */
  // function calendarTitleStyles(colorName: string | null | undefined): string {
  //   const base = colorNameToCss(colorName);
  //   const bg = `linear-gradient(90deg, ${withAlpha(base, 0.2)} 0rem, ${withAlpha(
  //     base,
  //     0.1
  //   )} 4rem, ${withAlpha(base, 0)} 50%)`;
  //   const borderColor = withAlpha(base, 0.1); // Slightly more opaque than the background
  //   return `background-image: ${bg}; background-repeat: no-repeat; --cal-title-border-color: ${borderColor};`;
  // }

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
  // Reorder is always enabled; no cleanup on mode toggle needed.

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

    // Ensure drag state is fully cleared so hover animations can restart
    disarmDragging();
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
        // Persist destination order with a single batch write for stability.
        habitsStore.batchReorder(calendarId, reorderedHabits).catch(console.error);
      } else {
        // We are the source list; resequence remaining items to close gaps
        habitsStore.resequenceCalendar(calendarId, reorderedHabits).catch(console.error);
      }

      // Finalize always clears dragging state to allow animation restart on hover
      disarmDragging();
    }
  }

  /**
   * Handles habit drag start events
   * Ensures proper zone activation for drag operations
   */
  function handleHabitDragStart(calendarId: string) {
    isHabitZoneActive = true;
    activeHabitCalendarId = calendarId;
  }

  /**
   * Handles habit drag end events
   * Cleans up drag state after operations complete
   */
  function handleHabitDragEnd() {
    isHabitZoneActive = false;
    activeHabitCalendarId = null;
  }

  function openEditDialog(habit: Habit, calendarId: string) {
    editingHabitId = habit.id;
    editingCalendarId = calendarId;
    habitDialogOpen = true;
  }

  function openCalendarEditDialog(calendarId: string) {
    editingCalendarIdForDialog = calendarId;
    calendarDialogOpen = true;
  }

  // Disarm dragging when interaction ends anywhere
  function disarmDragging() {
    isAnyEmojiGrabbed = false;
    calendarDragArmed = false;
    habitDragArmedCalendarId = null;
    draggingCalendarId = null;
    draggingHabitId = null;
  }
</script>

<!-- Main calendars and habits list -->
<!-- Drag-and-drop zone for calendar reordering with visual feedback -->
<div
  class="flex w-full flex-col gap-8"
  data-dnd-zone="calendar"
  role="list"
  use:dndzone={{
    items: localCalendars,
    flipDurationMs: 200,
    dragDisabled: isHabitZoneActive || !calendarDragArmed,
    dropTargetStyle: {},
    type: "calendar"
  }}
  onconsider={handleCalendarDndConsider}
  onfinalize={handleCalendarDndFinalize}
  ondragstart={() => (isCalendarDragging = true)}
  ondragend={() => {
    isCalendarDragging = false;
    disarmDragging();
  }}
>
  {#each localCalendars as cal (cal.id)}
    {@const calHabits = localHabitsByCalendar.get(cal.id) ?? []}
    {@const isCalendarDisabled = cal.isEnabled === 0}
    {@const { emoji: calEmoji, text: calText } = parseCalendarName(cal.name)}

    <!-- Individual calendar container with flip animation -->
    <div animate:flip={{ duration: 200 }} data-calendar-id={cal.id} role="listitem">
      <div class="flex flex-col">
        <!-- Calendar Title Section -->
        <div class="flex items-center">
          <!-- Drag handle removed; emoji acts as the handle -->

          <!-- Calendar name, clickable to open edit dialog -->
          <!-- TODO: 2025-08-29 - add `style={calendarTitleStyles(cal.colorTheme)}` and calendar-title for older fading highlight for calendar titles plus a themed border -->
          <button
            type="button"
            class="disabled:text-muted-foreground/60 inline-flex min-w-0 flex-1 cursor-pointer items-center rounded-full text-left font-semibold transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-60"
            disabled={isCalendarDisabled}
            onclick={() => openCalendarEditDialog(cal.id)}
          >
            <!-- Calendar emoji container (drag handle) -->
            <div
              class="emoji-uniform flex h-10 w-10 shrink-0 cursor-grab items-center justify-center text-2xl active:cursor-grabbing"
              data-drag-handle="calendar"
              class:dragging={draggingCalendarId === cal.id}
              onpointerdown={() => {
                calendarDragArmed = true;
                isAnyEmojiGrabbed = true;
                draggingCalendarId = cal.id;
              }}
              ondragend={disarmDragging}
              onpointerup={disarmDragging}
              onpointercancel={disarmDragging}
              role="button"
              aria-label="Drag calendar"
              tabindex="0"
            >
              {calEmoji}
            </div>

            <!-- Calendar text -->
            <div class="ml-2 min-w-0 flex-1 truncate text-xl leading-6">
              {calText}
            </div>
          </button>
        </div>

        <!-- Habits List Section -->
        <!-- Drag-and-drop zone for habit reordering within calendar -->
        <div
          class="flex flex-col"
          role="list"
          data-dnd-zone="habit"
          data-calendar-id={cal.id}
          use:dndzone={{
            items: calHabits,
            flipDurationMs: 200,
            dropTargetStyle: {},
            type: "habit",
            morphDisabled: true,
            dragDisabled: isCalendarDragging || habitDragArmedCalendarId !== cal.id
          }}
          onconsider={(e) => handleHabitDnd(e, cal.id)}
          onfinalize={(e) => handleHabitDnd(e, cal.id)}
          ondragstart={() => handleHabitDragStart(cal.id)}
          ondragend={() => {
            handleHabitDragEnd();
            disarmDragging();
          }}
        >
          {#if calHabits.length > 0}
            {#each calHabits as habit (habit.id)}
              {@const habitCompletions = $completionsByHabit.get(habit.id) ?? []}
              {@const completionsToday = completionsTodayByHabit.get(habit.id) ?? 0}
              {@const isHabitDisabled = habit.isEnabled === 0 || isCalendarDisabled}
              {@const { emoji, text } = parseHabitName(habit.name)}
              {@const isNegativeHabit = habit.type === "negative"}

              <!-- Individual habit card with flip animation -->
              <div animate:flip={{ duration: 200 }} data-habit-id={habit.id} role="listitem">
                <!-- Layered row: under-layer (history + controls snapped to end), overlay (title + fade) -->
                <div
                  class="relative w-full min-w-0 overflow-visible p-2 transition-all {isHabitDisabled
                    ? 'pointer-events-none'
                    : ''} {habit.isEnabled === 0 ? 'border-dashed' : ''}"
                  aria-disabled={isHabitDisabled}
                >
                  <!-- Under-layer: history aligned to inline-end and truncating under the overlay, then controls -->
                  <div class="flex w-full min-w-0 items-center gap-4 overflow-hidden">
                    <div class="min-w-0 flex-1 overflow-hidden">
                      <div class="history-justify flex min-w-0 justify-end overflow-hidden">
                        <HabitHistoryRow
                          completions={habitCompletions}
                          calendarColor={colorNameToCss(cal.colorTheme)}
                          numDays={getDefaultHistoryDays(isMobile.current)}
                        />
                      </div>
                    </div>
                    <div class="flex w-16 shrink-0 items-center justify-end">
                      {#if !isHabitDisabled}
                        <HabitCompletionControl {habit} {completionsToday} />
                      {/if}
                    </div>
                  </div>

                  <!-- Overlay: emoji drag handle + title with gradient fade above history/controls -->
                  <div
                    class="title-overlay pointer-events-none absolute inset-y-0 left-0 z-40 flex max-w-[60%] items-center gap-0"
                    style="--title-bg: var(--color-background);"
                  >
                    <!-- TODO: 2025-09-01 - A div is for the RTL fade effect was not what is necessary here -->
                    <!-- RTL fade placed before the title group so it appears on the left in RTL -->
                    <!-- <div
                      class="rtl-only pointer-events-none z-40 h-full w-20 shrink-0"
                      aria-hidden="true"
                      style="background-image: linear-gradient(to left, var(--title-bg), transparent); background-repeat: no-repeat; background-size: 100% 100%;"
                    ></div> -->

                    <!-- Title group: emoji drag handle + text on solid dashboard background -->
                    <div class="bg-background flex min-w-0 items-center gap-2">
                      <!-- Emoji drag handle (re-enable events on this element) -->
                      <div
                        class="emoji-uniform pointer-events-auto relative z-20 flex h-10 w-10 shrink-0 cursor-grab items-center justify-center text-2xl active:cursor-grabbing"
                        data-drag-handle="habit"
                        class:dragging={draggingHabitId === habit.id}
                        onpointerdown={() => {
                          habitDragArmedCalendarId = cal.id;
                          isAnyEmojiGrabbed = true;
                          draggingHabitId = habit.id;
                        }}
                        ondragend={disarmDragging}
                        onpointerup={disarmDragging}
                        onpointercancel={disarmDragging}
                        role="button"
                        aria-label="Drag habit"
                        tabindex="0"
                      >
                        {#if isNegativeHabit}
                          <span class="flex scale-75 items-center justify-center select-none"
                            >{emoji}</span
                          >
                          <span
                            class="pointer-events-none absolute inset-0 flex scale-125 items-center justify-center opacity-80"
                            >🚫</span
                          >
                        {:else}
                          {emoji}
                        {/if}
                      </div>

                      <!-- Clickable title (re-enable events) -->
                      <button
                        type="button"
                        class="pointer-events-auto max-w-full min-w-0 flex-1 cursor-pointer truncate text-left text-xl leading-6 transition-opacity hover:opacity-80"
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
                        {text}
                        {#if habit.timerEnabled && habit.targetDurationSeconds && habit.targetDurationSeconds > 0}
                          <span class="text-muted-foreground/80 ml-1"
                            >({Math.round(habit.targetDurationSeconds / 60)}m)</span
                          >
                        {/if}
                      </button>
                    </div>

                    <!-- LTR fade placed after the title group so it appears on the right in LTR -->
                    <div
                      class="ltr-only pointer-events-none z-40 h-full w-10 shrink-0"
                      aria-hidden="true"
                      style="background-image: linear-gradient(to right, var(--title-bg), transparent); background-repeat: no-repeat; background-size: 100% 100%;"
                    ></div>
                  </div>
                </div>
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

<!-- 
  /* Fade toggle helpers */
  :global([dir="ltr"]) .ltr-only { display: block; }
  :global([dir="ltr"]) .rtl-only { display: none; }
  :global([dir="rtl"]) .ltr-only { display: none; }
  :global([dir="rtl"]) .rtl-only { display: block; }

  /* Align history to end so today sits next to the control */
  :global([dir="ltr"]) .history-justify { justify-content: flex-end; }
  :global([dir="rtl"]) .history-justify { justify-content: flex-start; }

  /* Ensure truncation under overlay */
  .title-overlay { max-width: 60%; }
  .title-overlay, .history-justify { overflow: hidden; }
  /*
    Create a dashed 2px border that fades horizontally like the background.
    We draw it using a positioned pseudo-element so we can mask it with a gradient.
  */

  .calendar-title {
    position: relative;
  }
  .calendar-title::after {
    content: "";
    position: absolute;
    inset: 0; /* cover the element */
    border-radius: 9999px; /* matches rounded-full */
    pointer-events: none;

    /* Draw dashed border using multiple backgrounds approach */
    border: 2px dashed var(--cal-title-border-color);

    /* Fade out the border to the right using a mask gradient. */
    -webkit-mask-image: linear-gradient(
      90deg,
      rgba(0, 0, 0, 1) 0rem,
      rgba(0, 0, 0, 1) 4rem,
      rgba(0, 0, 0, 0) 50%
    );
    mask-image: linear-gradient(
      90deg,
      rgba(0, 0, 0, 1) 0rem,
      rgba(0, 0, 0, 1) 4rem,
      rgba(0, 0, 0, 0) 50%
    );
  }
 -->

<style>
  /* Ensure history bars align to inline-end (today near control) in both directions */
  :global([dir="ltr"]) .history-justify {
    justify-content: flex-end;
  }
  :global([dir="rtl"]) .history-justify {
    justify-content: flex-start;
  }

  /* Emoji visual normalization so calendar + habit emojis match across platforms.
     Enforce inline-flex and consistent line-height to keep visuals and whitespace identical. */
  :global(.emoji-uniform) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  /* Slightly tighter overlay width to accommodate unified emoji size */
  .title-overlay {
    max-width: 55%;
  }

  /* Emoji animation handled by global `src/ui.css` to avoid duplication. */
</style>
