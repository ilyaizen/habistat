<script lang="ts">
  import { slide } from "svelte/transition";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import * as Drawer from "$lib/components/ui/drawer/index.js";
  import { X } from "lucide-svelte";
  import { anonymousUserId } from "$lib/utils/tracking";
  import { goto } from "$app/navigation";

  // Props
  export let showMoreInfoButton = false;
  export let open = false;
  export let handleStart: () => void;
</script>

<Drawer.Root bind:open>
  <Drawer.Trigger>
    <!-- More Info Button (appears after user scrolls down) -->
    {#if showMoreInfoButton && !open}
      <div
        class="fixed bottom-0 left-1/2 z-[100] -translate-x-1/2 p-2"
        transition:slide={{ duration: 250 }}
      >
        <Button class={buttonVariants({ variant: "default" })} aria-label="Show more info">
          More Info
        </Button>
      </div>
    {/if}
  </Drawer.Trigger>

  <Drawer.Content class="mx-auto max-w-[90vw]">
    <div class="absolute top-4 right-4">
      <Drawer.Close class={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Close">
        <X class="h-4 w-4" />
      </Drawer.Close>
    </div>
    <Drawer.Header class="pt-6">
      <Drawer.Title>About Habistat</Drawer.Title>
      <Drawer.Description>
        <div class="flex h-[75vh] flex-col gap-2 overflow-y-auto">
          Habistat helps you track your daily habits and build better routines.<br />
          <span class="mt-2 block font-semibold">What can you do with Habistat?</span>
          <ul class="mt-2 list-inside list-disc text-left text-sm">
            <li>Set and monitor custom habit goals</li>
            <li>Visualize your progress over time</li>
            <li>Get reminders to stay on track</li>
            <li>Review your history and streaks</li>
            <li>Sync across devices (coming soon)</li>
          </ul>
          <span class="text-muted-foreground mt-4 block text-xs">
            Need help? Visit the <a href="/help" class="hover:text-primary underline">Help Center</a
            >.
          </span>

          <div class="mt-8 flex justify-center">
            {#if $anonymousUserId}
              <!-- Show "Dashboard" if an anonymous session ID exists -->
              <Button onclick={() => goto("/dashboard")} size="lg">Dashboard</Button>
            {:else}
              <!-- Show "Start" if no anonymous session ID exists -->
              <Button onclick={handleStart} size="lg">Start</Button>
            {/if}
          </div>
        </div>
      </Drawer.Description>
    </Drawer.Header>
  </Drawer.Content>
</Drawer.Root>
