<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Card from "$lib/components/ui/card";
  import { type Habit, habits as habitsStore } from "$lib/stores/habits";

  let habit = $state<Habit | undefined>(undefined);
  let loading = $state(true);

  const calendarId = $derived(page.params.calendarId);
  const habitId = $derived(page.params.habitId);

  // Reactive effect to load habit data and handle updates
  $effect(() => {
    loading = true;
    const unsubscribe = habitsStore.subscribe((allHabits) => {
      const currentHabit = allHabits.find((h) => h.id === habitId);
      if (currentHabit) {
        habit = currentHabit;
      }
      loading = false;
    });

    habitsStore.refresh();

    return unsubscribe;
  });

  function navigateToEdit() {
    goto(`/dashboard/${calendarId}/${habitId}/edit`);
  }
</script>

<div class="mx-auto max-w-2xl p-6">
  {#if loading}
    <p class="text-muted-foreground">Loading habit details...</p>
  {:else if !habit}
    <p class="text-destructive">
      Habit not found.
      <a href={`/dashboard/${calendarId}`} class="text-primary hover:underline"
        >Return to calendar.</a
      >
    </p>
  {:else}
    <Card.Root class="w-full">
      <Card.Header class="flex flex-row items-center justify-between">
        <Card.Title class="text-3xl font-bold">{habit.name}</Card.Title>
        <Button variant="outline" onclick={navigateToEdit}>Edit Habit</Button>
      </Card.Header>
      <Card.Content class="space-y-4">
        {#if habit.description}
          <div>
            <h3 class="text-foreground text-lg font-semibold">Description</h3>
            <p class="text-muted-foreground">{habit.description}</p>
          </div>
        {/if}

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <h3 class="text-foreground text-sm font-medium">Type</h3>
            <Badge
              variant={habit.type === "positive" ? "default" : "destructive"}
              class="capitalize"
            >
              {habit.type}
            </Badge>
          </div>
          <div>
            <h3 class="text-foreground text-sm font-medium">Points Value</h3>
            <p class="text-foreground text-lg font-semibold">{habit.pointsValue ?? 0}</p>
          </div>
        </div>

        {#if habit.timerEnabled}
          <div>
            <h3 class="text-foreground text-sm font-medium">Timer</h3>
            <p class="text-foreground text-lg font-semibold">
              Enabled: Target {habit.targetDurationSeconds} seconds
            </p>
          </div>
        {:else}
          <div>
            <h3 class="text-foreground text-sm font-medium">Timer</h3>
            <p class="text-muted-foreground">Disabled</p>
          </div>
        {/if}

        <div class="bg-card text-muted-foreground mt-6 rounded border p-4">
          <span class="font-semibold">Habit statistics and progress tracking will appear here.</span
          >
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-start border-t pt-4">
        <Button variant="link" href={`/dashboard/${calendarId}`}>&larr; Back to Calendar</Button>
      </Card.Footer>
    </Card.Root>
  {/if}
</div>
