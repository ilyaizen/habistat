<!-- /**
 * Landing Page Component
 *
 * This is the main landing page for Habistat, featuring:
 * - A welcome screen with logo and start/dashboard button
 * - An information drawer that can be revealed via scroll/touch
 * - Session management for new and returning users
 * - Touch and scroll event handling for mobile and desktop
 */ -->

<script lang="ts">
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import { goto } from "$app/navigation";
  import { anonymousUserId, sessionStore } from "$lib/utils/tracking";
  import { browser } from "$app/environment";
  import { getContext } from "svelte";
  import { get, type Writable } from "svelte/store";
  import { triggerFireworks } from "$lib/stores/ui";
  import { triggerConfetti } from "$lib/stores/ui";
  import { toast } from "svelte-sonner";
  import { slide } from "svelte/transition";

  // --- Drawer Controller ---
  // Get the singleton drawer controller from the root layout context.
  const drawerController = getContext<any>("drawer-controller");

  // State management using Svelte 5 runes ($state)
  let showMoreInfoButton = $state(false);
  let sessionStarting = $state(false);

  // When the component mounts, check if a session exists.
  // If not, open the singleton drawer and register this page's `handleStart` function.
  $effect(() => {
    if (browser) {
      const session = get(sessionStore);
      if (!session) {
        drawerController.registerHandleStart(handleStart);
        drawerController.open();
      }
    }
  });

  /**
   * Handles the START button click action.
   * This now communicates with the singleton drawer in the layout.
   */
  async function handleStart() {
    if (sessionStarting) return;

    try {
      sessionStarting = true;

      // Close the singleton drawer and wait for its animation.
      drawerController.close();
      await new Promise((resolve) => setTimeout(resolve, 300));

      const session = sessionStore.ensure();

      if (session?.id) {
        triggerFireworks.set(true);
        triggerConfetti.set(true);
        toast.success("Session created!", {
          description: "Welcome to Habistat!"
        });
        await goto("/dashboard");
      } else {
        throw new Error("Failed to ensure session");
      }
    } catch (error) {
      console.error("+page.svelte: Error during session ensuring:", error);
    } finally {
      sessionStarting = false;
    }
  }

  /**
   * Clean navigation handler for the dashboard button.
   */
  function handleDashboardClick() {
    // Use SvelteKit's goto for client-side navigation
    goto("/dashboard").catch((error) => {
      console.error("Navigation to dashboard failed:", error);
      toast.error("Navigation failed", {
        description: `Error: ${error.message || error}`
      });
    });
  }

  // Scroll detection state
  let shown = false;

  function handleWheel(e: WheelEvent) {
    // We only want to show the "More Info" button if the drawer is NOT open.
    const drawerIsOpen = document.querySelector('[data-vaul-drawer-visible="true"]');
    if (!drawerIsOpen) {
      if (e.deltaY > 0 && !shown) {
        showMoreInfoButton = true;
        shown = true;
      } else if (e.deltaY < 0 && shown) {
        showMoreInfoButton = false;
        shown = false;
      }
    }
  }

  // Touch event handling for mobile devices
  let lastTouchY: number | null = null;

  function handleTouchStart(e: TouchEvent) {
    lastTouchY = e.touches[0]?.clientY ?? null;
  }
  function handleTouchMove(e: TouchEvent) {
    const drawerIsOpen = document.querySelector('[data-vaul-drawer-visible="true"]');
    if (!drawerIsOpen && lastTouchY !== null) {
      const deltaY = e.touches[0].clientY - lastTouchY;
      if (deltaY < -10 && !shown) {
        showMoreInfoButton = true;
        shown = true;
      } else if (deltaY > 10 && shown) {
        showMoreInfoButton = false;
        shown = false;
      }
    }
  }

  // Event listener management using $effect
  $effect(() => {
    if (browser) {
      window.addEventListener("wheel", handleWheel, { passive: true });
      window.addEventListener("touchstart", handleTouchStart, { passive: true });
      window.addEventListener("touchmove", handleTouchMove, { passive: true });

      return () => {
        window.removeEventListener("wheel", handleWheel);
        window.removeEventListener("touchstart", handleTouchStart);
        window.removeEventListener("touchmove", handleTouchMove);
      };
    }
  });

  // The logic to hide the button when the drawer is open has been removed for simplification.
  // The drawer will now cover the button, which is the intended behavior.
</script>

<!-- Main landing page layout -->
<div class="flex min-h-screen flex-col items-center justify-center">
  <img
    src="/logo.svg"
    alt="Habistat Logo"
    class="mb-8 h-26 w-26 drop-shadow-xs drop-shadow-green-950/80"
  />
  <h1 class="mb-4 text-5xl font-bold">Habistat</h1>
  <!-- Responsive tagline: adjusts font size, alignment, and margin for different screen sizes -->
  <p
    class="text-muted-foreground mb-6 text-center text-base sm:text-lg md:mb-8 md:text-left md:text-xl lg:text-2xl"
  >
    Build habits. Track progress. Achieve goals.
  </p>
  {#if $anonymousUserId}
    <!-- Show Dashboard button for returning users -->
    <Button onclick={handleDashboardClick} size="lg" disabled={sessionStarting} class="btn-3d">
      {sessionStarting ? "Loading..." : "Go to Habits"}
    </Button>
  {:else}
    <!-- Show Start button for new users -->
    <Button onclick={handleStart} size="lg" disabled={sessionStarting} class="btn-3d">
      {sessionStarting ? "Starting..." : "Get Started"}
    </Button>
  {/if}
</div>

<!--
  The AboutDrawer is inside the root layout, triggered by the hidden More Info button.
  This page now communicates with it through the 'drawer-controller' context.
-->
{#if showMoreInfoButton}
  <div
    class="fixed bottom-0 left-1/2 z-[100] -translate-x-1/2 p-2"
    transition:slide={{ duration: 250 }}
  >
    <Button
      onclick={() => drawerController.open()}
      class={`${buttonVariants({ variant: "outline" })} text-primary-background`}
      aria-label="Show more info"
    >
      More Info
    </Button>
  </div>
{/if}
