<script lang="ts">
  import { Globe, RefreshCw, Target } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import { anonymousUserId } from "$lib/utils/tracking";
  import QuoteOfTheDay from "./quote-of-the-day.svelte";
  // import EnvironmentIndicator from "./environment-indicator-old.svelte";
  import SocialLinks from "./social-links.svelte";

  // Svelte 5: Use callback props instead of createEventDispatcher for events
  let {
    handleStart,
    open = $bindable(),
    onClose
  }: {
    handleStart: () => void;
    open?: boolean;
    onClose?: () => void;
  } = $props();
</script>

<!--
  This component renders the main content for the About/More Info drawer.
  It is designed to be used inside a Drawer.Content wrapper from a UI library like Vaul Svelte.
  The content includes an overview of Habistat, its features, getting started guide, and other relevant links.
-->
<div
  class="about-drawer-scroll text-muted-foreground min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8 sm:py-12 md:px-16 md:py-20"
>
  <div class="flex flex-col items-center justify-center gap-6">
    <!-- Logo + Title -->
    <div class="flex items-center gap-4">
      <img src="/logo.svg" alt="Habistat Logo" class="h-12 w-12" />
      <h1 class="mt-1 text-3xl font-bold tracking-tight">Habistat</h1>
    </div>
    <!-- Tagline -->
    <div class="text-primary/80 text-center text-base font-medium sm:text-xl">
      Build habits. Track progress. Achieve goals.
    </div>
    <!-- Features Row -->
    <div class="mt-10 mb-10 flex flex-row flex-wrap justify-center gap-10">
      <div class="flex flex-col items-center gap-1">
        <Globe class="text-primary mb-1 h-7 w-7" aria-label="Open-Source" />
        <span class="text-base font-semibold">Open-Source</span>
      </div>
      <div class="flex flex-col items-center gap-1">
        <RefreshCw class="text-primary mb-1 h-7 w-7" aria-label="Cross-Platform" />
        <span class="text-base font-semibold">Cross-Platform</span>
      </div>
    </div>
    <p class="text-muted-foreground/90 max-w-2xl text-center text-sm sm:text-lg">
      <strong>Habistat</strong> is a free and open-source
      <strong>habit tracker</strong> focused on privacy and simplicity. It helps you build good habits,
      break bad ones, and track daily activity, with your data fully under your control.
    </p>
    <p class="text-muted-foreground/90 max-w-2xl text-center text-sm sm:text-lg">
      An alternative to apps like <strong>Everyday</strong>,
      <strong>Habitify</strong>, and
      <strong>Habitica</strong>, it is built with the lightweight
      <a
        href="https://v2.tauri.app/"
        target="_blank"
        rel="noopener"
        class="text-primary font-bold hover:underline">Tauri</a
      >
      framework and runs smoothly on Android, iOS, Windows, macOS, and in any modern browser.
    </p>
  </div>

  <!-- CTA Button Section -->
  <div class="mx-auto my-8 flex w-full max-w-md flex-col items-center gap-2">
    <Button
      onclick={() => {
        if ($anonymousUserId) {
          goto("/dashboard");
        } else {
          handleStart();
        }
        onClose?.();
      }}
      size="lg"
      class="btn-3d mt-4 w-full max-w-40 self-center"
    >
      {#if $anonymousUserId}
        Go to Habits
      {:else}
        Get Started
      {/if}
    </Button>
    <p class="text-muted-foreground/80 text-xs italic">No sign-up required.</p>
  </div>
  <Separator class="my-8" />
  <!-- <div class="mb-2 flex justify-center">
    <EnvironmentIndicator />
  </div> -->

  <!-- Center: Quote of the Day -->
  <div class="flex justify-center">
    <QuoteOfTheDay />
  </div>

  <!-- Social links reused from footer -->
  <div class="mt-6 flex justify-center">
    <SocialLinks />
  </div>
</div>
