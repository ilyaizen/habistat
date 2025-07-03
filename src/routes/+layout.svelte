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
  import { onMount, setContext, type Snippet } from "svelte";
  import { waitLocale } from "svelte-i18n";
  import { get, readable, writable } from "svelte/store";
  import { theme } from "$lib/stores/settings";
  import { resetMode, setMode } from "mode-watcher";
  import { ClerkProvider } from "svelte-clerk";
  import type { LoadedClerk, UserResource } from "@clerk/types";
  import { sessionStore, markSessionAssociated, logAppOpenIfNeeded } from "$lib/utils/tracking";
  import MotionWrapper from "$lib/components/motion-wrapper.svelte";
  import type { LayoutData } from "./$types";
  import { browser } from "$app/environment";
  import { isOnline as networkIsOnline } from "$lib/stores/network";
  // import EnvironmentIndicator from "$lib/components/environment-indicator-old.svelte";
  // import { injectAnalytics } from "@vercel/analytics/sveltekit";
  // import { injectSpeedInsights } from "@vercel/speed-insights/sveltekit";
  import "../app.css";
  import AppHeader from "$lib/components/app-header.svelte";
  import AppFooter from "$lib/components/app-footer.svelte";
  import { page } from "$app/state";
  import AboutDrawer from "$lib/components/about-drawer.svelte";
  import { setupConvex } from "convex-svelte";
  import FireworksEffect from "$lib/components/fireworks-effect.svelte";
  import { Toaster } from "$lib/components/ui/sonner";
  import * as ContextMenu from "$lib/components/ui/context-menu";

  import StoreSync from "$lib/components/store-sync.svelte";

  // Props received from parent routes using Svelte 5 $props rune
  let { children } = $props<{ children: Snippet; data: LayoutData }>(); // Receive data prop

  // --- Singleton Drawer State & Context ---
  let aboutDrawerOpen = $state(false);
  // A placeholder that can be overridden by the page context.
  let handleStart = $state(() => {});

  setContext("drawer-controller", {
    open: () => (aboutDrawerOpen = true),
    close: () => (aboutDrawerOpen = false),
    // Allows the current page to register its specific `handleStart` function.
    registerHandleStart: (fn: () => void) => {
      handleStart = fn;
    }
  });

  // State for tracking initialization progress
  let i18nReady = $state(false); // Flag indicating i18n initialization is complete
  let trackingInitialized = $state(true); // Flag indicating user tracking initialization is complete

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

  // This effect hook runs whenever the Clerk user state changes.
  // It's responsible for associating the anonymous session with the Clerk user.
  $effect(() => {
    const unsubscribe = clerkUserStore.subscribe((user) => {
      if (user) {
        const session = get(sessionStore);
        if (session?.state === "anonymous") {
          console.log("[Session] Associating anonymous session with Clerk user:", user.id);
          markSessionAssociated(user.id, user.primaryEmailAddress?.emailAddress);
        }
      }
    });

    return unsubscribe;
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
    if (!browser) {
      console.log("[DEBUG] initializeAppCore: Not in browser, skipping");
      return;
    }

    console.log("[DEBUG] initializeAppCore: Starting initialization");

    try {
      // Initialize theme
      console.log("[DEBUG] initializeAppCore: Initializing theme");
      const currentTheme = get(theme);
      selectTheme(currentTheme);

      // Tracking is initialized by the store itself now.
      console.log("[DEBUG] initializeAppCore: Setting tracking as initialized");
      trackingInitialized = true;

      // Initialize i18n
      console.log("[DEBUG] initializeAppCore: Initializing i18n");
      try {
        await waitLocale();
        i18nReady = true;
        console.log("[DEBUG] initializeAppCore: i18n ready");
      } catch (error) {
        console.error("Error initializing i18n:", error);
        i18nReady = true;
      }

      console.log("[DEBUG] initializeAppCore: Initialization completed successfully");
    } catch (error) {
      console.error("Error during core initialization:", error);
      // Still mark as initialized to prevent getting stuck
      trackingInitialized = true;
      i18nReady = true;
    }
  }

  // At the top-level
  const clerkStore = writable<LoadedClerk | null>(null);
  setContext("clerk", clerkStore);

  let midnightTimer: ReturnType<typeof setTimeout> | null = null;

  function msUntilNextMidnight() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    return next.getTime() - now.getTime();
  }

  function scheduleMidnightCheck() {
    if (midnightTimer) clearTimeout(midnightTimer);
    midnightTimer = setTimeout(async () => {
      await logAppOpenIfNeeded();
      scheduleMidnightCheck(); // Schedule for the next day
    }, msUntilNextMidnight() + 1000); // +1s buffer
  }

  onMount(() => {
    // Initialize core functionalities when the component mounts in the browser.
    initializeAppCore();

    // Initialize navigation tracking
    initializeNavigationTracking();

    // Set Clerk context for downstream components as soon as Clerk is available
    if (browser) {
      let attempts = 0;
      const maxAttempts = 50; // Max 5 seconds

      const interval = setInterval(() => {
        attempts++;

        if (window.Clerk) {
          const clerk = window.Clerk as unknown as LoadedClerk;
          console.log("[DEBUG] Clerk loaded, setting context:", clerk);
          console.log("[DEBUG] Clerk has signOut method:", typeof clerk.signOut === "function");
          clerkStore.set(clerk);
          clearInterval(interval);
        } else if (attempts >= maxAttempts) {
          console.warn("[DEBUG] Clerk not found after maximum attempts, giving up");
          clearInterval(interval);
        }
      }, 100);

      // Expose a debug function in development mode to test the midnight logic
      if (import.meta.env.DEV) {
        (window as any).triggerMidnight = async () => {
          console.log("[DEBUG] Manually triggering midnight app open log...");
          await logAppOpenIfNeeded();
          console.log("[DEBUG] Manual trigger complete. Check usage history.");
        };
      }
    }

    scheduleMidnightCheck();

    // Return cleanup function to remove listeners when the component is destroyed.
    return () => {
      if (browser) {
        cleanupSystemListener();
        // Clean up navigation listener
        window.removeEventListener("popstate", updateForwardState);
        // Clean up the debug function in development mode
        if (import.meta.env.DEV) {
          delete (window as any).triggerMidnight;
        }
      }
      if (midnightTimer) clearTimeout(midnightTimer);
    };
  });

  // Inject Vercel Analytics, Speed Insights for performance monitoring (runs only in browser)
  // injectSpeedInsights();
  // injectAnalytics();

  $effect(() => {
    if (!browser) return;
    if ($theme !== lastAppliedTheme) {
      selectTheme($theme);
      lastAppliedTheme = $theme;
    }
  });

  // Set up Convex client for Svelte context - only in browser
  if (browser) {
    const convexUrl = import.meta.env.PUBLIC_CONVEX_URL || import.meta.env.VITE_CONVEX_URL;
    console.log("[DEBUG] Environment variables:", {
      PUBLIC_CONVEX_URL: import.meta.env.PUBLIC_CONVEX_URL,
      VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL,
      convexUrl,
      PUBLIC_CLERK_PUBLISHABLE_KEY: import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY
        ? "✓ Set"
        : "❌ Missing",
      VITE_PUBLIC_CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY
        ? "✓ Set"
        : "❌ Missing"
    });

    if (convexUrl) {
      try {
        setupConvex(convexUrl);
        console.log("[DEBUG] setupConvex completed successfully with URL:", convexUrl);
      } catch (error) {
        console.error("[ERROR] setupConvex failed:", error);
      }
    } else {
      console.warn("[WARN] No Convex URL found, skipping setupConvex");
    }
  }

  let contextMenuOpen = $state(false);
  let canGoForward = $state(false);

  // Track navigation state more accurately
  let navigationStack: string[] = $state([]);
  let currentIndex = $state(0);

  // Initialize navigation tracking
  function initializeNavigationTracking() {
    if (!browser) return;

    // Track the current page
    navigationStack = [window.location.href];
    currentIndex = 0;
    canGoForward = false;

    // Listen for popstate events (back/forward navigation)
    window.addEventListener("popstate", () => {
      // After a popstate, check if we can go forward
      // This is still tricky, but we can make educated guesses
      updateForwardState();
    });
  }

  function updateForwardState() {
    // In a real app, you'd track this more precisely
    // For now, we'll assume forward is available only right after going back
    // and becomes unavailable after any forward navigation
    setTimeout(() => {
      // Simple heuristic: if we just went back, forward might be available
      // but after any action, we need to re-evaluate
      const currentUrl = window.location.href;
      const wasForwardAvailable = canGoForward;

      // Reset forward availability - it will be set to true only when we go back
      if (wasForwardAvailable) {
        // Keep it available for a short time, then re-evaluate
        setTimeout(() => {
          canGoForward = false;
        }, 50);
      }
    }, 10);
  }

  // Context menu actions
  function goBack() {
    console.log("Going back...");
    window.history.back();
    contextMenuOpen = false;

    // After going back, forward should become available
    setTimeout(() => {
      canGoForward = true;
      console.log("Forward is now available");
    }, 100);
  }

  function goForward() {
    if (!canGoForward) return; // Don't execute if disabled
    console.log("Going forward...");
    window.history.forward();
    contextMenuOpen = false;

    // After going forward, we might not be able to go forward again
    setTimeout(() => {
      canGoForward = false;
      console.log("Forward is now disabled");
    }, 100);
  }

  function handleRefresh() {
    console.log("Refreshing...");
    contextMenuOpen = false;
    reloadPage();
  }

  function reloadPage() {
    window.location.reload();
  }
  function savePageAs() {
    // Simulate Ctrl+S (browser default), or show a message
    // Optionally, trigger print dialog as a placeholder
    window.print();
  }
  function openDevTools() {
    // In Tauri, you could use the Tauri API to open devtools
    // In browser, show a message (cannot programmatically open devtools)
    alert("Press Ctrl+Shift+I to open Developer Tools");
  }
