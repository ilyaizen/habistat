<!-- /**
 * Root layout component for the Habistat application.
 * Handles core application setup including:
 * - Theme management (system/light/dark)
 * - Internationalization (i18n)
 * - Application initialization
 * - Authentication state with Clerk
 * - Session association
 */ -->

<script lang="ts">
  import { onMount } from "svelte";
  import { setContext, type Snippet } from "svelte";
  import { waitLocale } from "svelte-i18n";
  import { get, readable } from "svelte/store";
  import { theme } from "$lib/stores/settings";
  import { resetMode, setMode } from "mode-watcher";
  import { ClerkProvider } from "svelte-clerk";
  import type { LoadedClerk, UserResource } from "@clerk/types";
  import { initializeTracking, sessionStore, markSessionAssociated } from "$lib/utils/tracking";
  import MotionWrapper from "$lib/components/motion-wrapper.svelte";
  import type { LayoutData } from "./$types";
  import { browser } from "$app/environment";
  import { isOnline as networkIsOnline } from "$lib/stores/network";
  // import EnvironmentIndicator from "$lib/components/environment-indicator.svelte";
  import FireworksEffect from "$lib/components/fireworks-effect.svelte";
  import { Toaster } from "$lib/components/ui/sonner/index.js"; // Sonner toast system (global notifications)
  import { injectSpeedInsights } from "@vercel/speed-insights/sveltekit";

  import "../app.css";

  // Props received from parent routes using Svelte 5 $props rune
  let { children, data } = $props<{ children: Snippet; data: LayoutData }>(); // Receive data prop

  // State for tracking initialization progress
  let i18nReady = $state(false); // Flag indicating i18n initialization is complete
  let trackingInitialized = $state(false); // Flag indicating user tracking initialization is complete

  // Theme management variables
  let media: MediaQueryList | null = null; // Reference to the media query list for dark mode preference
  let systemListener: (() => void) | null = null; // Listener function for system theme changes

  // Create a readable store for the Clerk user state
  // Only initialize this store if online, otherwise ClerkProvider won't be rendered
  const clerkUserStore = readable<UserResource | null>(null, (set) => {
    if (!browser || !get(networkIsOnline)) return; // Check network status here

    let unsubscribe: (() => void) | null = null;

    // Function to initialize Clerk state from window object
    function initializeClerkStateFromWindow() {
      const clerk = window.Clerk as unknown as LoadedClerk | undefined;
      if (clerk) {
        set(clerk.user ?? null);

        // Add listener to update store on auth changes
        unsubscribe = clerk.addListener(({ user }) => {
          set(user ?? null);
        });
      } else {
        // Retry after a short delay
        setTimeout(initializeClerkStateFromWindow, 200);
      }
    }

    // Start initialization
    initializeClerkStateFromWindow();

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  });

  // Make the Clerk user store available via context
  setContext("clerkUser", clerkUserStore);

  // Effect to handle session association when user logs in
  // Only run this effect if online
  $effect(() => {
    if (!browser || !$networkIsOnline) return;

    const user = $clerkUserStore;
    const session = $sessionStore;

    // Check if we need to associate the session
    if (user?.id && session?.state === "anonymous") {
      markSessionAssociated(user.id, user.primaryEmailAddress?.emailAddress);
    }
  });

  /**
   * Applies the system theme (dark/light) based on the user's OS preference.
   */
  function applySystemTheme() {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  /**
   * Sets up a listener to automatically update the theme when the system preference changes.
   */
  function setupSystemListener() {
    cleanupSystemListener(); // Ensure no duplicate listeners
    media = window.matchMedia("(prefers-color-scheme: dark)");
    systemListener = () => applySystemTheme();
    media.addEventListener("change", systemListener);
  }

  /**
   * Removes the event listener for system theme changes to prevent memory leaks.
   */
  function cleanupSystemListener() {
    if (media && systemListener) {
      media.removeEventListener("change", systemListener);
    }
    media = null;
    systemListener = null;
  }

  /**
   * Sets the application theme based on user selection (system, light, or dark).
   * Updates CSS classes and manages system theme listeners accordingly.
   */
  function selectTheme(mode: "system" | "light" | "dark") {
    if (mode === "system") {
      resetMode();
      applySystemTheme();
      setupSystemListener();
    } else {
      cleanupSystemListener();
      if (mode === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      setMode(mode);
    }
  }

  /**
   * Initializes core application functionalities on component mount in the browser.
   * Includes theme setup, tracking initialization, and i18n setup.
   * Clerk initialization is handled separately by ClerkProvider, if online.
   */
  async function initializeAppCore() {
    if (!browser) return;

    try {
      // Initialize theme
      const currentTheme = get(theme);
      selectTheme(currentTheme);

      // Initialize tracking (waits for store to load from localStorage)
      // Tracking initialization can happen regardless of online status
      await initializeTracking();
      trackingInitialized = true;

      // Initialize i18n
      try {
        await waitLocale();
        i18nReady = true;
      } catch (error) {
        console.error("Error initializing i18n:", error);
        i18nReady = true;
      }
    } catch (error) {
      console.error("Error during core initialization:", error);
      // Still mark as initialized to prevent getting stuck
      trackingInitialized = true;
      i18nReady = true;
    }
  }

  onMount(() => {
    // Initialize core functionalities when the component mounts in the browser.
    initializeAppCore();

    // Return cleanup function to remove listeners when the component is destroyed.
    return () => {
      if (browser) {
        cleanupSystemListener();
      }
    };
  });

  // Inject Vercel Speed Insights for performance monitoring (runs only in browser)
  injectSpeedInsights();
</script>

{#if $networkIsOnline}
  <!-- Online: Render ClerkProvider and main app content -->
  <ClerkProvider publishableKey={import.meta.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY}>
    <div class="flex h-screen flex-col">
      <MotionWrapper>
        <main class="flex-1">
          {#if i18nReady && trackingInitialized}
            {@render children()}
          {:else}
            <div class="flex h-full items-center justify-center">
              <!-- Loading spinner or placeholder -->
              <div
                class="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
              ></div>
            </div>
          {/if}
        </main>
      </MotionWrapper>
    </div>
  </ClerkProvider>
{:else}
  <!-- Offline: Render offline content -->
  <div class="flex h-screen flex-col">
    <MotionWrapper>
      <main class="flex-1">
        {#if i18nReady && trackingInitialized}
          {@render children()}
        {:else}
          <div class="flex h-full items-center justify-center">
            <!-- Loading spinner or placeholder -->
            <div
              class="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
            ></div>
          </div>
        {/if}
      </main>
    </MotionWrapper>
  </div>
{/if}

<!-- Render EnvironmentIndicator fixed at the bottom right -->
<!-- TODO: 2025-05-12 - temporarily disabled to avoid cluttering the UI -->
<!-- <div class="fixed bottom-4 left-4 z-10">
  <EnvironmentIndicator></EnvironmentIndicator>
</div> -->

<FireworksEffect />

<!-- Global toast notification system (Sonner) -->
<Toaster />
