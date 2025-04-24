<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { setContext } from "svelte";
  import { waitLocale } from "svelte-i18n";
  import { writable, derived, get } from "svelte/store";
  import { theme } from "$lib/stores/settings";
  import { resetMode, setMode } from "mode-watcher";

  import "../app.css";

  import AppHeader from "$lib/components/app-header.svelte";
  import AppFooter from "$lib/components/app-footer.svelte";
  import { browser } from "$app/environment";
  import { initializeTracking } from "$lib/utils/tracking";

  // Get children prop from $props()
  let { children } = $props();

  // Create a state variable for header/footer visibility
  let showHeaderFooter = $state(() => page.url.pathname !== "/");

  // Create an auth store that works offline-first
  const authMode = writable<"offline" | "online">("offline");
  const isOnline = writable(true);

  // Provide auth mode and online status to child components
  setContext("authMode", authMode);
  setContext("isOnline", isOnline);

  let i18nReady = $state(false);
  let isInitialized = $state(false);

  // Theme handling
  let media: MediaQueryList | null = null;
  let systemListener: (() => void) | null = null;

  function applySystemTheme() {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  function setupSystemListener() {
    cleanupSystemListener();
    media = window.matchMedia("(prefers-color-scheme: dark)");
    systemListener = () => applySystemTheme();
    media.addEventListener("change", systemListener);
  }

  function cleanupSystemListener() {
    if (media && systemListener) {
      media.removeEventListener("change", systemListener);
    }
    media = null;
    systemListener = null;
  }

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

  // Update online status
  function updateOnlineStatus() {
    const online = navigator.onLine;
    isOnline.set(online);
    authMode.set(online ? "online" : "offline");
  }

  // Initialize app state
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

  // Initialize on mount
  onMount(() => {
    initializeApp();

    // Fallback timeout for initialization
    const timeout = setTimeout(() => {
      if (!isInitialized || !i18nReady) {
        console.warn("Initialization timed out, continuing anyway");
        isInitialized = true;
        i18nReady = true;
      }
    }, 2000);

    return () => {
      clearTimeout(timeout);
      if (browser) {
        window.removeEventListener("online", updateOnlineStatus);
        window.removeEventListener("offline", updateOnlineStatus);
      }
      cleanupSystemListener();
    };
  });
</script>

{#if !i18nReady}
  <div class="flex min-h-screen items-center justify-center">
    <p>Loading...</p>
  </div>
{:else}
  <div class="flex min-h-screen flex-col">
    {#if showHeaderFooter()}
      <AppHeader />
    {/if}
    <main class="flex-1">
      {#if !$isOnline}
        <div class="container mx-auto flex items-center justify-center p-4">
          <p class="text-muted-foreground text-sm">
            You are offline. Your data will be stored locally.
          </p>
        </div>
      {/if}
      {@render children()}
    </main>
    {#if showHeaderFooter()}
      <AppFooter />
    {/if}
  </div>
{/if}

<style>
</style>
