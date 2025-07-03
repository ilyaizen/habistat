<script lang="ts">
  import { page } from "$app/state";
  import { calendarsStore, type Calendar } from "$lib/stores/calendars";
  import { habits as habitsStore, type Habit } from "$lib/stores/habits";
  import Button from "$lib/components/ui/button/button.svelte";
  import { goto } from "$app/navigation";
  import * as Card from "$lib/components/ui/card";
  import { Separator } from "$lib/components/ui/separator";
  import { Edit, PlusCircle, ArrowUp, ArrowDown } from "@lucide/svelte";
  import type { Writable } from "svelte/store";

  let calendar = $state<Calendar | undefined>(undefined);
  let calendarHabits = $state<Habit[]>([]);
  let loadingCalendar = $state(true);
  let loadingHabits = $state(true);

  const calendarId = $derived(page.params.calendarId);

  // Effect to load calendar details
  $effect(() => {
    loadingCalendar = true;
    const unsubscribeCalendars = calendarsStore.subscribe((calendars) => {
      calendar = calendars.find((c) => c.id === calendarId);
      loadingCalendar = false;
    });
    return unsubscribeCalendars;
  });

  // Effect to load habits for this calendar
  $effect(() => {
    if (!calendarId) return; // Don't load habits if calendarId isn't available yet
    loadingHabits = true;
    const unsubscribeHabits = habitsStore.subscribe((allHabits) => {
      calendarHabits = allHabits
        .filter((h) => h.calendarId === calendarId)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      loadingHabits = false;
    });
    habitsStore.refresh();
    return unsubscribeHabits;
  });

  function navigateToEditCalendar() {
    goto(`/dashboard/${calendarId}/edit`);
  }

  function navigateToHabitDetail(habitId: string) {
    goto(`/dashboard/${calendarId}/${habitId}`);
  }

  function navigateToNewHabit() {
    goto(`/dashboard/${calendarId}/new`);
  }

  function navigateToEditHabit(habitId: string) {
    goto(`/dashboard/${calendarId}/${habitId}/edit`);
  }

  async function moveHabit(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= calendarHabits.length) return;
    // Swap positions
    const a = calendarHabits[idx];
    const b = calendarHabits[newIdx];
    await habitsStore.update(a.id, { position: newIdx });
    await habitsStore.update(b.id, { position: idx });
    await habitsStore.refresh();
  }

  function handleStopPropagation(e: MouseEvent, callback: () => void) {
    e.stopPropagation();
    callback();
  }
</script>

<div class="mx-auto max-w-3xl p-4 md:p-6">
  {#if loadingCalendar}
    <p class="text-muted-foreground">Loading calendar...</p>
  {:else if !calendar}
    <p class="text-destructive">
      Calendar not found.
      <Button variant="link" href="/dashboard">Return to Dashboard</Button>
    </p>
  {:else}
    <header class="mb-6 flex items-start justify-between">
      <div class="flex items-center gap-4">
        <div
          class="border-border h-12 w-12 rounded-lg border-2 shadow-sm"
          style="background-color: {calendar.colorTheme || '#2563eb'};"
          aria-label="Calendar color theme"
        ></div>
        <div>
          <h1 class="text-foreground text-3xl font-bold">{calendar.name}</h1>
        </div>
      </div>
      <Button variant="outline" onclick={navigateToEditCalendar} class="flex items-center gap-2">
        <Edit class="h-4 w-4" />
        Edit Calendar
      </Button>
    </header>

    <Separator class="my-6" />

    <section aria-labelledby="habits-heading">
      <div class="mb-4 flex items-center justify-between">
        <h2 id="habits-heading" class="text-foreground text-2xl font-semibold">Habits</h2>
        <Button onclick={navigateToNewHabit} class="flex items-center gap-2">
          <PlusCircle class="h-4 w-4" />
          New Habit
        </Button>
      </div>

      {#if loadingHabits}
        <p class="text-muted-foreground">Loading habits...</p>
      {:else if calendarHabits.length === 0}
        <Card.Root class="p-6 text-center">
          <Card.Content>
            <p class="text-muted-foreground">No habits yet for this calendar.</p>
            <Button onclick={navigateToNewHabit} variant="link" class="mt-2"
              >Add your first habit</Button
            >
          </Card.Content>
        </Card.Root>
      {:else}
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {#each calendarHabits as habit, i (habit.id)}
            <Card.Root class="flex flex-col justify-between transition-all">
              <div
                class="flex-grow cursor-pointer p-6"
                onclick={() => navigateToHabitDetail(habit.id)}
                role="button"
                tabindex="0"
                onkeydown={(e) => {
                  if (e.key === "Enter" || e.key === " ") navigateToHabitDetail(habit.id);
                }}
              >
                <Card.Header class="p-0">
                  <Card.Title class="text-lg">{habit.name}</Card.Title>
                </Card.Header>
                {#if habit.description}
                  <Card.Content class="p-0 pt-2">
                    <p class="text-muted-foreground truncate text-sm">{habit.description}</p>
                  </Card.Content>
                {/if}
                <div class="text-muted-foreground pt-4 text-xs">
                  Type: {habit.type} - Points: {habit.pointsValue ?? 0}
                </div>
              </div>
              <Card.Footer class="flex items-center justify-between border-t p-3">
                <div class="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    class="h-8 w-8"
                    onclick={(e) => handleStopPropagation(e, () => moveHabit(i, -1))}
                    disabled={i === 0}
                    aria-label="Move habit up"
                  >
                    <ArrowUp class="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    class="h-8 w-8"
                    onclick={(e) => handleStopPropagation(e, () => moveHabit(i, 1))}
                    disabled={i === calendarHabits.length - 1}
                    aria-label="Move habit down"
                  >
                    <ArrowDown class="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onclick={(e) => handleStopPropagation(e, () => navigateToEditHabit(habit.id))}
                  >Edit</Button
                >
              </Card.Footer>
            </Card.Root>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</div>
