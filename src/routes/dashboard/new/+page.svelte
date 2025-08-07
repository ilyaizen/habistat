<script lang="ts">
  import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
  import { goto } from "$app/navigation";
  import Button from "$lib/components/ui/button/button.svelte";
  import Input from "$lib/components/ui/input/input.svelte";
  import * as Select from "$lib/components/ui/select";
  import { calendarsStore } from "$lib/stores/calendars";
  import {
    ALLOWED_CALENDAR_COLORS,
    normalizeCalendarColor,
    colorNameToCss
  } from "$lib/utils/colors";

  let name = $state("");
  // Store colorTheme as a NAME (lowercase). UI renders swatches via colorNameToHex.
  let colorTheme = $state("lime");
  let saving = $state(false);

  // Helper to display a capitalized label for the selected color name.
  const displayName = (n: string) => (n ? n.charAt(0).toUpperCase() + n.slice(1) : n);

  async function saveCalendar(event: SubmitEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    saving = true;
    try {
      await calendarsStore.add({
        name,
        colorTheme: normalizeCalendarColor(colorTheme)
      });
      goto(`/dashboard`);
    } catch (error) {
      console.error("Failed to save calendar:", error);
      // Optionally, show an error message to the user
      // alert("Error saving calendar. Please try again.");
    } finally {
      saving = false;
    }
  }
</script>

<div class="mx-auto max-w-2xl p-6">
  <h1 class="mb-4 text-2xl font-bold">New Calendar</h1>
  <form onsubmit={saveCalendar} class="flex flex-col gap-4">
    <div>
      <label class="mb-1 block font-medium">
        Name
        <Input
          id="calendar-name"
          name="name"
          autocomplete="name"
          bind:value={name}
          required
          placeholder="Calendar name (e.g., Hobbies, Fitness, Negative)"
        />
      </label>
    </div>
    <div>
      <label class="mb-1 block font-medium">
        Color Theme
        <Select.Root name="colorTheme" type="single" bind:value={colorTheme}>
          <Select.Trigger class="w-[180px]">
            {#if colorTheme}
              <span class="inline-flex items-center gap-2">
                <span
                  class="inline-block size-4 rounded-full border border-gray-200"
                  style="background:{colorNameToCss(colorTheme)}"
                ></span>
                {displayName(colorTheme)}
              </span>
            {:else}
              Select a color
            {/if}
          </Select.Trigger>
          <Select.Content class="h-60 overflow-y-auto">
            <Select.Group>
              {#each ALLOWED_CALENDAR_COLORS as cName (cName)}
                <Select.Item value={cName} label={displayName(cName)}>
                  <span class="inline-flex items-center gap-2">
                    <span
                      class="inline-block size-4 rounded-full border border-gray-200"
                      style="background:{colorNameToCss(cName)}"
                    ></span>
                    {displayName(cName)}
                  </span>
                </Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </label>
    </div>
    <div class="mt-4 flex justify-end gap-2">
      <Button type="button" onclick={() => goto("/dashboard")} variant="outline">
        <ArrowLeftIcon class="mr-1 size-5" />
        Back
      </Button>
      <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create"}</Button>
    </div>
  </form>
</div>
