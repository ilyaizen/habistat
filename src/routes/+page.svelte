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
  import { anonymousUserId, hasExistingSession, createUserSession } from "$lib/utils/tracking";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";

  // State management using Svelte 5 runes ($state)
  // Controls visibility of the "More Info" button and drawer state
  let showMoreInfoButton = $state(false); // Controls the visibility of the more info button
  let drawerOpen = $state(false); // Controls the state of the information drawer
  let initialCheckDone = $state(false); // Prevents multiple initial drawer checks

  // Disable page scrolling while on landing page
  onMount(() => {
    document.body.style.overflow = "hidden";
    return () => {
      // Cleanup: Re-enable scrolling when component is destroyed
      document.body.style.overflow = "";
    };
  });

  // Initialize drawer state based on user session
  $effect(() => {
    if (!initialCheckDone && browser) {
      // Automatically open drawer for first-time visitors
      drawerOpen = !hasExistingSession();
      initialCheckDone = true;
    }
  });

  /**
   * Handles the START button click action
   * Creates a new user session and redirects to dashboard
   * Includes error handling for session creation failures
   */
  function handleStart() {
    console.log("+page.svelte: handleStart called");
    const userId = createUserSession();
    if (userId) {
      console.log("+page.svelte: Session started, navigating to dashboard.");
      goto("/dashboard");
    } else {
      console.error("+page.svelte: Failed to start session.");
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
<div class="flex min-h-screen flex-col items-center justify-center text-center">
  <img src="/logo.svg" alt="Habistat Logo" class="mb-6 h-30 w-30" />
  <h1 class="mb-4 text-4xl font-bold">Habistat</h1>
  <p class="text-muted-foreground mb-8 text-lg">Track your habits, build your future.</p>
  {#if $anonymousUserId}
    <!-- Show Dashboard button for returning users -->
    <Button onclick={() => goto("/dashboard")} size="lg">Dashboard</Button>
  {:else}
    <!-- Show Start button for new users -->
    <Button onclick={handleStart} size="lg">Start</Button>
  {/if}
</div>

<!-- Information drawer component with two-way binding for open state -->
<AboutDrawer {showMoreInfoButton} bind:open={drawerOpen} {handleStart} />

<style>
</style>
