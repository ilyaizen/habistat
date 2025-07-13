<script lang="ts">
  // Import necessary Svelte and SvelteKit modules for page functionality.
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  // Import stores and types for managing calendar data.
  import { calendarsStore, type Calendar } from "$lib/stores/calendars";
  import { get } from "svelte/store";

  // Import UI components from the library.
  import Button from "$lib/components/ui/button/button.svelte";
  import Input from "$lib/components/ui/input/input.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import * as Select from "$lib/components/ui/select";
  import Switch from "$lib/components/ui/switch/switch.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { COLOR_PALETTE } from "$lib/utils/colors";
  import { toast } from "svelte-sonner";

  /**
   * Extracts the calendar ID from the page parameters using Svelte 5 runes.
   * This value is reactive and will update if the page URL changes.
   */
  const calendarId = $derived(page.params.calendarId);

  // Component state using Svelte 5 runes for reactivity.
  let calendar = $state<Calendar | null>(null);
  let name = $state("");
  let colorTheme = $state("");
  let position = $state(0);
  let isEnabled = $state(true);
  let saving = $state(false);
  let deleteDialogOpen = $state(false);

  $effect(() => {
    const allCalendars = get(calendarsStore);
    const found = allCalendars.find((c) => c.id === calendarId);

    function populateForm(cal: Calendar) {
      calendar = cal;
      name = cal.name;
      colorTheme = cal.colorTheme;
      position = cal.position;
      isEnabled = cal.isEnabled === 1;
    }

    if (found) {
      populateForm(found);
    } else {
      calendarsStore.refresh().then(() => {
        const freshCalendars = get(calendarsStore);
        const freshFound = freshCalendars.find((c) => c.id === calendarId);
        if (freshFound) {
          populateForm(freshFound);
        } else {
          console.error("Calendar not found, redirecting.");
          goto("/dashboard");
        }
      });
    }
  });

  async function saveChanges() {
    if (!calendar) return;

    saving = true;
    try {
      await calendarsStore.update(calendar.id, {
        name,
        colorTheme,
        position,
        isEnabled: isEnabled ? 1 : 0
      });
      toast.success("Calendar updated successfully!");
      goto("/dashboard");
    } catch (error) {
      console.error("Failed to update calendar:", error);
      toast.error("Failed to update calendar. Please try again.");
    } finally {
      saving = false;
    }
  }

  function cancel() {
    goto("/dashboard");
  }

  async function deleteCalendar() {
    if (!calendar) return;
    saving = true;
    try {
      await calendarsStore.remove(calendar.id);
      toast.success("Calendar deleted.");
      goto("/dashboard");
    } catch (error) {
      console.error("Failed to delete calendar:", error);
      toast.error("Failed to delete calendar.");
    } finally {
      saving = false;
      deleteDialogOpen = false;
    }
  }
</script>

<!--
  This component provides a form to edit an existing calendar.
  It fetches the calendar's data on mount, allows the user to modify its properties,
  and saves the changes through the `calendarsStore`.
-->
<div class="mx-auto max-w-2xl p-6">
  <h1 class="mb-4 text-2xl font-bold">Edit Calendar</h1>

  {#if !calendar}
    <!-- Show a loading message while the calendar data is being fetched. -->
    <p>Loading calendar details...</p>
  {:else}
    <!-- Once data is loaded, display the form. -->
    <form onsubmit={saveChanges} class="flex flex-col gap-4">
      <div>
        <Label for="calendar-name" class="mb-1 block font-medium">Name</Label>
        <Input
          id="calendar-name"
          name="name"
          bind:value={name}
          required
          maxlength={50}
          placeholder="Calendar name"
        />
        <div class="text-muted-foreground text-right text-xs">{name.length} / 50</div>
      </div>

      <div>
        <Label class="mb-1 block font-medium">Color Theme</Label>
        <Select.Root name="colorTheme" bind:value={colorTheme} type="single">
          <Select.Trigger class="w-[180px]">
            {#if colorTheme}
              <span class="inline-flex items-center gap-2">
                <span
                  class="inline-block size-4 rounded-full border border-gray-200"
                  style="background:{colorTheme}"
                ></span>
                {COLOR_PALETTE.find((c) => c.value === colorTheme)?.name}
              </span>
            {:else}
              Select a color
            {/if}
          </Select.Trigger>
          <Select.Content class="h-60 overflow-y-auto">
            <Select.Group>
              {#each COLOR_PALETTE as color (color.value)}
                <Select.Item value={color.value} label={color.name}>
                  <span class="inline-flex items-center gap-2">
                    <span
                      class="inline-block size-4 rounded-full border border-gray-200"
                      style="background:{color.value}"
                    ></span>
                    {color.name}
                  </span>
                </Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </div>

      <div>
        <Label for="calendar-position" class="mb-1 block font-medium">Position</Label>
        <Input
          id="calendar-position"
          name="position"
          type="number"
          bind:value={position}
          required
          min={0}
        />
      </div>

      <div class="flex items-center space-x-2">
        <Switch id="enabled-mode" name="isEnabled" bind:checked={isEnabled} />
        <Label for="enabled-mode">Enabled</Label>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onclick={cancel} disabled={saving}>Cancel</Button>
        <Button
          type="button"
          variant="destructive"
          disabled={saving}
          onclick={() => (deleteDialogOpen = true)}>Delete</Button
        >
        <Button type="submit" disabled={saving}>
          {#if saving}
            Saving...
          {:else}
            Save Changes
          {/if}
        </Button>
      </div>
    </form>

    <!-- Delete confirmation dialog (outside form) -->
    <AlertDialog.Root bind:open={deleteDialogOpen}>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Delete Calendar?</AlertDialog.Title>
          <AlertDialog.Description>
            This will permanently delete the calendar "{calendar?.name}" and all its data. This
            action cannot be undone. Are you sure?
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
          <AlertDialog.Action
            onclick={deleteCalendar}
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={saving}
          >
            Confirm Delete
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Root>
  {/if}
</div>
