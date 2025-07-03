<script lang="ts">
  import { Minus, Plus, Check } from "@lucide/svelte";
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
    class="h-[26px] w-[26px] rounded-full border-dashed"
    onclick={handleAdd}
    aria-label="Complete habit for the first time today"
  >
    <Check class="text-muted-foreground h-4 w-4" />
  </Button>
{:else}
  <div class="bg-primary/50 flex items-center gap-1 rounded-full border p-0">
    <Button
      size="icon"
      variant="ghost"
      class="h-6 w-6 rounded-full"
      onclick={handleRemove}
      aria-label="Remove one completion"
    >
      <Minus class="h-4 w-4" />
    </Button>
    <span
      class="text-primary text-xs font-bold tabular-nums"
      style="min-width: 18px; text-align: center;">{completionsToday}</span
    >
    <Button
      size="icon"
      variant="ghost"
      class="h-6 w-6 rounded-full"
      onclick={handleAdd}
      aria-label="Add one completion"
    >
      <Plus class="h-4 w-4" />
    </Button>
  </div>
{/if}
