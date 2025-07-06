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

  /**
   * Extracts the calendar ID from the page parameters using Svelte 5 runes.
   * This value is reactive and will update if the page URL changes.
   */
  const calendarId = $derived(page.params.calendarId);

  // Component state using Svelte 5 runes for reactivity.
  let calendar = $state<Calendar | null>(null); // Holds the full calendar object being edited.
  let name = $state(""); // The name of the calendar.
  let colorTheme = $state("#3b82f6"); // The selected color theme for the calendar.
  let position = $state(99); // The display order of the calendar.
  let isEnabled = $state(true); // Toggles the calendar's active status.
  let saving = $state(false); // Tracks the save operation's state to prevent multiple submissions.
  let deleteDialogOpen = $state(false); // Controls visibility of delete confirmation dialog

  /**
   * `onMount` is a lifecycle function that runs when the component is first added to the DOM.
   * It's used here to fetch the specific calendar's data for editing.
   */
  $effect(() => {
    // Attempt to find the calendar in the already-loaded store data.
    const allCalendars = get(calendarsStore);
    const found = allCalendars.find((c) => c.id === calendarId);

    if (found) {
      // If found, populate the component's state with its data.
      calendar = found;
      name = found.name;
      colorTheme = found.colorTheme;
      position = found.position;
      isEnabled = found.isEnabled === 1;
    } else {
      // If not found, it might be because the store hasn't been populated from the DB yet.
      // Force a refresh from the database and try finding it again.
      calendarsStore.refresh().then(() => {
        const freshCalendars = get(calendarsStore);
        const freshFound = freshCalendars.find((c) => c.id === calendarId);
        if (freshFound) {
          calendar = freshFound;
          name = freshFound.name;
          colorTheme = freshFound.colorTheme;
          position = freshFound.position;
          isEnabled = freshFound.isEnabled === 1;
        } else {
          // If the calendar still can't be found, it likely doesn't exist.
          // Log an error and redirect the user to the dashboard.
          console.error("Calendar not found, redirecting.");
          goto("/dashboard");
        }
      });
    }
  });

  /**
   * Handles the form submission to save changes to the calendar.
   * It updates the calendar in the store and redirects upon completion.
   * @param {SubmitEvent} event - The form submission event.
   */
  async function saveChanges(event: SubmitEvent) {
    event.preventDefault(); // Prevent the default browser form submission.
    if (!calendar) return; // Guard against saving if no calendar is loaded.

    saving = true; // Set saving state to disable UI and provide feedback.
    try {
      // Call the store's update method with the new data.
      await calendarsStore.update(calendar.id, {
        name,
        colorTheme,
        position,
        isEnabled: isEnabled ? 1 : 0
      });
      goto("/dashboard"); // Redirect to the dashboard after a successful save.
    } catch (error) {
      console.error("Failed to update calendar:", error);
      // In a real-world app, you might show a user-facing error message here.
    } finally {
      saving = false; // Reset the saving state regardless of outcome.
    }
  }

  /**
   * Navigates the user back to the dashboard without saving changes.
   */
  function cancel() {
    goto("/dashboard");
  }

  /**
   * Handles deleting the current calendar after user confirmation.
   */
  async function deleteCalendar() {
    if (!calendar) return;
    saving = true;
    try {
      await calendarsStore.remove(calendar.id);
      goto("/dashboard");
    } catch (error) {
      console.error("Failed to delete calendar:", error);
      // Optionally show a user-facing error message here.
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
      <!-- Input for Calendar Name -->
      <div>
        <Label class="mb-1 block font-medium">
          Name
          <Input
            id="calendar-name"
            name="name"
            autocomplete="name"
            bind:value={name}
            required
            placeholder="Calendar name"
          />
        </Label>
      </div>

      <!-- Select component for choosing a color theme. -->
      <div>
        <Label class="mb-1 block font-medium">
          Color Theme
          <Select.Root name="colorTheme" type="single" bind:value={colorTheme}>
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
        </Label>
      </div>

      <!-- Input for Calendar Position -->
      <div>
        <Label class="mb-1 block font-medium">
          Position
          <Input
            id="calendar-position"
            name="position"
            autocomplete="off"
            type="number"
            bind:value={position}
            required
          />
        </Label>
      </div>

      <!-- Switch to enable or disable the calendar -->
      <div class="flex items-center space-x-2">
        <Switch id="enabled-mode" name="isEnabled" bind:checked={isEnabled} />
        <Label for="enabled-mode">Enabled</Label>
      </div>

      <!-- Form action buttons -->
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
