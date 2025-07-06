<script lang="ts">
  import { Minus, Check, X } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button";
  import { completionsStore } from "$lib/stores/completions";
  // import { triggerConfetti } from "$lib/stores/ui";
  import { calendarsStore } from "$lib/stores/calendars";
  import { getContext } from "svelte";
  import type { Habit } from "$lib/stores/habits";
  import type { UserResource } from "@clerk/types";
  import type { Readable } from "svelte/store";

  let { habit, completionsToday = 0 } = $props<{
    habit: Habit;
    completionsToday: number;
  }>();

  // Get current user from context
  const clerkUserStore = getContext<Readable<UserResource | null>>("clerkUser");

  // Determine if this is a negative habit
  const isNegativeHabit = $derived(habit.type === "negative");

  // Get calendar color for confetti
  const calendarColor = $derived(() => {
    const calendars = $calendarsStore;
    const calendar = calendars.find((c) => c.id === habit.calendarId);
    return calendar?.colorTheme || "#3b82f6"; // Default to blue if calendar not found
  });

  // Store the position of the add button for confetti origin
  let addButtonPosition = { x: 0, y: 0 };

  /**
   * Action to capture and track the position of the add button
   * @param node - The HTML element wrapping the button
   */
  function trackButtonPosition(node: HTMLElement) {
    function updatePosition() {
      const rect = node.getBoundingClientRect();
      addButtonPosition = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

    // Update position initially and on resize
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return {
      destroy() {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition);
      }
    };
  }

  async function handleAdd() {
    let userId: string | null = null;

    // Get current user ID
    if (clerkUserStore) {
      const unsubscribe = clerkUserStore.subscribe((user) => {
        userId = user?.id || null;
      });
      unsubscribe(); // Immediately unsubscribe after getting value
    }

    await completionsStore.logCompletion(habit.id, userId);

    // Trigger confetti with calendar color, habit points, and button position
    // triggerConfetti.set({
    //   color: calendarColor(),
    //   points: habit.pointsValue ?? 1,
    //   originX: addButtonPosition.x,
    //   originY: addButtonPosition.y
    // });
  }

  async function handleRemove() {
    await completionsStore.deleteLatestCompletionForToday(habit.id);
  }
</script>

{#if completionsToday === 0}
  <div use:trackButtonPosition>
    <Button
      size="icon"
      variant="outline"
      class="h-6 w-6 rounded-full border-dashed {isNegativeHabit
        ? 'border-destructive/50 text-destructive'
        : ''}"
      onclick={handleAdd}
      aria-label="Complete habit for the first time today"
    >
      {#if isNegativeHabit}
        <X class="h-4 w-4" />
      {:else}
        <Check class="text-primary h-4 w-4" />
      {/if}
    </Button>
  </div>
{:else}
  <div
    class="{isNegativeHabit
      ? 'bg-destructive/60'
      : 'bg-primary/60'} flex items-center gap-1 rounded-full p-0"
  >
    <Button
      size="icon"
      variant="link"
      class="h-6 w-6 rounded-full"
      onclick={handleRemove}
      aria-label="Remove one completion"
    >
      <Minus class="h-4 w-4" />
    </Button>
    <span class="min-w-5 text-center text-xs font-bold tabular-nums">{completionsToday}</span>
    <div use:trackButtonPosition>
      <Button
        size="icon"
        variant="link"
        class="h-6 w-6 rounded-full"
        onclick={handleAdd}
        aria-label="Add one completion"
      >
        {#if isNegativeHabit}
          <X class="h-4 w-4" />
        {:else}
          <Check class="h-4 w-4" />
        {/if}
      </Button>
    </div>
  </div>
{/if}
