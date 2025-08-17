<script lang="ts">
  /**
   * @component HabitCompletionControl
   * @description
   * This component provides UI controls for logging and managing completions for a given habit.
   * It displays different controls based on whether the habit has been completed today and
   * adapts its appearance for positive vs. negative habits.
   */

  import type { UserResource } from "@clerk/types";
  import { Check, Minus, X } from "@lucide/svelte";
  import { getContext } from "svelte";
  import type { Readable } from "svelte/store";
  import { Button } from "$lib/components/ui/button";
  import { calendarsStore } from "$lib/stores/calendars";
  import { completionsStore } from "$lib/stores/completions";
  import type { Habit } from "$lib/stores/habits";
  import { triggerConfetti, triggerFireworksAt, triggerDamageAt } from "$lib/stores/ui";
  import NumberFlow from "$lib/vendor/number-flow/NumberFlow.svelte";
  import { colorNameToCss } from "$lib/utils/colors";

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

  // Get the associated calendar's color theme NAME and map to HEX for UI effects.
  // Stored in DB as a name; convert here purely for rendering/effects.
  const calendarColor = $derived(() => {
    const calendars = $calendarsStore;
    const calendar = calendars.find((c) => c.id === habit.calendarId);
    // Return OKLCH CSS color string based on stored name. Defaults to indigo internally.
    return colorNameToCss(calendar?.colorTheme ?? "");
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
  async function handleAdd(event?: MouseEvent) {
    let userId: string | null = null;

    // Get the current user's ID from the Clerk store.
    if (clerkUserStore) {
      const unsubscribe = clerkUserStore.subscribe((user) => {
        userId = user?.id || null;
      });
      unsubscribe(); // Immediately unsubscribe to avoid memory leaks.
    }

    // Determine precise origin at click time: prefer mouse coordinates; fallback to element center
    let originX = addButtonPosition.x;
    let originY = addButtonPosition.y;
    if (event && typeof event.clientX === "number" && typeof event.clientY === "number") {
      originX = event.clientX;
      originY = event.clientY;
    } else {
      const targetEl = (event?.currentTarget as HTMLElement) || null;
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        originX = rect.left + rect.width / 2;
        originY = rect.top + rect.height / 2;
      }
    }

    // Trigger visual effects immediately before async work
    // - Positive habits: confetti + fireworks from the click origin
    // - Negative habits: damage effect (red vignette + desaturation + shake)
    if (!isNegativeHabit) {
      const color = calendarColor();
      const points = habit.pointsValue ?? 1;
      triggerConfetti.set({ color, points, originX, originY });
      triggerFireworksAt(originX, originY, points, color);
    } else {
      // Normalize points [1..50] to damage intensity [0.2..1]
      const rawPoints = habit.pointsValue ?? 1;
      const clamped = Math.max(1, Math.min(50, Math.floor(rawPoints)));
      const fraction = clamped / 50; // 1->0.02, 50->1
      const intensity = Math.max(0.2, Math.min(1, 0.2 + fraction * 0.8));
      triggerDamageAt(originX, originY, intensity);
    }

    // Perform logging after visual feedback
    await completionsStore.logCompletion(habit.id, userId);

    // Trigger confetti effect for positive habits only
    // No-op: visual effects already handled above for positive habits
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
