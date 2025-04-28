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
  import { writable, get, type Readable, derived as derivedStore, readable } from "svelte/store";
  import { theme } from "$lib/stores/settings";
  import { resetMode, setMode } from "mode-watcher";
  import { ClerkProvider } from "svelte-clerk";
  // Re-import Clerk types needed for the readable store
  import type { LoadedClerk, UserResource } from "@clerk/types";
  // Import tracking initialization function (association logic moved elsewhere)
  import { initializeTracking } from "$lib/utils/tracking";
  import MotionWrapper from "$lib/components/motion-wrapper.svelte";
  import type { LayoutData } from "./$types"; // Import LayoutData type
  import AppFooter from "$lib/components/app-footer.svelte";
  import { browser } from "$app/environment";
  // SessionAssociator component is no longer needed here
  // import SessionAssociator from "$lib/components/session-associator.svelte";

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
  const showHeaderFooter = derivedStore(page, ($p) => $p.url.pathname !== "/");

  // Stores for managing authentication and connectivity state
  const authModeStore = writable<"offline" | "online">("offline"); // Tracks if auth should operate online or offline
  const isOnlineStore = writable(true); // Tracks the browser's online status
  // Make stores available to child components via context
  setContext("authMode", authModeStore);
  setContext("isOnline", isOnlineStore);

  // State for tracking initialization progress
  let i18nReady = $state(false); // Flag indicating i18n initialization is complete
  let trackingInitialized = $state(false); // Flag indicating user tracking initialization is complete

  // Theme management variables
  let media: MediaQueryList | null = null; // Reference to the media query list for dark mode preference
  let systemListener: (() => void) | null = null; // Listener function for system theme changes

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
   * Updates the `isOnlineStore` and `authModeStore` based on the browser's navigator.onLine status.
   */
  function updateOnlineStatus() {
    const online = navigator.onLine;
    isOnlineStore.set(online);
    authModeStore.set(online ? "online" : "offline");
  }

  /**
   * Initializes core application functionalities on component mount in the browser.
   * Includes theme setup, tracking initialization, online/offline status detection, and i18n setup.
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

  // --- Reinstated Clerk User State Management --- >
  // Create a Svelte readable store to reactively track the Clerk user object.
  // This store is updated whenever the Clerk authentication state changes.
  const clerkUser = readable<UserResource | null>(null, (set) => {
    let unsubscribe: () => void = () => {}; // Function to clean up the Clerk listener

    // Asynchronous function to set up the listener for Clerk state changes.
    async function setupClerkListener() {
      if (!browser) return; // Ensure we are in the browser
      try {
        // Wait for Clerk to load (ClerkProvider should handle this, but we ensure)
        // Access Clerk instance via window.Clerk after it's loaded
        const clerkInstance = window.Clerk as LoadedClerk | undefined;

        if (!clerkInstance) {
          // Retry if Clerk not loaded yet
          // console.warn("[Layout Clerk Setup] window.Clerk not loaded, retrying...");
          // setTimeout(setupClerkListener, 100); // Optional: add a small delay
          // For now, just set null and let the listener pick it up later
          set(null);
          // Listener below will still run once Clerk loads
        }

        // Even if instance isn't available immediately, setup the listener
        // ClerkProvider ensures Clerk loads and initializes.
        if (window.Clerk) {
          set(window.Clerk.user ?? null); // Set initial value
          unsubscribe = window.Clerk.addListener(({ user }) => {
            set(user ?? null); // Update the store with the new user object (or null)
          });
        } else {
          console.error(
            "[Layout Clerk Setup] window.Clerk instance not found, cannot add listener immediately."
          );
          set(null);
        }
      } catch (error) {
        console.error("[Layout Clerk Setup] Error setting Clerk listener:", error);
        set(null); // Set to null on error
      }
    }

    // Run on mount to ensure Clerk potentially loaded by ClerkProvider
    onMount(() => {
      setupClerkListener();
    });

    // Cleanup function for the readable store: remove the Clerk listener
    return () => {
      unsubscribe();
    };
  });
  // Set the reactive clerkUser store in Svelte context for child components
  setContext("clerk-user", clerkUser);
  // <--- End Reinstated Clerk User State Management ---

  onMount(() => {
    // Initialize core functionalities when the component mounts in the browser.
    initializeAppCore();
    // Clerk listener setup moved inside the readable store

    // Return cleanup function to remove listeners when the component is destroyed.
    return () => {
      if (browser) {
        window.removeEventListener("online", updateOnlineStatus);
        window.removeEventListener("offline", updateOnlineStatus);
        cleanupSystemListener();
      }
    };
  });
</script>

<ClerkProvider publishableKey={import.meta.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY}>
  <!-- ClerkProvider wraps the application to provide authentication context -->
  <div class="flex min-h-screen flex-col">
    {#if $showHeaderFooter}
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
    {#if $showHeaderFooter}
      <!-- Render AppFooter conditionally -->
      <AppFooter />
    {/if}
  </div>
</ClerkProvider>