</script>

<ContextMenu.Root bind:open={contextMenuOpen}>
  <ContextMenu.Trigger>
    <div
      class="bg-background text-foreground flex min-h-screen flex-col overflow-y-hidden font-sans antialiased"
    >
      {#if $networkIsOnline}
        <!-- Online: Render ClerkProvider and main app content -->
        <ClerkProvider
          publishableKey={import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY ||
            import.meta.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY}
        >
          {#if page.url.pathname !== "/"}
            <!-- Header is hidden on the landing page ("/") -->
            <AppHeader />
          {/if}
          <main class="flex-1">
            <!-- Main content area -->
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
          {#if page.url.pathname !== "/"}
            <!-- Footer is hidden on the landing page ("/") -->
            <AppFooter onMoreInfo={() => (aboutDrawerOpen = true)} />
          {/if}
        </ClerkProvider>
      {:else}
        <!-- Offline: Render offline content -->
        <main class="flex-1">
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
        {#if page.url.pathname !== "/"}
          <!-- Footer is hidden on the landing page ("/") -->
          <AppFooter />
        {/if}
      {/if}

      <FireworksEffect />
      <Toaster />
      <StoreSync />

      <!-- The AboutDrawer is now a singleton here, its lifecycle is not tied to page navigation. -->
      <AboutDrawer bind:open={aboutDrawerOpen} {handleStart} />
    </div>
  </ContextMenu.Trigger>
  <ContextMenu.Content class="w-52">
    <ContextMenu.Item inset onclick={goBack}>
      Back
      <ContextMenu.Shortcut>Ctrl+[</ContextMenu.Shortcut>
    </ContextMenu.Item>
    <ContextMenu.Item inset disabled={!canGoForward} onclick={goForward}>
      Forward
      <ContextMenu.Shortcut>Ctrl+]</ContextMenu.Shortcut>
    </ContextMenu.Item>
    <ContextMenu.Separator />
    <ContextMenu.Item inset onclick={handleRefresh}>
      Refresh
      <ContextMenu.Shortcut>Ctrl+R</ContextMenu.Shortcut>
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu.Root>
