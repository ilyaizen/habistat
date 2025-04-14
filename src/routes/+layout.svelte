<script lang="ts">
  import { ModeWatcher } from "mode-watcher";
  import MotionWrapper from "$lib/components/motion-wrapper.svelte";
  import { page } from "$app/stores";
  import AppHeader from "$lib/components/app-header.svelte";
  import AppFooter from "$lib/components/app-footer.svelte";
  import { writable } from "svelte/store";
  import { browser } from "$app/environment";
  import { setContext } from "svelte";
  import { ClerkProvider } from "svelte-clerk";
  import { PUBLIC_CLERK_PUBLISHABLE_KEY } from "$env/static/public";
  import "../app.css";
  import { isAnonymous } from "$lib/utils/tracking";
  import ClerkWrapper from "$lib/components/auth/clerk-wrapper.svelte";
  import { onMount } from "svelte";
  import { waitLocale } from "svelte-i18n";
  import { initializeTracking, createUserSession, anonymousUserId } from "$lib/utils/tracking";
  import { get } from "svelte/store";

  // Define a placeholder initiateAuth function for ClerkWrapper
  const initiateAuth = () => {
    console.log("initiateAuth called - placeholder");
  };

  // Determine if header/footer should be shown
  $: showHeaderFooter = $page.route.id !== "/";

  // Create an auth store that works offline-first
  const authMode = writable<"offline" | "online">("offline");

  // Provide auth mode to child components
  setContext("authMode", authMode);

  let clerkError: Error | null = null;
  let i18nReady = false;

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

  // Initialize i18n and Tracking
  onMount(async () => {
    if (typeof window !== "undefined") {
      initializeTracking();
      try {
        await waitLocale();
        i18nReady = true;
      } catch (error) {
        console.error("Error initializing i18n:", error);
      }
    }
  });
</script>

<!-- Root layout component that wraps all pages in the SvelteKit application. * This component
provides the base structure that will be present across all routes. -->
{#if !i18nReady}
  <div class="flex min-h-screen flex-col items-center justify-center p-4">
    <p class="text-muted-foreground text-lg">Loading...</p>
  </div>
{:else if $authMode === "online" && PUBLIC_CLERK_PUBLISHABLE_KEY}
  <!-- Define snippets *before* ClerkWrapper -->
  {#snippet anonymous({ initiateAuth }: { initiateAuth: () => void })}
    <div class="flex min-h-screen flex-col">
      <ModeWatcher />
      {#if showHeaderFooter}
        <AppHeader />
      {/if}
      <main class="flex-1">
        {#key $page.url.pathname}
          <MotionWrapper>
            <slot />
          </MotionWrapper>
        {/key}
      </main>
      {#if showHeaderFooter}
        <AppFooter />
      {/if}
    </div>
  {/snippet}

  {#snippet children()}
    <div class="flex min-h-screen flex-col">
      <ModeWatcher />
      {#if showHeaderFooter}
        <AppHeader />
      {/if}
      <main class="flex-1">
        {#key $page.url.pathname}
          <MotionWrapper>
            <slot />
          </MotionWrapper>
        {/key}
      </main>
      {#if showHeaderFooter}
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
    <ModeWatcher />
    {#if showHeaderFooter}
      <AppHeader />
    {/if}
    <main class="flex-1">
      {#if clerkError}
        <div class="flex min-h-[60vh] items-center justify-center">
          <p class="text-destructive">Authentication error: {clerkError.message}</p>
        </div>
      {:else}
        {#key $page.url.pathname}
          <MotionWrapper>
            <slot />
          </MotionWrapper>
        {/key}
      {/if}
    </main>
    {#if showHeaderFooter}
      <AppFooter />
    {/if}
  </div>
{/if}
