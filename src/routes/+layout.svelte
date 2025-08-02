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

  // Temporary fix until SvelteKit types are generated
  type LayoutData = {
    dbError?: string;
    fallbackMode?: boolean;
    [key: string]: any;
  };
  import "../app.css";
  import { page } from "$app/stores";
  import AboutDrawer from "$lib/components/about-drawer.svelte";
  import AppFooter from "$lib/components/app-footer.svelte";
  import AppHeader from "$lib/components/app-header.svelte";

  import { Toaster } from "$lib/components/ui/sonner";
  import { getConvexClient } from "$lib/utils/convex";

  // import * as ContextMenu from "$lib/components/ui/context-menu";
  // import { useNavigation } from "$lib/hooks/use-navigation.svelte.ts";
  // import { handleRefresh } from "$lib/utils/context-menu";

  // import { runDiagnostics } from "$lib/utils/tauri-debug";

  import StoreSync from "$lib/components/store-sync.svelte";

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
      console.warn("[Layout] Database error detected:", data.dbError);
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
      console.warn("[Layout] Initialization taking longer than expected, enabling fallback mode");
      authTimeout = true;
      authFallbackEnabled = true;
      initializationComplete = true;
    }, 8000); // Reduced from 10 seconds to 8 seconds

    // Set an even shorter timeout for auth-specific issues
    authFallbackTimeout = setTimeout(() => {
      if (!initializationComplete) {
        console.warn("[Layout] Authentication timeout - enabling fallback");
        authFallbackEnabled = true;
      }
    }, 5000); // 5 second auth timeout

    try {
      // Initialize core functionalities when the component mounts in the browser.
      appInit.initializeAppCore();
      theme.initializeTheme();

      // Initialize navigation tracking
      // navigation.initializeNavigationTracking();

      // Initialize Clerk - with timeout handling
      try {
        clerk.initializeClerk();
      } catch (clerkError) {
        console.error("[Layout] Clerk initialization failed:", clerkError);
        authFallbackEnabled = true;
      }

      // Set up midnight scheduling and development mode
      appInit.scheduleMidnightCheck();
      // TODO: 2025-07-22 - Add this back in when we have a way to handle it
      // appInit.setupDevelopmentMode();

      // Initialize Convex client with authentication - only in browser
      if (browser) {
        try {
          const client = getConvexClient();
          if (client) {
            console.log("[DEBUG] Convex client initialized successfully");
          } else {
            console.warn(
              "[WARN] Failed to initialize Convex client - app will work in offline mode"
            );
          }
        } catch (error) {
          console.error("[ERROR] Convex client initialization failed:", error);
          // Don't block the app if Convex fails
        }
      }

      // Clear the timeouts since initialization completed
      clearTimeout(initTimeout);
      clearTimeout(authFallbackTimeout);
      initializationComplete = true;
    } catch (error) {
      console.error("[Layout] Initialization error:", error);
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

<ClerkProvider {...data}>
  <div
    class="bg-background text-foreground flex min-h-screen flex-col overflow-y-hidden font-sans antialiased"
  >
    {#if $page.url.pathname !== "/"}
      <!-- Header is hidden on the landing page ("/") -->
      <AppHeader />
    {/if}
    <main class="flex-1">
      {#if $page.url.pathname === "/"}
        <div class="absolute top-4 right-4">
          <ThemeToggle />
        </div>
      {/if}
      <!-- Main content area -->
      <MotionWrapper>
        <!-- STRIPPED DOWN FOR DEBUGGING -->
        {@render children()}
      </MotionWrapper>
    </main>
    {#if $page.url.pathname !== "/"}
      <!-- Footer is hidden on the landing page ("/") -->
      <AppFooter onMoreInfo={() => (aboutDrawerOpen = true)} />
    {/if}

    <Toaster />
    <StoreSync />

    <!-- The AboutDrawer is now a singleton here, its lifecycle is not tied to page navigation. -->
    <AboutDrawer bind:open={aboutDrawerOpen} {handleStart} />
  </div>
</ClerkProvider>
