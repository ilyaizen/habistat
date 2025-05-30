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
  // import EnvironmentIndicator from "$lib/components/environment-indicator-old.svelte";
  import FireworksEffect from "$lib/components/fireworks-effect.svelte";
  import { Toaster } from "$lib/components/ui/sonner/index.js"; // Sonner toast system (global notifications)
  import { injectAnalytics } from "@vercel/analytics/sveltekit";
  import { injectSpeedInsights } from "@vercel/speed-insights/sveltekit";
  import "../app.css";
  import AppHeader from "$lib/components/app-header.svelte";
  import AppFooter from "$lib/components/app-footer.svelte";
  import { page } from "$app/stores";
  import AboutDrawer from "$lib/components/about-drawer.svelte";
  // Props received from parent routes using Svelte 5 $props rune
  let { children } = $props<{ children: Snippet; data: LayoutData }>(); // Receive data prop

  // State for tracking initialization progress
  let i18nReady = $state(false); // Flag indicating i18n initialization is complete
  let trackingInitialized = $state(false); // Flag indicating user tracking initialization is complete

  // Theme management variables
  let media: MediaQueryList | null = null; // Reference to the media query list for dark mode preference
  let systemListener: (() => void) | null = null; // Listener function for system theme changes
  let lastAppliedTheme: "system" | "light" | "dark" | null = null;

  // Font imports: Merriweather (serif), Noto Sans (sans), Noto Sans Hebrew (sans for Hebrew), Fira Code (mono) for global and utility font usage
  import "@fontsource/merriweather"; // Serif font for body text (default weight 400)
  // Use Google Fonts for Noto Sans and Noto Sans Hebrew for better internationalization and Hebrew support
  /*
    Noto Sans and Noto Sans Hebrew are loaded via @import in src/app.css for global font-sans usage.
    This ensures proper rendering for both Latin and Hebrew scripts.
    See src/app.css for the @import and --font-sans override.
  */
  // import "@fontsource/oxanium"; // Sans-serif font for UI/headers (removed)
  // import "@fontsource/fira-code"; // Monospace font for code/inputs

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

    // Set Clerk context for downstream components as soon as Clerk is available
    if (browser) {
      const interval = setInterval(() => {
        if (window.Clerk) {
          setContext("clerk", window.Clerk);
          clearInterval(interval);
        }
      }, 100);
    }

    // Return cleanup function to remove listeners when the component is destroyed.
    return () => {
      if (browser) {
        cleanupSystemListener();
      }
    };
  });

  // Inject Vercel Analytics, Speed Insights for performance monitoring (runs only in browser)
  injectSpeedInsights();
  injectAnalytics();

  $effect(() => {
    if (!browser) return;
    if ($theme !== lastAppliedTheme) {
      selectTheme($theme);
      lastAppliedTheme = $theme;
    }
  });

  let aboutDrawerOpen = $state(false);

  // Reuse or define a handleStart function for AboutDrawer
  function handleStart() {
    // You can customize this as needed, or lift from +page.svelte if needed
  }
</script>

{#if $networkIsOnline}
  <!-- Online: Render ClerkProvider and main app content -->
  <ClerkProvider publishableKey={import.meta.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY}>
    <!--
      Layout container:
      - min-h-screen: container takes at least the viewport height
      - flex flex-col: vertical stacking of header, main, and footer
      Header is always at the top, footer at the bottom, main content fills the space.
    -->
    <div class="flex min-h-screen flex-col">
      {#if $page.url.pathname !== "/"}
        <!-- Header is hidden on the landing page ("/") -->
        <AppHeader />
      {/if}
      <main class="flex-1 overflow-auto">
        <!--
          Main content area:
          - flex-1: expands to fill available space between header and footer
          - overflow-auto: allows scrolling when content exceeds available space
        -->
        <MotionWrapper>
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
        </MotionWrapper>
      </main>
      {#if $page.url.pathname !== "/"}
        <!-- Footer is hidden on the landing page ("/") -->
        <AppFooter onMoreInfo={() => (aboutDrawerOpen = true)} />
        <AboutDrawer bind:open={aboutDrawerOpen} {handleStart} />
      {/if}
    </div>
  </ClerkProvider>
{:else}
  <!-- Offline: Render offline content -->
  <div class="flex min-h-screen flex-col">
    <main class="flex-1 overflow-auto">
      <MotionWrapper>
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
      </MotionWrapper>
    </main>
    {#if $page.url.pathname !== "/"}
      <!-- Footer is hidden on the landing page ("/") -->
      <AppFooter />
    {/if}
  </div>
{/if}

<FireworksEffect />

<!-- Global toast notification system (Sonner) -->
<Toaster />
