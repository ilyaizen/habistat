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
import { injectAnalytics } from "@vercel/analytics/sveltekit";
import { injectSpeedInsights } from "@vercel/speed-insights/sveltekit";
import { onMount, type Snippet, setContext } from "svelte";
import { ClerkProvider } from "svelte-clerk";
import { browser } from "$app/environment";
import MotionWrapper from "$lib/components/motion-wrapper.svelte";
import { useAppInit } from "$lib/hooks/use-app-init.svelte.ts";
import { useClerk } from "$lib/hooks/use-clerk.ts";
import { useTheme } from "$lib/hooks/use-theme.ts";
import type { LayoutData } from "./$types";
import "../app.css";
import { page } from "$app/state";
import AboutDrawer from "$lib/components/about-drawer.svelte";
import AppFooter from "$lib/components/app-footer.svelte";
import AppHeader from "$lib/components/app-header.svelte";
import ConfettiEffect from "$lib/components/confetti-effect.svelte";
import FireworksEffect from "$lib/components/fireworks-effect.svelte";
import { Toaster } from "$lib/components/ui/sonner";
import { getConvexClient } from "$lib/utils/convex";

// import * as ContextMenu from "$lib/components/ui/context-menu";
// import { useNavigation } from "$lib/hooks/use-navigation.svelte.ts";
// import { handleRefresh } from "$lib/utils/context-menu";

// import { runDiagnostics } from "$lib/utils/tauri-debug";

import StoreSync from "$lib/components/store-sync.svelte";

// Props received from parent routes using Svelte 5 $props rune
let { children } = $props<{ children: Snippet; data: LayoutData }>(); // Receive data prop

// Initialize hooks
const theme = useTheme();
const clerk = useClerk();
// const navigation = useNavigation();
const appInit = useAppInit();

// --- Singleton Drawer State & Context ---
let aboutDrawerOpen = $state(false);
// A placeholder that can be overridden by the page context.
let handleStart = $state(() => {});

setContext("drawer-controller", {
  open: () => {
    aboutDrawerOpen = true;
  },
  close: () => {
    aboutDrawerOpen = false;
  },
  // Allows the current page to register its specific `handleStart` function.
  registerHandleStart: (fn: () => void) => {
    handleStart = fn;
  }
});

// Font imports: Merriweather (serif), Noto Sans (sans), Noto Sans Hebrew (sans for Hebrew), Fira Code (mono) for global and utility font usage
import "@fontsource/merriweather"; // Serif font for body text (default weight 400)
import ThemeToggle from "$lib/components/theme-toggle.svelte";

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
  // Run diagnostics for Tauri builds
  // if (browser) {
  //   runDiagnostics();
  // }

  // Initialize core functionalities when the component mounts in the browser.
  appInit.initializeAppCore();
  theme.initializeTheme();

  // Initialize navigation tracking
  // navigation.initializeNavigationTracking();

  // Initialize Clerk
  clerk.initializeClerk();

  // Set up midnight scheduling and development mode
  appInit.scheduleMidnightCheck();
  // TODO: 2025-07-22 - Add this back in when we have a way to handle it
  // appInit.setupDevelopmentMode();

  // Return cleanup function to remove listeners when the component is destroyed.
  return () => {
    if (browser) {
      theme.cleanupSystemListener();
      // navigation.cleanup();
      // appInit.cleanup();
    }
  };
});

// Inject Vercel Analytics, Speed Insights for performance monitoring (runs only in browser)
injectSpeedInsights();
injectAnalytics();

// Initialize Convex client with authentication - only in browser
if (browser) {
  try {
    const client = getConvexClient();
    if (client) {
      console.log("[DEBUG] Convex client initialized successfully");
    } else {
      console.warn("[WARN] Failed to initialize Convex client");
    }
  } catch (error) {
    console.error("[ERROR] Convex client initialization failed:", error);
  }
}

// let contextMenuOpen = $state(false);

// // Context menu actions
// function goBack() {
//   navigation.goBack();
//   contextMenuOpen = false;
// }

// function goForward() {
//   navigation.goForward();
//   contextMenuOpen = false;
// }

// function handleRefreshWithClose() {
//   // console.log("Refreshing...");
//   contextMenuOpen = false;
//   handleRefresh();
// }
</script>

<!-- <ContextMenu.Root bind:open={contextMenuOpen}>
  <ContextMenu.Trigger> -->
<div
  class="bg-background text-foreground flex min-h-screen flex-col overflow-y-hidden font-sans antialiased"
>
  <ClerkProvider publishableKey={import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY}>
    {#if page.url.pathname !== "/"}
      <!-- Header is hidden on the landing page ("/") -->
      <AppHeader />
    {/if}
    <main class="flex-1">
      {#if page.url.pathname === "/"}
        <div class="absolute top-4 right-4">
          <ThemeToggle />
        </div>
      {/if}
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

  <FireworksEffect />
  <ConfettiEffect />
  <Toaster />
  <StoreSync />

  <!-- The AboutDrawer is now a singleton here, its lifecycle is not tied to page navigation. -->
  <AboutDrawer bind:open={aboutDrawerOpen} {handleStart} />
</div>
<!-- </ContextMenu.Trigger>
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
</ContextMenu.Root> -->
