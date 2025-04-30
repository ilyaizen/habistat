<!-- /**
 * Root layout component for the Habistat application.
 * Handles core application setup including:
 * - Theme management (system/light/dark)
 * - Internationalization (i18n)
 * - Application initialization
 * - Header/footer visibility
 * - Authentication state with Clerk
 * - Session association
 */ -->

<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { setContext, type Snippet } from "svelte";
  import { waitLocale } from "svelte-i18n";
  import { writable, get, readable } from "svelte/store";
  import { theme } from "$lib/stores/settings";
  import { resetMode, setMode } from "mode-watcher";
  import { ClerkProvider } from "svelte-clerk";
  // Re-import Clerk types needed for the readable store
  import type { LoadedClerk, UserResource } from "@clerk/types";
  // Import tracking initialization function and session management utilities
  import { initializeTracking, sessionStore, markSessionAssociated } from "$lib/utils/tracking";
  import MotionWrapper from "$lib/components/motion-wrapper.svelte";
  import type { LayoutData } from "./$types"; // Import LayoutData type
  import AppFooter from "$lib/components/app-footer.svelte";
  import { browser } from "$app/environment";

  // Logging Clerk publishable key during development for verification
  console.log(
    "Layout - VITE_PUBLIC_CLERK_PUBLISHABLE_KEY:",
    import.meta.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY
  );

  import "../app.css";

  import AppHeader from "$lib/components/app-header.svelte";
  import { goto } from "$app/navigation";

  // Props received from parent routes using Svelte 5 $props rune
  let { children, data } = $props<{ children: Snippet; data: LayoutData }>(); // Receive data prop

  // Derive whether to show header/footer based on the current page path
  // Hides them on the landing page ("/")
  const showHeaderFooter = $derived(page.url.pathname !== "/");

  // Stores for managing authentication state
  const authModeStore = writable<"offline" | "online">("offline"); // Tracks if auth should operate online or offline
  // Make stores available to child components via context
  setContext("authMode", authModeStore);

  // State for tracking initialization progress
  let i18nReady = $state(false); // Flag indicating i18n initialization is complete
  let trackingInitialized = $state(false); // Flag indicating user tracking initialization is complete

  // Theme management variables
  let media: MediaQueryList | null = null; // Reference to the media query list for dark mode preference
  let systemListener: (() => void) | null = null; // Listener function for system theme changes

  // Create a readable store for the Clerk user state
  const clerkUserStore = readable<UserResource | null>(null, (set) => {
    if (!browser) return;

    let unsubscribe: (() => void) | null = null;

    // Function to initialize Clerk state from window object
    function initializeClerkStateFromWindow() {
      const clerk = window.Clerk as unknown as LoadedClerk | undefined;
      if (clerk) {
        console.log("[Layout] window.Clerk found:", clerk);
        set(clerk.user ?? null);

        // Add listener to update store on auth changes
        unsubscribe = clerk.addListener(({ user }) => {
          console.log("[Layout] Clerk listener update:", user);
          set(user ?? null);
        });
      } else {
        console.log("[Layout] window.Clerk not found yet, will retry...");
        set(null);
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
  $effect(() => {
    if (!browser) return;

    const user = $clerkUserStore;
    const session = $sessionStore;

    console.log(
      `[Layout Effect] User: ${user?.id ?? "null"}, Session: ${session?.id ?? "null"} (${session?.state ?? "unknown"})`
    );

    // Check if we need to associate the session
    if (user?.id && session?.state === "anonymous") {
      console.log(`[Layout Effect] Associating session for user ${user.id}`);
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
   * Clerk initialization is handled separately by ClerkProvider.
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

      // Initialize i18n
      try {
        await waitLocale();
        i18nReady = true;
      } catch (error) {
        // Log i18n errors but mark as ready to avoid blocking app load
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

    // Return cleanup function to remove listeners when the component is destroyed.
    return () => {
      if (browser) {
        cleanupSystemListener();
      }
    };
  });
</script>

<ClerkProvider publishableKey={import.meta.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY}>
  <!-- ClerkProvider wraps the application to provide authentication context -->
  <div class="flex min-h-screen flex-col">
    {#if showHeaderFooter}
      <!-- Render AppHeader conditionally based on derived store -->
      <AppHeader />
    {/if}
    <MotionWrapper>
      <!-- Main content area -->
      <main class="min-h-screen flex-1">
        {#if i18nReady && trackingInitialized}
          <!-- Render child content using the children prop -->
          {@render children()}
        {:else}
          <!-- Display loading indicator while waiting for initialization -->
          <div class="flex min-h-[60vh] items-center justify-center">
            <p>Loading core app...</p>
          </div>
        {/if}
      </main>
    </MotionWrapper>
    {#if showHeaderFooter}
      <!-- Render AppFooter conditionally -->
      <AppFooter />
    {/if}
  </div>
</ClerkProvider>
