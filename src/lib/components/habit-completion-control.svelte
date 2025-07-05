<script lang="ts">
  import { Minus, Plus, Check, X } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button";
  import { completionsStore } from "$lib/stores/completions";
  import { triggerFireworks } from "$lib/stores/ui";
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
    triggerFireworks.set(habit.pointsValue ?? 1);
  }

  async function handleRemove() {
    await completionsStore.deleteLatestCompletionForToday(habit.id);
  }
</script>

{#if completionsToday === 0}
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
{:else}
  <div
    class="{isNegativeHabit
      ? 'bg-destructive/80'
      : 'bg-primary/80'} flex items-center gap-1 rounded-full p-0"
  >
    <Button
      size="icon"
      variant="ghost"
      class="h-6 w-6 rounded-full"
      onclick={handleRemove}
      aria-label="Remove one completion"
    >
      <Minus class="h-4 w-4" />
    </Button>
    <span class="min-w-5 text-center text-xs font-bold tabular-nums">{completionsToday}</span>
    <Button
      size="icon"
      variant="ghost"
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
{/if}
