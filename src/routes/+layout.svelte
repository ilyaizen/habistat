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
  import { browser, dev } from "$app/environment";
  import MotionWrapper from "$lib/components/motion-wrapper.svelte";
  import { useAppInit } from "$lib/hooks/use-app-init.svelte.ts";
  import { useClerk } from "$lib/hooks/use-clerk.ts";
  import { useTheme } from "$lib/hooks/use-theme.ts";

  import "../app.css";

  import { page } from "$app/state";
  import AboutDrawer from "$lib/components/about-drawer.svelte";
  import AppFooter from "$lib/components/app-footer.svelte";
  import AppHeader from "$lib/components/app-header.svelte";

  import { Toaster } from "$lib/components/ui/sonner";

  // Note: Removed timed sync scheduler - sync is now event-driven and smarter

  // import * as ContextMenu from "$lib/components/ui/context-menu";
  // import { useNavigation } from "$lib/hooks/use-navigation.svelte.ts";
  // import { handleRefresh } from "$lib/utils/context-menu";

  // import { runDiagnostics } from "$lib/utils/tauri-debug";

  import StoreSync from "$lib/components/store-sync.svelte";
  // Global tooltip provider to ensure any Tooltip usage (e.g., in header) always has context
  import * as Tooltip from "$lib/components/ui/tooltip";
  // Global visual overlays
  import FireworksEffect from "$lib/components/fireworks-effect.svelte";
  import DamageEffect from "$lib/components/damage-effect.svelte";
  import LottieConfettiEffect from "$lib/components/lottie-confetti-effect.svelte";

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

  // Temporary fix until SvelteKit types are generated
  type LayoutData = {
    dbError?: string;
    fallbackMode?: boolean;
    [key: string]: any;
  };

  // Props received from parent routes using Svelte 5 $props rune
  let { children, data } = $props<{ children: Snippet; data: LayoutData }>(); // Receive data prop

  // Initialize hooks
  const theme = useTheme();
  const clerk = useClerk();
  // const navigation = useNavigation();
  const appInit = useAppInit();

  // --- Singleton Drawer State & Context ---
  let aboutDrawerOpen = $state(false);
  // A placeholder that can be overridden by the page context.
  let handleStart = $state(() => {});

  // Production loading states
  let initializationComplete = $state(false);
  let initializationError = $state<string | null>(data?.dbError || null);
  let authTimeout = $state(false);
  let authFallbackEnabled = $state(data?.fallbackMode || false);

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

  // Set up Clerk contexts and session association
  clerk.setupClerkContexts();
  clerk.setupSessionAssociation();

  onMount(() => {
    // Suppress Clerk development warning in dev mode
    if (dev) {
      const warn = console.warn;
      console.warn = (...args: any[]) => {
        const clerkStartMsg = "Clerk: Clerk has been loaded with development keys.";
        if (typeof args[0] === "string" && args[0].startsWith(clerkStartMsg)) {
          return;
        }
        warn.apply(console, args);
      };
    }

    // Check for database errors from layout load
    if (data?.dbError) {
      console.warn("⚠️ Layout: Database error detected");
      initializationError = `Database error: ${data.dbError}`;
    }

    // Run diagnostics for Tauri builds
    // if (browser) {
    //   runDiagnostics();
    // }

    let initTimeout: ReturnType<typeof setTimeout>;
    let authFallbackTimeout: ReturnType<typeof setTimeout>;

    // Set a timeout for initialization to prevent infinite loading
    initTimeout = setTimeout(() => {
      console.warn("⏰ Layout: Initialization timeout - enabling fallback mode");
      authTimeout = true;
      authFallbackEnabled = true;
      initializationComplete = true;
    }, 8000); // Reduced from 10 seconds to 8 seconds

    // Set an even shorter timeout for auth-specific issues
    authFallbackTimeout = setTimeout(() => {
      if (!initializationComplete) {
        console.warn("🔐 Layout: Authentication timeout - enabling fallback");
        authFallbackEnabled = true;
      }
    }, 5000); // 5 second auth timeout

    try {
      // Sync manager functionality is now handled by the unified sync service
      // which is automatically initialized in the consolidated sync store

      // Initialize core functionalities when the component mounts in the browser.
      appInit.initializeAppCore();
      theme.initializeTheme();

      // Initialize navigation tracking
      // navigation.initializeNavigationTracking();

      // Initialize Clerk - with timeout handling
      try {
        clerk.initializeClerk();
      } catch (clerkError) {
        console.error("❌ Layout: Clerk initialization failed");
        authFallbackEnabled = true;
      }

      // Set up midnight scheduling and development mode
      appInit.scheduleMidnightCheck();
      // TODO: 2025-07-22 - Add this back in when we have a way to handle it
      // appInit.setupDevelopmentMode();

      // Note: Timed sync scheduler removed - sync is now event-driven and smarter

      // Convex client will be initialized automatically when user authenticates
      // via the Clerk authentication flow in use-clerk.ts to prevent timeout
      // errors for anonymous users

      // Clear the timeouts since initialization completed
      clearTimeout(initTimeout);
      clearTimeout(authFallbackTimeout);
      initializationComplete = true;
    } catch (error) {
      console.error("❌ Layout: Initialization error");
      initializationError = error instanceof Error ? error.message : "Unknown initialization error";
      clearTimeout(initTimeout);
      clearTimeout(authFallbackTimeout);
      initializationComplete = true;
      authFallbackEnabled = true;
    }

    // Return cleanup function to remove listeners when the component is destroyed.
    return () => {
      if (browser) {
        theme.cleanupSystemListener();
        // navigation.cleanup();
        // appInit.cleanup();
      }
      // Note: No need to stop timed sync scheduler as it's been removed
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
      if (authFallbackTimeout) {
        clearTimeout(authFallbackTimeout);
      }
    };
  });

  // Inject Vercel Analytics, Speed Insights for performance monitoring (runs only in browser)
  if (!dev) {
    injectSpeedInsights();
    injectAnalytics();
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

<ClerkProvider publishableKey={import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY}>
  <!--
    Wrap the entire app in Tooltip.Provider so components outside page trees
    (like the header) can safely use Tooltip.Root/Trigger/Content without
    "Context \"Tooltip.Provider\" not found" errors.
  -->
  <Tooltip.Provider>
    <div class="relative flex min-h-screen flex-col antialiased">
      <!-- Fixed background texture layer (non-interactive, behind content) -->
      <div class="texture" aria-hidden="true"></div>
      <div class="relative z-10 flex min-h-screen flex-col">
        {#if page.url.pathname !== "/"}
          <AppHeader />
        {/if}
        <main class="flex-1 {page.url.pathname === '/' ? 'overflow-y-hidden' : ''}">
          <MotionWrapper>
            {@render children()}
          </MotionWrapper>
        </main>
        {#if page.url.pathname !== "/"}
          <AppFooter onMoreInfo={() => (aboutDrawerOpen = true)} />
        {/if}
      </div>

      <StoreSync />

      <!-- Global overlay effects: listens to `$triggerFireworks` and renders above UI -->
      <FireworksEffect />
      <DamageEffect />
      <LottieConfettiEffect />

      <AboutDrawer bind:open={aboutDrawerOpen} {handleStart} />

      <Toaster />
    </div>
  </Tooltip.Provider>
</ClerkProvider>
