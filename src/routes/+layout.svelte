<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/stores";
  import { setContext } from "svelte";
  import { waitLocale } from "svelte-i18n";
  import { writable, derived, get } from "svelte/store";
  import { theme } from "$lib/stores/settings";
  import { resetMode, setMode } from "mode-watcher";

  import "../app.css";

  import AppFooter from "$lib/components/app-footer.svelte";
  import AppHeader from "$lib/components/app-header.svelte";

  import { browser } from "$app/environment";

  import MotionWrapper from "$lib/components/motion-wrapper.svelte";
  import { initializeTracking } from "$lib/utils/tracking";

  import ClerkWrapper from "$lib/components/auth/clerk-wrapper.svelte";
  import { ClerkProvider } from "svelte-clerk";
  import { PUBLIC_CLERK_PUBLISHABLE_KEY } from "$env/static/public";

  // Define a placeholder initiateAuth function for ClerkWrapper
  const initiateAuth = () => {
    console.log("initiateAuth called - placeholder");
  };

  // Create a derived store for header/footer visibility
  const showHeaderFooter = derived(page, ($page) => $page.url.pathname !== "/");

  // Create an auth store that works offline-first
  const authMode = writable<"offline" | "online">("offline");

  // Provide auth mode to child components
  setContext("authMode", authMode);

  let clerkError: Error | null = null;
  let i18nReady = false;

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

  // Try to set up Clerk if we're in the browser
  if (browser) {
    try {
      if (!PUBLIC_CLERK_PUBLISHABLE_KEY) {
        console.warn("No Clerk publishable key found, falling back to offline mode");
      } else {
        authMode.set("online");
      }
    } catch (error) {
      console.error("Error setting up Clerk:", error);
      clerkError = error as Error;
    }
  }

  // Initialize theme, i18n, and Tracking
  onMount(async () => {
    if (typeof window !== "undefined") {
      // Initialize theme using the working logic from settings page
      const currentTheme = get(theme);
      selectTheme(currentTheme);

      initializeTracking();
      try {
        await waitLocale();
        i18nReady = true;
      } catch (error) {
        console.error("Error initializing i18n:", error);
      }
    }
  });

  onDestroy(() => {
    cleanupSystemListener();
  });
</script>

<!-- Root layout component that wraps all pages in the SvelteKit application. -->
{#if !i18nReady}
  <div class="flex min-h-screen flex-col items-center justify-center p-4">
    <p class="text-muted-foreground text-lg">Loading...</p>
  </div>
{:else if $authMode === "online" && PUBLIC_CLERK_PUBLISHABLE_KEY}
  <!-- Define snippets *before* ClerkWrapper -->
  {#snippet anonymous({ initiateAuth }: { initiateAuth: () => void })}
    <div class="flex min-h-screen flex-col">
      {#if $showHeaderFooter}
        <AppHeader />
      {/if}
      <main class="flex-1">
        <MotionWrapper>
          <slot />
        </MotionWrapper>
      </main>
      {#if $showHeaderFooter}
        <AppFooter />
      {/if}
    </div>
  {/snippet}

  {#snippet children()}
    <div class="flex min-h-screen flex-col">
      {#if $showHeaderFooter}
        <AppHeader />
      {/if}
      <main class="flex-1">
        <MotionWrapper>
          <slot />
        </MotionWrapper>
      </main>
      {#if $showHeaderFooter}
        <AppFooter />
      {/if}
    </div>
  {/snippet}

  <ClerkProvider publishableKey={PUBLIC_CLERK_PUBLISHABLE_KEY}>
    <ClerkWrapper {initiateAuth} {children} {anonymous} />
  </ClerkProvider>
{:else}
  <!-- Offline mode -->
  <div class="flex min-h-screen flex-col">
    {#if $showHeaderFooter}
      <AppHeader />
    {/if}
    <main class="flex-1">
      {#if clerkError}
        <div class="flex min-h-[60vh] items-center justify-center">
          <p class="text-destructive">Authentication error: {clerkError.message}</p>
        </div>
      {:else}
        <MotionWrapper>
          <slot />
        </MotionWrapper>
      {/if}
    </main>
    {#if $showHeaderFooter}
      <AppFooter />
    {/if}
  </div>
{/if}
