<!-- /**
 * Root layout component for the Habistat application.
 * Handles core application setup including:
 * - Theme management (system/light/dark)
 * - Online/offline state
 * - Internationalization (i18n)
 * - Application initialization
 * - Header/footer visibility
 * - Authentication state with Clerk
 */ -->

<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { setContext } from "svelte";
  import { waitLocale } from "svelte-i18n";
  import { writable, get } from "svelte/store";
  import { theme } from "$lib/stores/settings";
  import { resetMode, setMode } from "mode-watcher";
  import { ClerkProvider } from "svelte-clerk";
  import { getSessionState, markSessionAuthInitiated } from "$lib/utils/tracking";
  import ClerkWrapper from "$lib/components/auth/clerk-wrapper.svelte";
  import MotionWrapper from "$lib/components/motion-wrapper.svelte";

  import "../app.css";

  import AppHeader from "$lib/components/app-header.svelte";
  import AppFooter from "$lib/components/app-footer.svelte";
  import { browser } from "$app/environment";
  import { initializeTracking } from "$lib/utils/tracking";
  import { goto } from "$app/navigation";

  // Props from parent component using Svelte 5 syntax
  let { children } = $props();

  // Hide header/footer on the landing page (/)
  let showHeaderFooter = $state(() => page.url.pathname !== "/");

  // Stores for managing authentication and connectivity state
  // Uses offline-first approach for better user experience
  const authMode = writable<"offline" | "online">("offline");
  const isOnline = writable(true);

  // Make auth and connectivity state available to child components
  setContext("authMode", authMode);
  setContext("isOnline", isOnline);

  // State for tracking initialization progress
  let i18nReady = $state(false);
  let isInitialized = $state(false);

  // State for auth initialization
  let loadClerk = $state(false);

  // Theme management variables
  let media: MediaQueryList | null = null;
  let systemListener: (() => void) | null = null;

  /**
   * Applies the system theme based on user's OS preference
   * Adds/removes 'dark' class to document root
   */
  function applySystemTheme() {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  /**
   * Sets up listener for system theme changes
   * Cleans up existing listener before setting new one
   */
  function setupSystemListener() {
    cleanupSystemListener();
    media = window.matchMedia("(prefers-color-scheme: dark)");
    systemListener = () => applySystemTheme();
    media.addEventListener("change", systemListener);
  }

  /**
   * Removes system theme change listener and resets related variables
   */
  function cleanupSystemListener() {
    if (media && systemListener) {
      media.removeEventListener("change", systemListener);
    }
    media = null;
    systemListener = null;
  }

  /**
   * Handles theme selection between system, light, and dark modes
   * Sets up appropriate listeners and applies theme classes
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
   * Updates online/offline status and auth mode based on network connectivity
   * Called when network status changes
   */
  function updateOnlineStatus() {
    const online = navigator.onLine;
    isOnline.set(online);
    authMode.set(online ? "online" : "offline");
  }

  /**
   * Initiates the auth process when user explicitly decides to sign in
   * Loads Clerk SDK and marks session as initiated
   */
  function handleInitiateAuth() {
    if (browser) {
      // Mark the session as having initiated auth
      markSessionAuthInitiated();
      // Set flag to load Clerk
      loadClerk = true;
    }
  }

  /**
   * Initializes the application with required setup:
   * - Theme configuration
   * - Analytics tracking
   * - Online/offline detection
   * - Internationalization
   * - Auth session check
   *
   * Includes error handling and initialization state management
   */
  async function initializeApp() {
    if (!browser || isInitialized) return;

    try {
      // Initialize theme
      const currentTheme = get(theme);
      selectTheme(currentTheme);

      // Initialize tracking
      initializeTracking();

      // Set up online/offline handlers
      window.addEventListener("online", updateOnlineStatus);
      window.addEventListener("offline", updateOnlineStatus);

      // Initial online status check
      updateOnlineStatus();

      // Check auth state to see if we need to load Clerk
      const sessionState = getSessionState();
      loadClerk = sessionState === "pending" || sessionState === "claimed";

      // Initialize i18n
      try {
        await waitLocale();
      } catch (error) {
        console.error("Error initializing i18n:", error);
      }

      // Mark as initialized and ready
      isInitialized = true;
      i18nReady = true;
    } catch (error) {
      console.error("Error during initialization:", error);
      // Still mark as initialized to prevent getting stuck
      isInitialized = true;
      i18nReady = true;
    }
  }

  // Initialize app on component mount
  onMount(() => {
    initializeApp();

    // Safety timeout to prevent infinite loading state
    const timeout = setTimeout(() => {
      if (!isInitialized || !i18nReady) {
        console.warn("Initialization timed out, continuing anyway");
        isInitialized = true;
        i18nReady = true;
      }
    }, 2000);

    // Cleanup function to remove event listeners and theme watchers
    return () => {
      clearTimeout(timeout);
      if (browser) {
        window.removeEventListener("online", updateOnlineStatus);
        window.removeEventListener("offline", updateOnlineStatus);
      }
      cleanupSystemListener();
    };
  });

  // Custom navigation handler for Clerk
  function handleClerkNavigation(to: string) {
    goto(to);
  }
</script>

<!-- Loading state while i18n initializes -->
{#if !i18nReady}
  <div class="flex min-h-screen items-center justify-center">
    <p>Loading...</p>
  </div>
{:else}
  <!-- Always use ClerkProvider to prevent context errors -->
  <ClerkProvider
    publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? ""}
    appearance={{
      layout: {
        logoPlacement: "inside",
        showOptionalFields: true,
        socialButtonsVariant: "iconButton"
      },
      variables: {
        colorPrimary: "rgb(59, 130, 246)"
      }
    }}
  >
    <div class="flex min-h-screen flex-col">
      <!-- Conditional header rendering -->
      {#if showHeaderFooter()}
        <AppHeader />
      {/if}
      <main class="flex-1">
        <!-- Offline status notification -->
        {#if !$isOnline}
          <div class="container mx-auto flex items-center justify-center p-4">
            <p class="text-muted-foreground text-sm">
              You are offline. Your data will be stored locally.
            </p>
          </div>
        {/if}
        <!-- Apply motion wrapper around the content but not the header/footer -->
        <MotionWrapper>
          <!-- Render child components wrapped with ClerkWrapper -->
          <ClerkWrapper initiateAuth={handleInitiateAuth}>
            {@render children()}
          </ClerkWrapper>
        </MotionWrapper>
      </main>
      <!-- Conditional footer rendering -->
      {#if showHeaderFooter()}
        <AppFooter />
      {/if}
    </div>
  </ClerkProvider>
{/if}
