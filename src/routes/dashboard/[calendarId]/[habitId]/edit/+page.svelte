<script lang="ts">
  import { habits as habitsStore, type Habit } from "$lib/stores/habits";
  import Input from "$lib/components/ui/input/input.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import { goto } from "$app/navigation";
  import * as Select from "$lib/components/ui/select";
  import { page } from "$app/state";
  import Label from "$lib/components/ui/label/label.svelte"; // Added for consistency if used
  import { get } from "svelte/store";
  import Switch from "$lib/components/ui/switch/switch.svelte";

  // Define habit types for the select component
  const habitTypeItems = [
    { value: "positive", label: "Positive", description: "Positive (Build good habits)" },
    { value: "negative", label: "Negative", description: "Negative (Reduce bad habits)" }
  ];

  let habit = $state<Habit | undefined>(undefined);
  let name = $state("");
  let description = $state("");
  let type = $state("positive"); // Default or load from habit
  const selectedLabel = $derived(habitTypeItems.find((item) => item.value === type)?.label);
  let timerEnabled = $state(false);
  let targetDurationSeconds = $state<number | null>(0);
  let pointsValue = $state(0);
  let position = $state(0);
  let isEnabled = $state(true);
  let saving = $state(false);

  const calendarId = $derived(page.params.calendarId);
  const habitId = $derived(page.params.habitId);

  // Load habit data on mount
  $effect(() => {
    const allHabits = get(habitsStore);
    const found = allHabits.find((h) => h.id === habitId);

    function populateState(h: Habit) {
      habit = h;
      name = h.name;
      description = h.description ?? "";
      type = h.type;
      timerEnabled = h.timerEnabled === 1;
      targetDurationSeconds = h.targetDurationSeconds;
      pointsValue = h.pointsValue ?? 0;
      position = h.position;
      isEnabled = h.isEnabled === 1;
    }

    if (found) {
      populateState(found);
    } else {
      habitsStore.refresh().then(() => {
        const freshHabits = get(habitsStore);
        const freshFound = freshHabits.find((h) => h.id === habitId);
        if (freshFound) {
          populateState(freshFound);
        } else {
          console.error("Habit not found, redirecting.");
          goto(`/dashboard/${calendarId}`);
        }
      });
    }
  });

  async function saveHabit() {
    if (!habit) {
      console.error("Attempted to save a non-existent habit.");
      return;
    }
    saving = true;
    try {
      await habitsStore.update(habit.id, {
        name,
        description,
        type,
        timerEnabled: timerEnabled ? 1 : 0,
        targetDurationSeconds: timerEnabled ? Number(targetDurationSeconds) || null : null,
        pointsValue: Number(pointsValue) || 0,
        position: Number(position) || 0,
        isEnabled: isEnabled ? 1 : 0
      });
      goto(`/dashboard/${calendarId}/${habitId}`);
    } catch (error) {
      console.error("Failed to save habit:", error);
    } finally {
      saving = false;
    }
  }

  function cancelEdit() {
    goto(`/dashboard/${calendarId}/${habitId}`); // Redirect to the detail page
  }
</script>

<div class="mx-auto max-w-2xl p-6">
  <h1 class="mb-6 text-3xl font-bold">Edit Habit</h1>
  {#if habit === undefined}
    <p class="text-muted-foreground">Loading habit details...</p>
  {:else if !habit}
    <p class="text-destructive">
      Habit not found. <a href={`/dashboard/${calendarId}`} class="text-primary hover:underline"
        >Return to calendar.</a
      >
    </p>
  {:else}
    <form onsubmit={saveHabit} class="flex flex-col gap-6">
      <div>
        <Label class="text-foreground mb-2 block text-sm font-medium">
          Name
          <Input
            id="habit-name"
            name="name"
            autocomplete="name"
            bind:value={name}
            required
            placeholder="Habit name (e.g., Drink Water)"
          />
        </Label>
      </div>
      <div>
        <Label class="text-foreground mb-2 block text-sm font-medium">
          Description
          <Input
            id="habit-description"
            name="description"
            autocomplete="off"
            bind:value={description}
            placeholder="Optional: What, why, how?"
          />
        </Label>
      </div>
      <div>
        <Label class="text-foreground mb-2 block text-sm font-medium">
          Type
          <Select.Root name="type" type="single" bind:value={type}>
            <Select.Trigger class="w-full md:w-[200px]">
              {#if selectedLabel}
                {selectedLabel}
              {:else}
                <span class="text-muted-foreground">Select habit type</span>
              {/if}
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                <Select.Label class="px-2 py-1.5 text-sm font-semibold">Habit Type</Select.Label>
                {#each habitTypeItems as item (item.value)}
                  <Select.Item value={item.value} label={item.label}>
                    {item.description}
                  </Select.Item>
                {/each}
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Label>
      </div>
      <div class="flex items-center gap-3 rounded-md border p-4">
        <input
          type="checkbox"
          id="timerEnabled"
          name="timerEnabled"
          bind:checked={timerEnabled}
          class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
          autocomplete="off"
        />
        <Label for="timerEnabled" class="text-foreground text-sm font-medium">Enable Timer</Label>
      </div>
      {#if timerEnabled}
        <div class="ml-7">
          <Label class="text-foreground mb-2 block text-sm font-medium">
            Target Duration (seconds)
            <Input
              id="habit-targetDurationSeconds"
              name="targetDurationSeconds"
              autocomplete="off"
              type="number"
              min="1"
              bind:value={targetDurationSeconds}
              placeholder="e.g., 300 for 5 minutes"
              class="w-full md:w-48"
            />
          </Label>
        </div>
      {/if}
      <div>
        <Label class="text-foreground mb-2 block text-sm font-medium">
          Points Value
          <Input
            id="habit-pointsValue"
            name="pointsValue"
            autocomplete="off"
            type="number"
            min="0"
            bind:value={pointsValue}
            placeholder="Points for completion"
            class="w-full md:w-32"
          />
        </Label>
      </div>
      <div>
        <Label class="text-foreground mb-2 block text-sm font-medium">
          Position
          <Input
            id="habit-position"
            name="position"
            autocomplete="off"
            type="number"
            min="1"
            bind:value={position}
            placeholder="Order in list"
            class="w-full md:w-32"
          />
        </Label>
      </div>
      <div class="flex items-center space-x-2">
        <Switch id="enabled-mode" bind:checked={isEnabled} />
        <Label for="enabled-mode">Enabled</Label>
      </div>
      <div class="mt-6 flex justify-end gap-3 border-t pt-6">
        <Button type="button" variant="outline" onclick={cancelEdit} disabled={saving}
          >Cancel</Button
        >
        <Button type="submit" disabled={saving}>
          {#if saving}
            <svg
              class="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Saving...
          {:else}
            Save Changes
          {/if}
        </Button>
      </div>
    </form>
  {/if}
</div>
