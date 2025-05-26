<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Globe, RefreshCw, Target } from "lucide-svelte";
  import { anonymousUserId } from "$lib/utils/tracking";
  import { goto } from "$app/navigation";
  // import { Card, CardContent } from "$lib/components/ui/card";

  // Props passed from parent (about-drawer)
  // open: Controls the visibility of the drawer
  export let open = false;
  // handleStart: Function to execute when the "Start Tracking Now" button is clicked
  export let handleStart: () => void;
  // showMoreInfoButton: Prop to control visibility of a button (currently unused in this snippet, might be for parent)
</script>

<!--
  This component renders the main content for the About/More Info drawer.
  It is designed to be used inside a Drawer.Content wrapper from a UI library like Vaul Svelte.
  The content includes an overview of Habistat, its features, getting started guide, and other relevant links.
-->
<div
  class="about-drawer-scroll text-muted-foreground min-h-0 flex-1 overflow-y-auto p-4 sm:p-8 md:p-16"
>
  <!--
    Responsive padding: p-4 on mobile, p-8 on small screens, p-16 on md+ for comfortable spacing.
  -->
  <!--
      Responsive grid: single column on mobile, two columns on md+ screens. Increased gap for better separation.
    -->
  <div class="flex flex-col items-center justify-center space-y-4">
    <!-- Logo + Title -->
    <div class="flex items-center gap-4">
      <img src="/logo.svg" alt="Habistat Logo" class="h-12 w-12" />
      <h1 class="mt-1 text-4xl">Habistat</h1>
    </div>
    <!-- Tagline -->
    <div class="text-muted-foreground text-center text-lg font-medium sm:text-xl">
      Build habits. Track progress. Achieve goals.
    </div>
    <!-- Features Row -->
    <div class="mt-16 mb-16 flex flex-row flex-wrap justify-center gap-16">
      <div class="flex flex-col items-center">
        <Globe class="text-primary mb-1 h-7 w-7" aria-label="Open-Source" />
        <span class="text-base font-semibold">Open-Source</span>
      </div>
      <div class="flex flex-col items-center">
        <RefreshCw class="text-primary mb-1 h-7 w-7" aria-label="Cross-Platform" />
        <span class="text-base font-semibold">Cross-Platform</span>
      </div>
      <div class="flex flex-col items-center">
        <Target class="text-primary mb-1 h-7 w-7" aria-label="Semi-Gamified" />
        <span class="text-base font-semibold">Semi-Gamified</span>
      </div>
    </div>
    <p class="max-w-2xl text-base sm:text-lg">
      <!--
          Responsive font size for intro text.
        -->
      <strong>Habistat</strong> is a free and open-source <strong>habit tracker</strong> focused on privacy
      and simplicity. It helps you build good habits, break bad ones, and track daily activity, with
      your data fully under your control. Features include time-based habit tracking and optional gamification:
      streaks, points, and a virtual garden that grows – ideally, like you. 🌱
    </p>
    <p class="max-w-2xl text-base sm:text-lg">
      An alternative to apps like <strong>Everyday</strong>, <strong>Habitify</strong>, and
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
    <!--
      CTA button is always centered and constrained in width for mobile friendliness.
    -->
    <Button
      onclick={() => {
        if ($anonymousUserId) {
          goto("/dashboard");
        } else {
          handleStart();
        }
        open = false; // Close drawer on button click
      }}
      size="lg"
      class="btn-3d mt-4 w-full max-w-40 self-center"
    >
      {#if $anonymousUserId}
        Dashboard
      {:else}
        Start
      {/if}
    </Button>
    <p class="text-muted-foreground/80 text-xs italic">No sign-up required.</p>
  </div>
</div>

<style>
  a {
    text-decoration: underline !important;
  }
</style>
