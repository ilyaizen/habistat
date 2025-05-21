<script lang="ts">
  import { slide } from "svelte/transition";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import * as Drawer from "$lib/components/ui/drawer/index.js";
  import { X } from "lucide-svelte";
  import { anonymousUserId } from "$lib/utils/tracking";
  import { goto } from "$app/navigation";

  // Props
  export let showMoreInfoButton = false;
  export let open = false;
  export let handleStart: () => void;
</script>

<Drawer.Root bind:open>
  <Drawer.Trigger>
    <!-- More Info Button (appears after user scrolls down) -->
    {#if showMoreInfoButton && !open}
      <div
        class="fixed bottom-0 left-1/2 z-[100] -translate-x-1/2 p-2"
        transition:slide={{ duration: 250 }}
      >
        <Button class={buttonVariants({ variant: "outline" })} aria-label="Show more info">
          More Info
        </Button>
      </div>
    {/if}
  </Drawer.Trigger>

  <Drawer.Content class="mx-auto flex max-h-[90vh] max-w-[90vw] flex-col">
    <!--
      Sticky header (title + close button) stays at the top and full width
    -->
    <Drawer.Close
      class={`${buttonVariants({ variant: "outline", size: "icon" })} absolute top-2 right-2`}
      aria-label="Close"
    >
      <X class="h-4 w-4" />
    </Drawer.Close>
    <!--
      Only the first section (headline, intro, CTA) is split into a two-column grid.
      The illustration is on the right and hidden on small screens.
      Both sides scroll together as part of the main scrollable area.
    -->
    <div class="about-drawer-scroll min-h-0 flex-1 overflow-y-auto p-4">
      <!--
        The 'about-drawer-scroll' class is used to target this container for custom, subtle scrollbar styling
        that works in both light and dark themes. See src/app.css for the scrollbar CSS.
      -->
      <div class="mb-8 grid grid-cols-1 items-center gap-8 md:grid-cols-2">
        <!-- Left: Headline, intro, CTA button -->
        <div class="flex flex-col gap-2 p-8">
          <!--
            Logo and title are now in a flex row for single-line alignment.
            Increased size for both logo and text for better prominence.
          -->
          <span class="flex items-center gap-2 text-3xl font-bold md:text-4xl">
            <img src="/logo.png" alt="Habistat Logo" class="h-10 w-10" />
            Habistat
          </span>
          <h1 class="mt-8 text-4xl leading-tight tracking-wide uppercase">
            <strong>Build Habits.<br />Track Progress.<br />Achieve Goals.</strong>
          </h1>
          <p class="mt-8 text-sm">
            <span role="img" aria-label="Open-Source">🌐</span> <strong>Open-Source</strong> |
            <span role="img" aria-label="Privacy-First">🛡️</span> <strong>Privacy-First</strong>
            |
            <span role="img" aria-label="Cross-Platform">🔄</span>
            <strong>Cross-Platform</strong>
            |
            <span role="img" aria-label="Semi-Gamified">🎯</span> <strong>Semi-Gamified</strong>
          </p>
          <p class="mt-8 text-lg">
            <strong>Habistat</strong> is a free, open-source, and privacy-focused companion for
            habit tracking and productivity. Built with lightweight <strong>Tauri</strong>, it
            offers a seamless experience across Web, Windows, and Android. Make self-improvement
            engaging with streaks, points, and a virtual garden that grows with your success.
          </p>
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
            class="btn-3d mt-8 self-center"
          >
            {#if $anonymousUserId}
              Dashboard
            {:else}
              Start Tracking Now
            {/if}
          </Button>
          <p class="text-muted-foreground/70 text-center text-xs italic">No sign-up required.</p>
        </div>
        <!-- Right: Illustration, only visible on md+ screens -->
        <div class="hidden h-full items-center justify-center md:flex">
          <!--
            The illustration is fixed in the right column and does not scroll with the text.
            It is hidden on small screens for better UX.
          -->
          <img
            src="/illustration-preview.png"
            alt="Habistat Preview Illustration"
            class="max-w-full"
          />
        </div>
      </div>
      <!--
        The rest of the about content is rendered in a single column below the grid.
        This includes Why Habistat, Features, Getting Started, etc.
      -->
      <Drawer.Header class="pt-0 text-left">
        <Drawer.Description>
          <div class="flex flex-col gap-2">
            <!-- Everything below is unchanged, but now in a single column -->
            <hr class="my-4" />

            <h2 class="text-xl font-semibold"><strong>Why Habistat?</strong></h2>
            <p>
              Tired of complex trackers or apps that don't respect your privacy? Habistat offers a
              refreshing alternative to tools like <strong>Everyday</strong>,
              <strong>Habitify</strong>, and <strong>Habitica</strong>. Built on the proven "Don't
              Break the Chain" principle, it reduces habit tracking to its purest form: a simple
              daily check-off.
            </p>
            <p>
              With each habit you complete, your personal streak advances, your virtual garden
              flourishes and you earn self-assigned points. This immediate, visual feedback sustains
              engagement, while the entirely self-regulated points system empowers you to determine
              how—and to what end—you reward yourself.
            </p>
            <p>
              Choose <strong>Habistat</strong> to reclaim control of your routine. Experience habit tracking
              as it was meant to be: straightforward, secure and inherently yours.
            </p>

            <hr class="my-4" />

            <h2 class="text-xl font-semibold">✨ <strong>Features</strong></h2>
            <ul class="list-inside list-disc space-y-1 text-sm">
              <li>
                <strong>Positive & Negative Habit Tracking:</strong> Mark daily "do" habits to build
                streaks or log "don't do" habits to curb unwanted behaviors, each action earns self-assigned
                points.
              </li>
              <li>
                <strong>Usage Dashboard & Progress Visualization:</strong> Review your app usage history,
                then watch your long-term journey unfold through intuitive charts and a GitHub-style
                activity grid.
              </li>
              <li>
                <strong>Custom Calendars & Gamification:</strong> Organize habits into color-coded calendars,
                earn points for completions and streaks, and nurture a virtual garden that reflects your
                consistency.
              </li>
              <li>
                <strong>Offline-First & Cloud Sync:</strong> All data lives locally and works without
                internet. Opt-in via email or social OAuth for real-time, cross-device synchronization.
              </li>
              <li>
                <strong>Data Portability:</strong> Export or import your full habit history at any time
                to back up, migrate, or restore progress seamlessly.
              </li>
              <li>
                <strong>Adaptive Interface:</strong> Enjoy automatic light/dark modes, multi-language
                support via i18n, and a clean, customizable UI built on SvelteKit, Tailwind CSS and shadcn-svelte.
              </li>
            </ul>

            <hr class="my-4" />

            <h2 class="text-xl font-semibold">🚀 <strong>Getting Started</strong></h2>
            <ol class="list-inside list-decimal space-y-2 text-sm">
              <li>
                <strong>Create Your First Calendar:</strong>
                <ul class="ml-4 list-inside list-disc space-y-1">
                  <li>Hit the <strong>"Add New Calendar"</strong> button.</li>
                  <li>
                    Name it (e.g., <strong>Fitness</strong>, <strong>Work Goals</strong>,
                    <strong>Mindfulness</strong>).
                  </li>
                  <li>Pick a color theme to make it your own.</li>
                </ul>
              </li>
              <li>
                <strong>Add Your Habits:</strong>
                <ul class="ml-4 list-inside list-disc space-y-1">
                  <li>Inside your calendar, click <strong>"Add New Habit"</strong>.</li>
                  <li>
                    <strong>Name it:</strong> e.g., <strong>Morning Exercise</strong>,
                    <strong>Read 30 Mins</strong>, <strong>No Social Media Before 8 PM</strong>.
                  </li>
                  <li>
                    <strong>Choose Mode:</strong>
                    <ul class="ml-4 list-inside list-disc">
                      <li><strong>Positive:</strong> For habits you want to build.</li>
                      <li><strong>Negative:</strong> For habits you want to break.</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Set Timer (Optional):</strong> For time-based goals (e.g.,
                    <code>15m</code>,
                    <code>1h</code>).
                  </li>
                  <li>
                    <strong>Assign Points:</strong> Gamify with points (e.g., <code>1</code>,
                    <code>5</code>,
                    <code>10</code>).
                  </li>
                </ul>
              </li>
              <li>
                <strong>Track, Monitor & Grow:</strong>
                <ul class="ml-4 list-inside list-disc space-y-1">
                  <li>Check off habits daily to build your streak.</li>
                  <li>Monitor app usage on your dashboard.</li>
                  <li>Watch your points and virtual garden flourish!</li>
                </ul>
              </li>
            </ol>

            <hr class="my-4" />

            <span class="text-muted-foreground mt-4 block text-xs">
              Need help? Visit the <a href="/help" class="hover:text-primary underline"
                >Help Center</a
              >.
            </span>
          </div>
        </Drawer.Description>
      </Drawer.Header>
    </div>
  </Drawer.Content>
</Drawer.Root>
