<script lang="ts">
  import { slide } from "svelte/transition";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import * as Drawer from "$lib/components/ui/drawer";
  import { X } from "@lucide/svelte";
  import MoreInfo from "./more-info.svelte";
  import { getContext } from "svelte";

  // Svelte 5 props: make 'open' bindable
  let { showMoreInfoButton = false, open = $bindable(), handleStart } = $props();
</script>

<Drawer.Root bind:open>
  <Drawer.Trigger>
    <!-- More Info Button (appears after user scrolls down) -->
    {#if showMoreInfoButton && !open}
      <div
        class="fixed bottom-0 left-1/2 z-[100] -translate-x-1/2 p-2"
        transition:slide={{ duration: 250 }}
      >
        <Button
          class={`${buttonVariants({ variant: "outline" })} text-primary-background`}
          aria-label="Show more info"
        >
          More Info
        </Button>
      </div>
    {/if}
  </Drawer.Trigger>

  <Drawer.Content
    class="z-[150] mx-auto flex max-h-[95vh] max-w-[90vw] flex-col sm:max-h-[90vh] sm:max-w-2xl md:max-w-3xl lg:max-w-5xl"
  >
    <!--
      Sticky header (close button) stays at the top and full width
    -->
    <Drawer.Close
      class={`${buttonVariants({ variant: "outline", size: "icon" })} absolute top-2 right-2`}
      aria-label="Close"
    >
      <X class="h-4 w-4" />
    </Drawer.Close>
    <!-- Main About/More Info content is now in a separate component for clarity and reusability -->
    <MoreInfo {open} {handleStart} onClose={() => (open = false)} />
  </Drawer.Content>
</Drawer.Root>
