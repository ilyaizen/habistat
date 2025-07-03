<script lang="ts">
  import { calendarsStore } from "$lib/stores/calendars";
  import Input from "$lib/components/ui/input/input.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import { goto } from "$app/navigation";
  import * as Select from "$lib/components/ui/select";
  import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";

  let name = $state("");

  const COLOR_PALETTE = [
    { name: "Lime", value: "#84cc16" },
    { name: "Green", value: "#22c55e" },
    { name: "Emerald", value: "#10b981" },
    { name: "Teal", value: "#14b8a6" },
    { name: "Cyan", value: "#06b6d4" },
    { name: "Sky", value: "#0ea5e9" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Indigo", value: "#6366f1" },
    { name: "Violet", value: "#8b5cf6" },
    { name: "Purple", value: "#a21caf" },
    { name: "Fuchsia", value: "#d946ef" },
    { name: "Pink", value: "#ec4899" },
    { name: "Rose", value: "#f43f5e" },
    { name: "Red", value: "#ef4444" },
    { name: "Orange", value: "#f97316" },
    { name: "Amber", value: "#f59e42" },
    { name: "Yellow", value: "#eab308" }
  ];
  let colorTheme = $state("#84cc16");
  let saving = $state(false);

  // Derived trigger content: show selected color circle and name
  const triggerContent = $derived(
    COLOR_PALETTE.find((c) => c.value === colorTheme)?.name ?? "Select a color"
  );

  async function saveCalendar(event: SubmitEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    saving = true;
    try {
      await calendarsStore.add({
        name,
        colorTheme
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
