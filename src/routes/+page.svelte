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
  import { getContext } from "svelte";
  import { get } from "svelte/store";
  import { slide } from "svelte/transition";
  import { toast } from "svelte-sonner";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import { triggerIntroConfetti } from "$lib/stores/ui";
  import ThemeToggle from "$lib/components/theme-toggle.svelte";

  import { anonymousUserId, sessionStore } from "$lib/utils/tracking";

  // --- Drawer Controller ---
  // Get the singleton drawer controller from the root layout context.
  const drawerController = getContext<{
    registerHandleStart: (fn: () => void) => void;
    open: () => void;
    close: () => void;
  }>("drawer-controller");

  // State management using Svelte 5 runes ($state)
  let showMoreInfoButton = $state(false);
  let sessionStarting = $state(false);
  let videoElement: HTMLVideoElement;
  let videoLoading = $state(true);
  let videoError = $state(false);

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
        // Show Lottie intro celebration once
        triggerIntroConfetti.set({ speed: 1.5, allowSkip: true });
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
      window.addEventListener("touchstart", handleTouchStart, {
        passive: true
      });
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

  // Video loading handlers
  function handleVideoCanPlay() {
    videoLoading = false;
    videoError = false;
  }

  function handleVideoError() {
    videoLoading = false;
    videoError = true;
    console.error("Video failed to load");
  }
</script>

<!-- Main landing page layout - Two pane design -->
<div class="grid min-h-screen grid-cols-1" class:lg:grid-cols-2={!videoError}>
  <!-- Left pane: Intro content -->
  <div
    class="relative flex flex-col items-center justify-center px-8 py-12 text-center"
    class:lg:px-16={!videoError}
  >
    <div class="absolute top-2 right-2">
      <ThemeToggle />
    </div>

    <img
      src="/logo.svg"
      alt="Habistat Logo"
      class="mb-8 h-16 w-16 drop-shadow-xs drop-shadow-green-950/80 lg:h-20 lg:w-20"
    />
    <h1 class="mb-6 text-4xl font-bold lg:text-5xl">Habistat</h1>
    <p class="text-muted-foreground text-md mb-8 max-w-md leading-relaxed lg:text-lg">
      Build habits. Track progress. Achieve goals.
    </p>
    {#if $anonymousUserId}
      <!-- Show Dashboard button for returning users -->
      <Button onclick={handleDashboardClick} size="2xl" disabled={sessionStarting}>
        {sessionStarting ? "Loading..." : "Go to Habits"}
      </Button>
    {:else}
      <!-- Show Start button for new users -->
      <Button onclick={handleStart} size="2xl" disabled={sessionStarting}>
        {sessionStarting ? "Starting..." : "Get Started"}
      </Button>
    {/if}
  </div>

  <!-- Right pane: Video background -->
  {#if !videoError}
    <div class="relative z-0 h-[50vh] w-full overflow-hidden lg:h-full">
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="relative h-[98%] w-[98%] overflow-hidden rounded-lg">
          <!-- Loading skeleton -->
          {#if videoLoading}
            <div
              class="bg-muted absolute inset-0 flex animate-pulse items-center justify-center rounded-lg"
            >
              <div class="text-muted-foreground text-sm">Loading video...</div>
            </div>
          {/if}

          <!-- Video element -->
          <video
            bind:this={videoElement}
            src="/intro_twilight_xs.mp4"
            autoplay
            muted
            loop
            playsinline
            preload="auto"
            oncanplay={handleVideoCanPlay}
            onerror={handleVideoError}
            class="pointer-events-none -z-10 h-full w-full object-cover opacity-95 transition-opacity duration-300"
            class:opacity-0={videoLoading}
            aria-label="Habistat introduction video background"
          ></video>
        </div>
      </div>
    </div>
  {/if}
</div>

<!--
  The AboutDrawer is inside the root layout, triggered by the hidden More Info button.
  This page now communicates with it through the 'drawer-controller' context.
-->
{#if showMoreInfoButton}
  <div
    class="fixed -bottom-2 left-1/2 z-[100] -translate-x-1/2"
    transition:slide={{ duration: 250 }}
  >
    <Button
      onclick={() => drawerController.open()}
      variant="secondary"
      size="xl"
      aria-label="Show more info"
    >
      More Info
    </Button>
  </div>
{/if}
