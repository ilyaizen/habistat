<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import AboutDrawer from "$lib/components/about-drawer.svelte";
  import { goto } from "$app/navigation";
  import { anonymousUserId, hasExistingSession, createUserSession } from "$lib/utils/tracking";
  import { browser } from "$app/environment";

  // State for drawer and scroll/touch detection using Svelte 5 runes
  let showMoreInfoButton = $state(false);
  let drawerOpen = $state(false);
  let initialCheckDone = $state(false);

  // Use $effect for initial drawer state
  $effect(() => {
    if (!initialCheckDone && browser) {
      // Only open drawer for new users (no existing session)
      drawerOpen = !hasExistingSession();
      initialCheckDone = true;
    }
  });

  // Function to handle START button click
  function handleStart() {
    console.log("+page.svelte: handleStart called");
    const userId = createUserSession(); // Create new session
    if (userId) {
      console.log("+page.svelte: Session started, navigating to dashboard.");
      goto("/dashboard");
    } else {
      console.error("+page.svelte: Failed to start session.");
      // Optionally: Show an error message to the user
    }
  }

  // Downward scroll/touch intent detection
  let shown = false;

  function handleWheel(e: WheelEvent) {
    if (!drawerOpen) {
      // Only show button when drawer is closed
      if (e.deltaY > 0 && !shown) {
        showMoreInfoButton = true;
        shown = true;
      } else if (e.deltaY < 0 && shown) {
        showMoreInfoButton = false;
        shown = false;
      }
    }
  }

  let lastTouchY: number | null = null;
  function handleTouchStart(e: TouchEvent) {
    lastTouchY = e.touches[0]?.clientY ?? null;
  }
  function handleTouchMove(e: TouchEvent) {
    if (!drawerOpen && lastTouchY !== null) {
      // Only handle touch when drawer is closed
      const deltaY = e.touches[0].clientY - lastTouchY;
      if (deltaY < -10 && !shown) {
        // User swiped up (scrolls down)
        showMoreInfoButton = true;
        shown = true;
      } else if (deltaY > 10 && shown) {
        // User swiped down
        showMoreInfoButton = false;
        shown = false;
      }
    }
  }

  // Use $effect for event listeners
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

  // Effect to hide more info button when drawer is open
  $effect(() => {
    if (drawerOpen) {
      showMoreInfoButton = false;
      shown = false;
    }
  });
</script>

<div class="flex min-h-screen flex-col items-center justify-center text-center">
  <img src="/logo.svg" alt="Habistat Logo" class="mb-6 h-30 w-30" />
  <h1 class="mb-4 text-4xl font-bold">Habistat</h1>
  <p class="text-muted-foreground mb-8 text-lg">Track your habits, build your future.</p>
  {#if $anonymousUserId}
    <!-- Show "Dashboard" if an anonymous session ID exists -->
    <Button onclick={() => goto("/dashboard")} size="lg">Dashboard</Button>
  {:else}
    <!-- Show "Start" if no anonymous session ID exists -->
    <Button onclick={handleStart} size="lg">Start</Button>
  {/if}
</div>

<AboutDrawer {showMoreInfoButton} bind:open={drawerOpen} {handleStart} />

<style>
</style>
