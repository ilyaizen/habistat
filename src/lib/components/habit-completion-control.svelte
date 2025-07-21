<script lang="ts">
  /**
   * @component HabitCompletionControl
   * @description
   * This component provides UI controls for logging and managing completions for a given habit.
   * It displays different controls based on whether the habit has been completed today and
   * adapts its appearance for positive vs. negative habits.
   */
  import { Minus, Check, X } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button";
  import { completionsStore } from "$lib/stores/completions";
  import { triggerConfetti } from "$lib/stores/ui";
  import { calendarsStore } from "$lib/stores/calendars";
  import { getContext } from "svelte";
  import type { Habit } from "$lib/stores/habits";
  import type { UserResource } from "@clerk/types";
  import type { Readable } from "svelte/store";
  import NumberFlow from "$lib/vendor/number-flow/NumberFlow.svelte";

  // --- Component Properties ---
  let { habit, completionsToday = 0 } = $props<{
    /** The habit object to be managed. */
    habit: Habit;
    /** The number of times the habit has been completed today. */
    completionsToday: number;
  }>();

  // --- Context & State ---

  // Get current user from context to associate completions with the correct user.
  const clerkUserStore = getContext<Readable<UserResource | null>>("clerkUser");

  // Determine if this is a negative habit (e.g., something to avoid).
  const isNegativeHabit = $derived(habit.type === "negative");

  // Get the associated calendar's color theme, defaulting to blue if not found.
  // This is used for theming elements like confetti.
  const calendarColor = $derived(() => {
    const calendars = $calendarsStore;
    const calendar = calendars.find((c) => c.id === habit.calendarId);
    return calendar?.colorTheme || "#3b82f6"; // Default to blue
  });

  // Store the screen position of the add button, used for positioning UI effects like confetti.
  let addButtonPosition = { x: 0, y: 0 };

  // --- Actions & Event Handlers ---

  /**
   * A Svelte action that captures and tracks the real-time position of an HTML element.
   * This is used to make UI effects, like confetti, originate from the button that was clicked.
   * @param node The HTML element to track.
   */
  function trackButtonPosition(node: HTMLElement) {
    function updatePosition() {
      const rect = node.getBoundingClientRect();
      addButtonPosition = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

    // Update position on mount and whenever the window is resized or scrolled.
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return {
      destroy() {
        // Clean up event listeners when the element is removed from the DOM.
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition);
      }
    };
  }

  /**
   * Handles adding a new completion for the habit.
   * It captures the current user's ID and logs the completion.
   * For positive habits, triggers confetti effect from the button position.
   */
  async function handleAdd() {
    let userId: string | null = null;

    // Get the current user's ID from the Clerk store.
    if (clerkUserStore) {
      const unsubscribe = clerkUserStore.subscribe((user) => {
        userId = user?.id || null;
      });
      unsubscribe(); // Immediately unsubscribe to avoid memory leaks.
    }

    await completionsStore.logCompletion(habit.id, userId);

    // Trigger confetti effect for positive habits only
    if (!isNegativeHabit) {
      triggerConfetti.set({
        color: calendarColor(),
        points: habit.pointsValue ?? 1,
        originX: addButtonPosition.x,
        originY: addButtonPosition.y
      });
    }
  }

  /**
   * Handles removing the most recent completion for the current day.
   */
  async function handleRemove() {
    await completionsStore.deleteLatestCompletionForToday(habit.id);
  }
</script>

<!--
  Initial state: No completions logged for today.
  - A single button is shown to log the first completion.
  - The style adapts for negative habits (e.g., red border, 'X' icon).
-->
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
  <!--
  Active state: At least one completion has been logged.
  - A compact control group is shown with buttons to add or remove completions.
  - The `NumberFlow` component displays an animated count of today's completions.
  -->
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
    <div class="min-w-5 text-center text-xs font-bold tabular-nums">
      <NumberFlow value={completionsToday} />
    </div>
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
