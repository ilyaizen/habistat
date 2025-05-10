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
  import { Button } from "$lib/components/ui/button";
  import AboutDrawer from "$lib/components/about-drawer.svelte";
  import { goto } from "$app/navigation";
  import { anonymousUserId, sessionStore } from "$lib/utils/tracking";
  import { browser } from "$app/environment";
  import { getContext } from "svelte";
  import { get, type Writable } from "svelte/store";
  import { triggerFireworks } from "$lib/stores/fireworks";

  // Get online status from context
  const isOnline = getContext<Writable<boolean>>("isOnline");
  const authMode = getContext<Writable<"offline" | "online">>("authMode");

  // State management using Svelte 5 runes ($state)
  let showMoreInfoButton = $state(false);
  let drawerOpen = $state(false);
  let initialCheckDone = $state(false);
  let sessionStarting = $state(false);

  // Initialize drawer state based on user session
  $effect(() => {
    if (!initialCheckDone && browser) {
      const session = get(sessionStore);
      drawerOpen = !session; // Open drawer if no session exists
      initialCheckDone = true;
    }
  });

  /**
   * Handles the START button click action
   * Creates a new session for new users and redirects to dashboard
   */
  async function handleStart() {
    if (sessionStarting) return;

    try {
      sessionStarting = true;
      console.log("+page.svelte: handleStart called");
      const session = sessionStore.ensure(); // Only create session when Start is clicked

      if (session?.id) {
        console.log("+page.svelte: Session ensured, navigating to dashboard.");
        // Trigger fireworks effect after successful session start
        triggerFireworks.set(true);
        await goto("/dashboard");
      } else {
        console.error("+page.svelte: Failed to ensure session.");
        throw new Error("Failed to ensure session");
      }
    } catch (error) {
      console.error("+page.svelte: Error during session ensuring:", error);
      // Show error state (you might want to add a UI element for this)
    } finally {
      sessionStarting = false;
    }
  }

  // Scroll detection state
  let shown = false; // Tracks if the more info button has been shown

  /**
   * Handles mouse wheel events for showing/hiding the more info button
   * Shows button on downward scroll, hides on upward scroll
   * Only active when drawer is closed
   */
  function handleWheel(e: WheelEvent) {
    if (!drawerOpen) {
      if (e.deltaY > 0 && !shown) {
        // Scrolling down
        showMoreInfoButton = true;
        shown = true;
      } else if (e.deltaY < 0 && shown) {
        // Scrolling up
        showMoreInfoButton = false;
        shown = false;
      }
    }
  }

  // Touch event handling for mobile devices
  let lastTouchY: number | null = null; // Stores the last touch Y position

  /**
   * Touch event handlers for mobile gesture detection
   * Shows/hides more info button based on swipe direction
   * Uses a 10px threshold for gesture detection
   */
  function handleTouchStart(e: TouchEvent) {
    lastTouchY = e.touches[0]?.clientY ?? null;
  }
  function handleTouchMove(e: TouchEvent) {
    if (!drawerOpen && lastTouchY !== null) {
      const deltaY = e.touches[0].clientY - lastTouchY;
      if (deltaY < -10 && !shown) {
        // Swipe up (scroll down)
        showMoreInfoButton = true;
        shown = true;
      } else if (deltaY > 10 && shown) {
        // Swipe down
        showMoreInfoButton = false;
        shown = false;
      }
    }
  }

  // Event listener management using $effect
  $effect(() => {
    if (browser) {
      // Add event listeners with passive option for better scroll performance
      window.addEventListener("wheel", handleWheel, { passive: true });
      window.addEventListener("touchstart", handleTouchStart, { passive: true });
      window.addEventListener("touchmove", handleTouchMove, { passive: true });

      // Cleanup: Remove event listeners when component is destroyed
      return () => {
        window.removeEventListener("wheel", handleWheel);
        window.removeEventListener("touchstart", handleTouchStart);
        window.removeEventListener("touchmove", handleTouchMove);
      };
    }
  });

  // Hide more info button when drawer is opened
  $effect(() => {
    if (drawerOpen) {
      showMoreInfoButton = false;
      shown = false;
    }
  });
</script>

<!-- Main landing page layout -->
<div class="mt-32 flex h-full flex-col items-center justify-center text-center">
  <img src="/logo.svg" alt="Habistat Logo" class="mb-6 h-30 w-30" />
  <h1 class="mb-4 text-4xl font-bold">Habistat</h1>
  <p class="text-muted-foreground mb-8 text-lg">Track your habits, build your future.</p>

  {#if !$isOnline && $authMode === "online"}
    <p class="text-muted-foreground mb-4">
      You are currently offline. Your data will be stored locally.
    </p>
  {/if}

  {#if $anonymousUserId}
    <!-- Show Dashboard button for returning users -->
    <Button onclick={() => goto("/dashboard")} size="lg" disabled={sessionStarting} class="btn-3d">
      {sessionStarting ? "Loading..." : "Dashboard"}
    </Button>
  {:else}
    <!-- Show Start button for new users -->
    <Button onclick={handleStart} size="lg" disabled={sessionStarting} class="btn-3d">
      {sessionStarting ? "Starting..." : "Start"}
    </Button>
  {/if}
</div>

<!-- Information drawer component with two-way binding for open state -->
<AboutDrawer {showMoreInfoButton} bind:open={drawerOpen} {handleStart} />

<style>
  /* Removed previous .start-button-custom styles */
</style>
