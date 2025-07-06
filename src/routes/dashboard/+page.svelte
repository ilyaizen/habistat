<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { useDashboardData } from "$lib/hooks/use-dashboard-data.svelte.ts";
  import DashboardHeader from "$lib/components/dashboard-header.svelte";

  // Store imports
  import { calendarsStore, type Calendar } from "$lib/stores/calendars";
  import { habits as habitsStore, type Habit } from "$lib/stores/habits";
  import { completionsStore, completionsByHabit } from "$lib/stores/completions";

  // Component imports for existing functionality
  import Button from "$lib/components/ui/button/button.svelte";
  import ActivityMonitor from "$lib/components/activity-monitor.svelte";
  import { dndzone, type DndEvent } from "svelte-dnd-action";
  import { flip } from "svelte/animate";
  import { GripVertical, ArrowUpDown } from "@lucide/svelte";
  import HabitCompletionControl from "$lib/components/habit-completion-control.svelte";
  import HabitHistoryGrid from "$lib/components/habit-history-grid.svelte";
  import { formatDate } from "$lib/utils/date";
  import { IsMobile } from "$lib/hooks/is-mobile.svelte.ts";
  import { Card } from "$lib/components/ui/card";
  import { Switch } from "$lib/components/ui/switch";
  import SampleDataGenerator from "$lib/components/sample-data-generator.svelte";

  // Initialize hook
  const { loading, initialize, refreshData } = useDashboardData();

  // Mobile detection
  const isMobile = new IsMobile();

  // State variables
  let localCalendars = $state<Calendar[]>([]);
  let localHabitsByCalendar = $state(new Map<string, Habit[]>());
  let isHabitZoneActive = $state(false);
  let initialized = $state(false);
  let activeHabitCalendarId = $state<string | null>(null);
  let isReorderMode = $state(false);

  // Derived values using stores directly
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
    const allCompletions = $completionsByHabit;

    for (const [habitId, completions] of allCompletions.entries()) {
      const todayCount = completions.filter(
        (c) => formatDate(new Date(c.completedAt)) === todayStr
      ).length;
      newMap.set(habitId, todayCount);
    }
    return newMap;
  });

  // Effects for initialization and syncing
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

  $effect(() => {
    if (initialized && !isHabitZoneActive && !activeHabitCalendarId) {
      const newHabitsMap = new Map();
      for (const [key, value] of habitsByCalendar.entries()) {
        newHabitsMap.set(key, [...value]);
      }
      localHabitsByCalendar = newHabitsMap;
    }
  });

  $effect(() => {
    if (calendars.length === 0) {
      isHabitZoneActive = false;
      activeHabitCalendarId = null;
    }
  });

  $effect(() => {
    if (!isReorderMode) {
      isHabitZoneActive = false;
      activeHabitCalendarId = null;
    }
  });

  // Mount and event handlers
  onMount(async () => {
    await initialize();
  });

  function handleCalendarDnd(e: CustomEvent<DndEvent<Calendar>>) {
    if (isHabitZoneActive || activeHabitCalendarId) return;
    localCalendars = e.detail.items;
    const updatePromises = localCalendars.map((cal, index) =>
      calendarsStore.update(cal.id, { position: index })
    );
    Promise.all(updatePromises);
  }

  function handleHabitDnd(e: CustomEvent<DndEvent<Habit>>, calendarId: string) {
    e.stopPropagation();
    const reorderedHabits = e.detail.items;
    const newMap = new Map(localHabitsByCalendar);
    newMap.set(calendarId, [...reorderedHabits]);
    localHabitsByCalendar = newMap;

    if (e.type === "finalize") {
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

  async function handleDataGenerated() {
    try {
      await refreshData();
      initialized = false;
      console.log("Dashboard refreshed after sample data generation");
    } catch (error) {
      console.error("Error refreshing dashboard after data generation:", error);
    }
  }
</script>

<div class="container mx-auto max-w-6xl p-8">
  <DashboardHeader bind:isReorderMode />

  {#if loading()}
    <div class="text-center">
      <p class="text-muted-foreground">Loading dashboard...</p>
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
        {@const isCalendarDisabled = cal.isEnabled === 0}
        <div animate:flip={{ duration: 200 }} data-calendar-id={cal.id}>
          <div class="flex flex-col">
            <!-- Calendar Title -->
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

            <!-- Habits List -->
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
