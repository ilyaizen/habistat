<script lang="ts">
  import { onMount } from "svelte";
  import { calendarsStore, type Calendar } from "$lib/stores/calendars";
  import { habits as habitsStore, type Habit } from "$lib/stores/habits";
  import { completionsStore, completionsByHabit } from "$lib/stores/completions";
  import Button from "$lib/components/ui/button/button.svelte";
  import { goto } from "$app/navigation";
  import ActivityMonitor from "$lib/components/activity-monitor.svelte";
  import { dndzone, type DndEvent } from "svelte-dnd-action";
  import { flip } from "svelte/animate";
  import { GripVertical, ArrowUpDown } from "@lucide/svelte";

  import HabitCompletionControl from "$lib/components/habit-completion-control.svelte";
  import HabitHistoryGrid from "$lib/components/habit-history-grid.svelte";
  import { formatDate } from "$lib/utils/date";
  import { IsMobile } from "$lib/hooks/is-mobile.svelte.ts";
  import { Card, CardContent } from "$lib/components/ui/card";
  import { Switch } from "$lib/components/ui/switch";
  import SampleDataGenerator from "$lib/components/sample-data-generator.svelte";
  // import { Label } from "$lib/components/ui/label";

  /**
   * Represents a reactive instance of the IsMobile class.
   * This is used to dynamically adjust the UI based on the screen size.
   */
  const isMobile = new IsMobile();

  let loading = $state(true);
  let localCalendars = $state<Calendar[]>([]);
  let localHabitsByCalendar = $state(new Map<string, Habit[]>());
  let isHabitZoneActive = $state(false);
  let initialized = $state(false);
  let activeHabitCalendarId = $state<string | null>(null);
  let isReorderMode = $state(false);

  const calendars = $derived(
    [...($calendarsStore ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  );

  const habitsByCalendar = $derived.by(() => {
    const allHabits = $habitsStore ?? [];
    const newMap = new Map<string, Habit[]>();
    for (const habit of allHabits) {
      if (!habit.calendarId) continue;
      if (!newMap.has(habit.calendarId)) {
        newMap.set(habit.calendarId, []);
      }
      newMap.get(habit.calendarId)!.push(habit);
    }
    for (const [key, value] of newMap.entries()) {
      newMap.set(
        key,
        value.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      );
    }
    return newMap;
  });

  const completionsTodayByHabit = $derived.by(() => {
    const todayStr = formatDate(new Date());
    const newMap = new Map<string, number>();
    const allCompletions = $completionsByHabit; // this is a map

    for (const [habitId, completions] of allCompletions.entries()) {
      const todayCount = completions.filter(
        (c) => formatDate(new Date(c.completedAt)) === todayStr
      ).length;
      newMap.set(habitId, todayCount);
    }
    return newMap;
  });

  $effect(() => {
    if (!loading && !initialized && calendars.length > 0) {
      localCalendars = [...calendars];
      // Deep copy the habits map to avoid reactivity issues
      const newHabitsMap = new Map();
      for (const [key, value] of habitsByCalendar.entries()) {
        newHabitsMap.set(key, [...value]);
      }
      localHabitsByCalendar = newHabitsMap;
      initialized = true;
    }
  });

  // Update local state when habits change (but not during drag operations)
  $effect(() => {
    if (initialized && !isHabitZoneActive && !activeHabitCalendarId) {
      const newHabitsMap = new Map();
      for (const [key, value] of habitsByCalendar.entries()) {
        newHabitsMap.set(key, [...value]);
      }
      localHabitsByCalendar = newHabitsMap;
    }
  });

  // Reset active states when calendars change
  $effect(() => {
    if (calendars.length === 0) {
      isHabitZoneActive = false;
      activeHabitCalendarId = null;
    }
  });

  onMount(async () => {
    try {
      /**
       * Fetches all necessary data for the dashboard when the component mounts.
       * This includes calendars, habits, and completions.
       */
      await Promise.all([
        calendarsStore.refresh(),
        habitsStore.refresh(),
        completionsStore.refresh()
      ]);
    } catch (error) {
      console.error("Dashboard mount error:", error);
    } finally {
      loading = false;
    }
  });

  function handleCalendarDnd(e: CustomEvent<DndEvent<Calendar>>) {
    // Only handle if we're not in a habit zone
    if (isHabitZoneActive || activeHabitCalendarId) {
      return;
    }

    localCalendars = e.detail.items;
    const updatePromises = localCalendars.map((cal, index) =>
      calendarsStore.update(cal.id, { position: index })
    );
    Promise.all(updatePromises);
  }

  function handleHabitDnd(e: CustomEvent<DndEvent<Habit>>, calendarId: string) {
    // Stop event from bubbling to parent calendar zone
    e.stopPropagation();

    const reorderedHabits = e.detail.items;

    // Create a new map to trigger reactivity
    const newMap = new Map(localHabitsByCalendar);
    newMap.set(calendarId, [...reorderedHabits]); // Ensure new array reference
    localHabitsByCalendar = newMap;

    // Only update positions on finalize (actual drop)
    if (e.type === "finalize") {
      console.log(
        `Finalizing habit reorder in calendar ${calendarId}: ${reorderedHabits.map((h) => h.name).join(", ")}`
      );
      const updatePromises = reorderedHabits.map((habit, index) =>
        habitsStore.update(habit.id, { position: index })
      );
      Promise.all(updatePromises).catch(console.error);
    }
  }

  function handleHabitZoneEnter(calendarId: string) {
    if (!isReorderMode) return;
    isHabitZoneActive = true;
    activeHabitCalendarId = calendarId;
  }

  function handleHabitZoneLeave() {
    if (!isReorderMode) return;
    // Use a small delay to prevent flickering when moving between elements
    setTimeout(() => {
      isHabitZoneActive = false;
      activeHabitCalendarId = null;
    }, 50);
  }

  function handleHabitDragStart(calendarId: string) {
    if (!isReorderMode) return;
    isHabitZoneActive = true;
    activeHabitCalendarId = calendarId;
  }

  function handleHabitDragEnd() {
    if (!isReorderMode) return;
    isHabitZoneActive = false;
    activeHabitCalendarId = null;
  }

  function openCreateDialog() {
    goto("/dashboard/new");
  }

  /**
   * Handles the data generation event from the sample data generator.
   * Forces a refresh of all stores to ensure the UI displays the new data.
   */
  async function handleDataGenerated() {
    try {
      // Force refresh all stores to ensure UI updates with new data
      await Promise.all([
        calendarsStore.refresh(),
        habitsStore.refresh(),
        completionsStore.refresh()
      ]);

      // Reset initialization state to trigger UI updates
      initialized = false;

      console.log("Dashboard refreshed after sample data generation");
    } catch (error) {
      console.error("Error refreshing dashboard after data generation:", error);
    }
  }

  // Reset zone states when reorder mode is turned off
  $effect(() => {
    if (!isReorderMode) {
      isHabitZoneActive = false;
      activeHabitCalendarId = null;
    }
  });
</script>

<div class="container mx-auto max-w-6xl p-8">
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
    <Switch id="reorder-mode" bind:checked={isReorderMode} aria-label="Toggle reorder mode" />
  </div>

  {#if loading}
    <div class="text-center">
      <p class="text-muted-foreground">Loading dashboard...</p>
      <!-- You could put a spinner or skeleton loader here -->
    </div>
  {:else if calendars.length === 0}
    <div class="text-center">
      <p class="text-muted-foreground mb-4">No calendars yet. Create one to get started!</p>
      <div class="mt-4 flex justify-center gap-2">
        <Button size="sm" onclick={openCreateDialog}>New Calendar</Button>
        <SampleDataGenerator on:dataGenerated={handleDataGenerated} />
      </div>
    </div>
  {:else}
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
        {@const isThisCalendarActive = activeHabitCalendarId === cal.id}
        {@const isCalendarDisabled = cal.isEnabled === 0}
        <div animate:flip={{ duration: 200 }} data-calendar-id={cal.id}>
          <div class="flex flex-col">
            <!-- Calendar Title with Colored Underline -->
            <div class="flex items-center justify-center">
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
              <a
                href={isCalendarDisabled ? undefined : `/dashboard/${cal.id}`}
                class="mb-2 inline-block text-xl font-semibold transition-opacity hover:opacity-80 {isCalendarDisabled
                  ? 'text-muted-foreground/60 pointer-events-none line-through opacity-60'
                  : ''}"
                aria-disabled={isCalendarDisabled}
                tabindex={isCalendarDisabled ? -1 : 0}
                onclick={() => {
                  if (!isCalendarDisabled) goto(`/dashboard/${cal.id}`);
                }}
                onkeydown={(e) => {
                  if (!isCalendarDisabled && (e.key === "Enter" || e.key === " ")) {
                    goto(`/dashboard/${cal.id}`);
                  }
                }}
              >
                {cal.name}
              </a>
            </div>

            <!-- Habits List (2025-07-05: Card wrapper removed) -->
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
                  <div animate:flip={{ duration: 200 }} data-habit-id={habit.id}>
                    <Card
                      class="bg-card flex flex-row flex-nowrap items-center justify-between gap-2 rounded-3xl border p-1 shadow-xs transition-all {isHabitDisabled
                        ? 'pointer-events-none opacity-50 grayscale'
                        : ''} {habit.isEnabled === 0 ? 'border-dashed' : 'hover:bg-card/90'}"
                      aria-disabled={isHabitDisabled}
                    >
                      <div class="flex min-w-0 flex-1 items-center">
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
                        <div
                          class="min-w-0 flex-1 truncate overflow-hidden font-medium whitespace-nowrap {isHabitDisabled
                            ? 'text-muted-foreground/70 line-through'
                            : ''}"
                          role="button"
                          tabindex={isHabitDisabled ? -1 : 0}
                          onclick={() => {
                            if (!isHabitDisabled) goto(`/dashboard/${cal.id}/${habit.id}`);
                          }}
                          onkeydown={(e) => {
                            if (!isHabitDisabled && (e.key === "Enter" || e.key === " ")) {
                              goto(`/dashboard/${cal.id}/${habit.id}`);
                            }
                          }}
                          aria-disabled={isHabitDisabled}
                        >
                          {habit.name}
                        </div>
                      </div>
                      <div class="flex shrink-0 flex-row items-center gap-4">
                        <HabitHistoryGrid
                          completions={habitCompletions}
                          calendarColor={cal.colorTheme || "#3b82f6"}
                          numDays={isMobile.current ? 14 : 30}
                        />
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
