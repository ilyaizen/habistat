<script lang="ts">
  import { calendarsStore, type Calendar } from "$lib/stores/calendars";
  import { habits as habitsStore, type Habit } from "$lib/stores/habits";
  import Button from "$lib/components/ui/button/button.svelte";
  import { goto } from "$app/navigation";
  import * as Select from "$lib/components/ui/select";
  import Label from "$lib/components/ui/label/label.svelte";
  import { get } from "svelte/store";
  import Switch from "$lib/components/ui/switch/switch.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import Textarea from "$lib/components/ui/textarea/textarea.svelte";
  import Input from "$lib/components/ui/input/input.svelte";
  import { toast } from "svelte-sonner";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { createEventDispatcher } from "svelte";

  let { habitId, calendarId, open } = $props<{
    habitId: string;
    calendarId: string;
    open: boolean;
  }>();

  const dispatch = createEventDispatcher();

  const habitTypeItems = [
    { value: "positive", label: "Positive", description: "Positive (Build good habits)" },
    { value: "negative", label: "Negative", description: "Negative (Reduce bad habits)" }
  ];

  let calendars = $state<Calendar[]>([]);
  let habit = $state<Habit | undefined>(undefined);
  let name = $state("");
  let description = $state("");
  let type = $state("positive");
  const selectedLabel = $derived(habitTypeItems.find((item) => item.value === type)?.label);
  let timerEnabled = $state(false);
  let targetDurationSeconds = $state<number | null>(0);
  let pointsValue = $state(0);
  let position = $state(0);
  let isEnabled = $state(true);
  let saving = $state(false);
  let deleteDialogOpen = $state(false);
  let selectedCalendarId = $state("");

  $effect(() => {
    calendarsStore.subscribe((value) => {
      calendars = value;
    });

    const allHabits = get(habitsStore);
    const found = allHabits.find((h) => h.id === habitId);

    function populateState(h: Habit) {
      habit = h;
      name = h.name;
      description = h.description ?? "";
      type = h.type;
      selectedCalendarId = h.calendarId;
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

  function handleClose() {
    dispatch("close");
    goto(`/dashboard`);
  }

  async function saveHabit() {
    if (!habit) {
      console.error("Attempted to save a non-existent habit.");
      return;
    }
    saving = true;
    try {
      const updatePayload: Partial<Omit<Habit, "id" | "userId" | "createdAt">> = {
        name,
        description,
        type,
        timerEnabled: timerEnabled ? 1 : 0,
        targetDurationSeconds: timerEnabled ? Number(targetDurationSeconds) || null : null,
        pointsValue: Number(pointsValue) || 0,
        position: Number(position) || 0,
        isEnabled: isEnabled ? 1 : 0
      };

      if (selectedCalendarId !== habit.calendarId) {
        updatePayload.calendarId = selectedCalendarId;
        const allHabits = get(habitsStore);
        const habitsInNewCalendar = allHabits.filter((h) => h.calendarId === selectedCalendarId);
        const maxPosition =
          habitsInNewCalendar.length > 0
            ? Math.max(...habitsInNewCalendar.map((c) => c.position))
            : -1;
        updatePayload.position = maxPosition + 1;
      }

      await habitsStore.update(habit.id, updatePayload);
      toast.success("Habit saved successfully!");
      handleClose();
    } catch (error) {
      console.error("Failed to save habit:", error);
      toast.error("Failed to save habit. Please try again.");
    } finally {
      saving = false;
    }
  }

  async function deleteHabit() {
    if (!habit) return;
    saving = true;
    try {
      await habitsStore.remove(habit.id);
      toast.success("Habit deleted.");
      handleClose();
    } catch (error) {
      console.error("Failed to delete habit:", error);
      toast.error("Failed to delete habit.");
    } finally {
      saving = false;
      deleteDialogOpen = false;
    }
  }
</script>

<Dialog.Root bind:open onOpenChange={(v) => !v && handleClose()}>
  <Dialog.Content class="max-h-[90vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>Edit Habit</Dialog.Title>
    </Dialog.Header>

    <div class="p-1">
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
            <Label for="habit-name" class="text-foreground mb-2 block text-sm font-medium"
              >Name</Label
            >
            <Input
              id="habit-name"
              name="name"
              bind:value={name}
              required
              maxlength={30}
              placeholder="Habit name (e.g., Drink Water)"
            />
            <div class="text-muted-foreground text-right text-xs">{name.length} / 30</div>
          </div>
          <div>
            <Label for="habit-description" class="text-foreground mb-2 block text-sm font-medium"
              >Description</Label
            >
            <Textarea
              id="habit-description"
              name="description"
              bind:value={description}
              placeholder="Optional: What, why, how?"
              rows={4}
              maxlength={500}
            />
            <div class="text-muted-foreground text-right text-xs">{description.length} / 500</div>
          </div>
          <div>
            <Label class="text-foreground mb-2 block text-sm font-medium">Type</Label>
            <Select.Root name="type" bind:value={type} type="single">
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
          </div>
          <div>
            <Label class="text-foreground mb-2 block text-sm font-medium">Calendar</Label>
            <Select.Root name="calendar" bind:value={selectedCalendarId} type="single">
              <Select.Trigger class="w-full md:w-[200px]">
                {calendars.find((c) => c.id === selectedCalendarId)?.name ?? "Select calendar"}
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  <Select.Label class="px-2 py-1.5 text-sm font-semibold">Calendars</Select.Label>
                  {#each calendars as cal (cal.id)}
                    <Select.Item value={cal.id} label={cal.name}>
                      {cal.name}
                    </Select.Item>
                  {/each}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </div>
          <div class="flex items-center gap-3 rounded-md border p-4">
            <Switch id="timerEnabled" bind:checked={timerEnabled} />
            <Label for="timerEnabled" class="text-foreground text-sm font-medium"
              >Enable Timer</Label
            >
          </div>
          {#if timerEnabled}
            <div class="ml-7">
              <Label
                for="habit-targetDurationSeconds"
                class="text-foreground mb-2 block text-sm font-medium"
              >
                Target Duration (seconds)
              </Label>
              <Input
                id="habit-targetDurationSeconds"
                name="targetDurationSeconds"
                type="number"
                min="1"
                bind:value={targetDurationSeconds}
                placeholder="e.g., 300 for 5 minutes"
                class="w-full md:w-48"
              />
            </div>
          {/if}
          <div>
            <Label for="habit-pointsValue" class="text-foreground mb-2 block text-sm font-medium"
              >Points Value</Label
            >
            <Input
              id="habit-pointsValue"
              name="pointsValue"
              type="number"
              min="0"
              bind:value={pointsValue}
              placeholder="Points for completion"
              class="w-full md:w-32"
            />
          </div>
          <div>
            <Label for="habit-position" class="text-foreground mb-2 block text-sm font-medium"
              >Position</Label
            >
            <Input
              id="habit-position"
              name="position"
              type="number"
              min="0"
              bind:value={position}
              placeholder="Order in list"
              class="w-full md:w-32"
              disabled={selectedCalendarId !== habit?.calendarId}
            />
            {#if selectedCalendarId !== habit?.calendarId}
              <p class="text-muted-foreground -mt-1 text-xs">
                Position is set automatically when changing calendar.
              </p>
            {/if}
          </div>
          <div class="flex items-center space-x-2">
            <Switch id="enabled-mode" bind:checked={isEnabled} />
            <Label for="enabled-mode">Enabled</Label>
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t pt-6">
            <Button type="button" variant="outline" onclick={handleClose} disabled={saving}
              >Cancel</Button
            >
            <Button
              type="button"
              variant="destructive"
              disabled={saving}
              onclick={() => (deleteDialogOpen = true)}>Delete</Button
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

    <!-- Delete confirmation dialog (outside form) -->
    <AlertDialog.Root bind:open={deleteDialogOpen}>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Delete Habit?</AlertDialog.Title>
          <AlertDialog.Description>
            This will permanently delete the habit "{habit?.name}" and all its completion data. This
            action cannot be undone. Are you sure?
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
          <AlertDialog.Action
            onclick={deleteHabit}
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={saving}
          >
            Confirm Delete
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Root>
  </Dialog.Content>
</Dialog.Root>
