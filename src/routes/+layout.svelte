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
  import { writable, get, derived, type Readable } from "svelte/store";
  import { theme } from "$lib/stores/settings";
  import { resetMode, setMode } from "mode-watcher";
  import { ClerkProvider } from "svelte-clerk";
  import { getContext } from "svelte";
  import type { Clerk } from "@clerk/clerk-js";
  import type { UserResource } from "@clerk/types";
  import {
    getSessionState,
    initializeTracking,
    markSessionAssociated,
    sessionStore
  } from "$lib/utils/tracking";
  import MotionWrapper from "$lib/components/motion-wrapper.svelte";
  import type { LayoutData } from "./$types"; // Import LayoutData type

  // Add console log here to check the env variable
  console.log(
    "Layout - VITE_PUBLIC_CLERK_PUBLISHABLE_KEY:",
    import.meta.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY
  );

  import "../app.css";

  import AppHeader from "$lib/components/app-header.svelte";
  import AppFooter from "$lib/components/app-footer.svelte";
  import { browser } from "$app/environment";

  // Props from parent component using Svelte 5 syntax
  let { children, data } = $props<{ children: Snippet; data: LayoutData }>(); // Receive data prop

  // Hide header/footer on the landing page (/)
  const showHeaderFooter = derived(page, ($p) => $p.url.pathname !== "/");

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

  onMount(() => {
    initializeAppCore();

    // Attempt to get Clerk from context after component is mounted
    setTimeout(handleClerkLoaded, 100);

    return () => {
      if (browser) {
        window.removeEventListener("online", updateOnlineStatus);
        window.removeEventListener("offline", updateOnlineStatus);
        cleanupSystemListener();
      }
    };
  });

  // Initialize Clerk store for user data
  const clerkStore = writable<Clerk | null>(null);

  // Create a derived store for the user state
  const user = derived(clerkStore, ($clerk, set) => {
    if (!$clerk) {
      set(null);
      return;
    }

    // Set initial state
    set($clerk.user || null);

    // Set up listener
    const unsubscribe = $clerk.addListener(({ user }) => {
      set(user || null);
    });

    return unsubscribe;
  }) as Readable<UserResource | null>;

  // Set the user store in context for child components
  setContext("clerk-user", user);

  // Effect to handle session association
  $effect(() => {
    const userData = get(user) as UserResource | null;
    const currentSession = get(sessionStore);

    if (!trackingInitialized || !currentSession) return;

    const currentSessionState = currentSession.state;

    if (userData?.id && currentSessionState === "anonymous") {
      console.log(`Layout Effect Action: Associating session (User ID: ${userData.id})`);
      markSessionAssociated(
        userData.id,
        userData.primaryEmailAddress?.emailAddress ?? "email_not_found"
      );
    }
  });

  // Handle loaded Clerk
  function handleClerkLoaded() {
    const clerkObj = getContext<Clerk | null>("clerk");
    if (clerkObj) {
      clerkStore.set(clerkObj);
    }
  }

  // Determine if the app is fully ready to render content
  const isReady = true; // Force to true to avoid loading issues
</script>

<ClerkProvider publishableKey={import.meta.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY}>
  <MotionWrapper>
    <div class="flex min-h-screen flex-col">
      {#if showHeaderFooter}
        <AppHeader />
      {/if}

      <main class="flex-1">
        {#if isReady}
          {@render children()}
        {:else}
          <div class="flex min-h-[60vh] items-center justify-center">
            <p>Loading...</p>
          </div>
        {/if}
      </main>

      {#if showHeaderFooter}
        <AppFooter />
      {/if}
    </div>
  </MotionWrapper>
</ClerkProvider>
