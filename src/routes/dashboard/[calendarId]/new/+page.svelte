<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import Button from "$lib/components/ui/button/button.svelte";
  import Input from "$lib/components/ui/input/input.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import * as Select from "$lib/components/ui/select";
  import { type Calendar, calendarsStore } from "$lib/stores/calendars";
  import { type HabitInputData, habits as habitsStore } from "$lib/stores/habits";

  const habitTypeItems = [
    {
      value: "positive",
      label: "Positive",
      description: "Positive (Build good habits)"
    },
    {
      value: "negative",
      label: "Negative",
      description: "Negative (Reduce bad habits)"
    }
  ];

  let name = $state("");
  let description = $state("");
  let type = $state("positive");
  const selectedLabel = $derived(habitTypeItems.find((item) => item.value === type)?.label);
  let timerEnabled = $state(false);
  let targetDurationSeconds = $state(0);
  let pointsValue = $state(0);
  let saving = $state(false);
  let calendar = $state<Calendar | undefined>(undefined);

  const calendarId = $derived(page.params.calendarId);

  // Effect to load calendar details
  $effect(() => {
    const unsubscribe = calendarsStore.subscribe((calendars) => {
      calendar = calendars.find((c) => c.id === calendarId);
    });
    return unsubscribe;
  });

  async function createHabit(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      if (!calendarId) {
        throw new Error("Calendar ID is required");
      }
      const newHabitData: HabitInputData = {
        calendarId,
        name,
        description,
        type,
        timerEnabled: timerEnabled ? 1 : 0,
        targetDurationSeconds: timerEnabled ? Number(targetDurationSeconds) || null : null,
        pointsValue: Number(pointsValue) || 0
        // Position will be handled by the store or backend
      };
      await habitsStore.add(newHabitData);
      goto(`/dashboard/${calendarId}`);
    } catch (error) {
      console.error("Failed to create habit:", error);
    } finally {
      saving = false;
    }
  }

  function cancelCreation() {
    goto(`/dashboard/${calendarId}`);
  }
</script>

<div class="mx-auto max-w-2xl p-6">
  <h1 class="mb-2 text-3xl font-bold">Create New Habit</h1>
  {#if calendar}
    <p class="text-muted-foreground mb-6">
      Adding to calendar: <span class="text-foreground font-medium">{calendar.name}</span>
    </p>
  {/if}
  <form onsubmit={createHabit} class="flex flex-col gap-6">
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
    <div class="mt-6 flex justify-end gap-3 border-t pt-6">
      <Button type="button" variant="outline" onclick={cancelCreation} disabled={saving}
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
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Creating...
        {:else}
          Create Habit
        {/if}
      </Button>
    </div>
  </form>
</div>
