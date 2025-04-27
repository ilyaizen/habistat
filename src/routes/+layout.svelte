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
  import { setContext, type Snippet } from "svelte";
  import { waitLocale } from "svelte-i18n";
  import { writable, get, type Readable, derived as derivedStore } from "svelte/store";
  import { theme } from "$lib/stores/settings";
  import { resetMode, setMode } from "mode-watcher";
  import { ClerkProvider } from "svelte-clerk";
  import { getContext } from "svelte";
  import type { Clerk, UserResource } from "@clerk/types";
  import {
    initializeTracking,
    markSessionAssociated,
    sessionStore,
    type UserSession
  } from "$lib/utils/tracking";
  import MotionWrapper from "$lib/components/motion-wrapper.svelte";
  import type { LayoutData } from "./$types"; // Import LayoutData type
  import AppFooter from "$lib/components/app-footer.svelte";
  import { browser } from "$app/environment";
  import SessionAssociator from "$lib/components/session-associator.svelte";

  // Add console log here to check the env variable
  console.log(
    "Layout - VITE_PUBLIC_CLERK_PUBLISHABLE_KEY:",
    import.meta.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY
  );

  import "../app.css";

  import AppHeader from "$lib/components/app-header.svelte";

  // Props from parent component using Svelte 5 syntax
  let { children, data } = $props<{ children: Snippet; data: LayoutData }>(); // Receive data prop

  // Hide header/footer on the landing page (/)
  const showHeaderFooter = derivedStore(page, ($p) => $p.url.pathname !== "/");

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

      // Initialize tracking (waits for store to load from localStorage)
      await initializeTracking();
      trackingInitialized = true;

      // Set up online/offline handlers
      window.addEventListener("online", updateOnlineStatus);
      window.addEventListener("offline", updateOnlineStatus);

      // Initial online status check
      updateOnlineStatus();

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

  const userStore = getContext<Readable<UserResource | null>>("clerk-user");
  // --- Logging context value ---
  console.log("[Layout Script Top Level] Initial userStore value from getContext:", get(userStore));
  // ---------------------------

  onMount(() => {
    // --- REMOVED Clerk instance retrieval and listener setup ---

    // --- Logging context value in onMount (optional, for debug) ---
    // console.log("[Layout onMount Start] userStore value:", get(userStore));
    // ------------------------------------------------------------

    initializeAppCore(); // No .then() needed here anymore

    return () => {
      if (browser) {
        window.removeEventListener("online", updateOnlineStatus);
        window.removeEventListener("offline", updateOnlineStatus);
        cleanupSystemListener();
        // --- REMOVED Clerk listener cleanup ---
      }
    };
  });

  // --- Kept: Effect specifically to monitor sessionStore changes ---
  $effect(() => {
    const currentSession = $sessionStore; // Subscribe reactively
    console.log(
      `[Layout Session Monitor Effect] sessionStore changed: ${currentSession ? `${currentSession.id} (${currentSession.state})` : "null"}`,
      JSON.stringify(currentSession)
    );
  });
  // ------------------------------------------------------------------

  // Determine if the app is fully ready to render content
  // Let's rely on i18n and tracking flags for readiness
  // Use $derived rune for computed reactive state
  const isReady = $derived(i18nReady && trackingInitialized);
</script>

<ClerkProvider publishableKey={import.meta.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY}>
  <!-- Include the SessionAssociator component here, ONLY when tracking is initialized -->
  {#if trackingInitialized}
    <SessionAssociator />
  {/if}

  <div class="flex min-h-screen flex-col">
    {#if $showHeaderFooter}
      <AppHeader />
    {/if}
    <MotionWrapper>
      <main class="min-h-screen flex-1">
        {#if isReady}
          {@render children()}
        {:else}
          <div class="flex min-h-[60vh] items-center justify-center">
            <p>Loading...</p>
          </div>
        {/if}
      </main>
    </MotionWrapper>
    {#if $showHeaderFooter}
      <AppFooter />
    {/if}
  </div>
</ClerkProvider>
