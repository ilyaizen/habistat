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
  import { ClerkProvider } from "svelte-clerk";
  import MotionWrapper from "$lib/components/motion-wrapper.svelte";
  import type { LayoutData } from "./$types";
  import { browser } from "$app/environment";
  import { isOnline as networkIsOnline } from "$lib/stores/network";
  import { useTheme } from "$lib/hooks/use-theme.svelte";
  import { useClerk } from "$lib/hooks/use-clerk.svelte";
  import { useNavigation } from "$lib/hooks/use-navigation.svelte";
  import { useAppInit } from "$lib/hooks/use-app-init.svelte";
  import { handleRefresh } from "$lib/utils/context-menu";
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

  // Initialize hooks
  const theme = useTheme();
  const clerk = useClerk();
  const navigation = useNavigation();
  const appInit = useAppInit();

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

  // Set up Clerk contexts and session association
  clerk.setupClerkContexts();
  clerk.setupSessionAssociation();

  onMount(() => {
    // Initialize core functionalities when the component mounts in the browser.
    appInit.initializeAppCore();
    theme.initializeTheme();

    // Initialize navigation tracking
    navigation.initializeNavigationTracking();

    // Initialize Clerk
    clerk.initializeClerk();

    // Set up midnight scheduling and development mode
    appInit.scheduleMidnightCheck();
    appInit.setupDevelopmentMode();

    // Return cleanup function to remove listeners when the component is destroyed.
    return () => {
      if (browser) {
        theme.cleanupSystemListener();
        navigation.cleanup();
        appInit.cleanup();
      }
    };
  });

  // Inject Vercel Analytics, Speed Insights for performance monitoring (runs only in browser)
  // injectSpeedInsights();
  // injectAnalytics();

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

  // Context menu actions
  function goBack() {
    navigation.goBack();
    contextMenuOpen = false;
  }

  function goForward() {
    navigation.goForward();
    contextMenuOpen = false;
  }

  function handleRefreshWithClose() {
    console.log("Refreshing...");
    contextMenuOpen = false;
    handleRefresh();
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
              {#if appInit.i18nReady && appInit.trackingInitialized}
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
            {#if appInit.i18nReady && appInit.trackingInitialized}
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
    <ContextMenu.Item inset disabled={!navigation.canGoForward} onclick={goForward}>
      Forward
      <ContextMenu.Shortcut>Ctrl+]</ContextMenu.Shortcut>
    </ContextMenu.Item>
    <ContextMenu.Separator />
    <ContextMenu.Item inset onclick={handleRefreshWithClose}>
      Refresh
      <ContextMenu.Shortcut>Ctrl+R</ContextMenu.Shortcut>
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu.Root>
