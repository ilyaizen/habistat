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
  import { page } from "$app/stores";
  import { setContext } from "svelte";
  import { waitLocale } from "svelte-i18n";
  import { writable, get } from "svelte/store";
  import { theme } from "$lib/stores/settings";
  import { resetMode, setMode } from "mode-watcher";
  import { ClerkProvider } from "svelte-clerk";
  import { getSessionState, initializeTracking } from "$lib/utils/tracking";
  import MotionWrapper from "$lib/components/motion-wrapper.svelte";

  import "../app.css";

  import AppHeader from "$lib/components/app-header.svelte";
  import AppFooter from "$lib/components/app-footer.svelte";
  import { browser } from "$app/environment";

  // Props from parent component using Svelte 5 syntax
  let { children } = $props();

  // Hide header/footer on the landing page (/)
  // Using $derived to reactively compute based on $page.url.pathname
  const showHeaderFooter = $derived($page.url.pathname !== "/");

  // Stores for managing authentication and connectivity state
  const authMode = writable<"offline" | "online">("offline");
  const isOnline = writable(true);

  setContext("authMode", authMode);
  setContext("isOnline", isOnline);

  // State for tracking initialization progress
  let i18nReady = $state(false);
  let trackingInitialized = $state(false);

  // Theme management variables
  let media: MediaQueryList | null = null;
  let systemListener: (() => void) | null = null;

  /**
   * Applies the system theme based on user's OS preference
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
   */
  function setupSystemListener() {
    cleanupSystemListener();
    media = window.matchMedia("(prefers-color-scheme: dark)");
    systemListener = () => applySystemTheme();
    media.addEventListener("change", systemListener);
  }

  /**
   * Removes system theme change listener
   */
  function cleanupSystemListener() {
    if (media && systemListener) {
      media.removeEventListener("change", systemListener);
    }
    media = null;
    systemListener = null;
  }

  /**
   * Handles theme selection
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
   * Updates online/offline status
   */
  function updateOnlineStatus() {
    const online = navigator.onLine;
    isOnline.set(online);
    authMode.set(online ? "online" : "offline");
  }

  /**
   * Initializes the application core setup
   */
  async function initializeAppCore() {
    if (!browser) return;

    try {
      // Initialize theme
      const currentTheme = get(theme);
      selectTheme(currentTheme);

      // Initialize tracking
      initializeTracking();
      trackingInitialized = true;

      // Set up online/offline handlers
      window.addEventListener("online", updateOnlineStatus);
      window.addEventListener("offline", updateOnlineStatus);

      // Initial online status check
      updateOnlineStatus();

      // Initialize i18n
      try {
        await waitLocale();
      } catch (error) {
        console.error("Error initializing i18n:", error);
      }
      i18nReady = true;

      console.log("+layout.svelte: App core initialized");
    } catch (error) {
      console.error("Error during core initialization:", error);
      // Still mark as initialized to prevent getting stuck
      trackingInitialized = true;
      i18nReady = true;
    }
  }

  onMount(() => {
    initializeAppCore();

    // Cleanup function
    return () => {
      if (browser) {
        window.removeEventListener("online", updateOnlineStatus);
        window.removeEventListener("offline", updateOnlineStatus);
      }
      cleanupSystemListener();
    };
  });
</script>

<!-- Loading state while i18n initializes -->
{#if !i18nReady || !trackingInitialized}
  <div class="flex min-h-screen items-center justify-center">
    <p>Loading...</p>
  </div>
{:else}
  <!-- Wrap main content with ClerkProvider -->
  {#if browser}
    <ClerkProvider
      publishableKey={import.meta.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""}
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
        {#if showHeaderFooter}
          <AppHeader />
        {/if}
        <main class="flex-1">
          {#if !$isOnline && $authMode === "online"}
            <div class="container mx-auto flex items-center justify-center p-4">
              <p class="text-muted-foreground text-sm">
                You are offline. Your data will be stored locally.
              </p>
            </div>
          {/if}
          <MotionWrapper>
            {@render children()}
          </MotionWrapper>
        </main>
        {#if showHeaderFooter}
          <AppFooter />
        {/if}
      </div>
    </ClerkProvider>
  {:else}
    <!-- Server-side rendering fallback -->
    <div class="flex min-h-screen flex-col">
      {#if showHeaderFooter}
        <AppHeader />
      {/if}
      <main class="flex-1">
        <MotionWrapper>
          {@render children()}
        </MotionWrapper>
      </main>
      {#if showHeaderFooter}
        <AppFooter />
      {/if}
    </div>
  {/if}
{/if}
