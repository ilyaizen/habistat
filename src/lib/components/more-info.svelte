<script lang="ts">
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import { X, CheckSquare, Globe, RefreshCw, Target } from "lucide-svelte";
  import { anonymousUserId } from "$lib/utils/tracking";
  import { goto } from "$app/navigation";
  import { Card, CardContent } from "$lib/components/ui/card";

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
        Start Tracking Now
      {/if}
    </Button>
    <p class="text-muted-foreground/80 text-xs italic">No sign-up required.</p>
  </div>

  <!-- Single Column Content Area: Detailed information about Habistat -->
  <Card class="mx-auto w-full max-w-3xl p-4 text-lg sm:p-8 md:p-16">
    <CardContent class="space-y-8">
      <!--
        Content is centered and width-constrained for readability on large screens, full width on mobile.
      -->
      <!-- Why Habistat Section -->
      <div>
        <h2 class="mb-8 text-center text-3xl font-semibold">
          <span role="img" aria-label="Shrine">⛩️</span> Why Habistat?
        </h2>
        <p class="mb-2 leading-relaxed">
          Tired of bloated apps and shaky privacy policies? Habistat keeps it simple. Inspired by
          "Don't Break the Chain," it turns habit tracking into a daily checkmark ritual. Each
          completed habit advances your streak, grows a virtual plant, and earns points.
        </p>
      </div>

      <!-- Section Divider -->
      <hr class="border-border" />

      <!-- Features Section -->
      <div>
        <h2 class="te mb-8 text-center text-3xl font-semibold">
          <span role="img" aria-label="Sparkles">✨</span> Features
        </h2>
        <ul class="list-outside list-disc space-y-2 leading-relaxed">
          <li>
            <strong>✅ Positive & 🚫 Negative Habits:</strong>
            <br />
            Keep track of what to do and what to avoid. Earn points for fun and remember, your progress
            is ultimately judged by you.
          </li>
          <li>
            <strong>📊 Dashboard & 🎉 Visuals:</strong>
            <br />
            View your trends and progress with sleek charts and a GitHub-style activity grid.
          </li>
          <li>
            <strong>📅 Custom Calendars & 🏆 Gamification:</strong>
            <br />
            Group habits by themes, earn rewards, and grow your virtual garden.
          </li>
          <li>
            <strong>🛜 Offline-First with 🔄 Optional Sync:</strong>
            <br />
            Fully functional offline and sync across devices only if you choose.
          </li>
          <li>
            <strong>🔒 Full Data Portability:</strong>
            <br />
            Easily import or export your habit history anytime, no restrictions.
          </li>
          <li>
            <strong>📱 Clean, Adaptive UI:</strong>
            <br />
            Enjoy light/dark modes, multilingual support, and a stylish design built with SvelteKit,
            Tailwind CSS, and shadcn-svelte.
          </li>
        </ul>
      </div>

      <!-- Section Divider -->
      <hr class="border-border" />

      <!-- Getting Started Section -->
      <div>
        <h2 class="te mb-8 text-center text-3xl font-semibold">
          <span role="img" aria-label="Rocket">🚀</span> Getting Started
        </h2>
        <ol class="list-inside list-decimal space-y-2 leading-relaxed">
          <li>
            <strong>Create a Calendar:</strong> Name it (e.g., <em>Hobbies</em>,
            <em>Fitness</em>,
            <em>Unhealthy</em>) and pick a color.
          </li>
          <li>
            <strong>Add Habits:</strong> Label them, choose positive or negative, set timers (optional),
            and assign point values.
          </li>
          <li>
            <strong>Track & Grow:</strong> Check off daily. Watch your streaks, points, and garden grow.
            Preferably in that order.
          </li>
        </ol>
      </div>

      <!-- Section Divider -->
      <hr class="border-border" />

      <!-- Tech Stack Section -->
      <div>
        <h2 class="te mb-8 text-center text-3xl font-semibold">
          <span role="img" aria-label="Tools">🛠️</span> Tech Stack
        </h2>
        <p class="mb-3 leading-relaxed">
          Habistat is built with a modern and robust technology stack:
        </p>
        <ul class="list-inside list-disc space-y-1 leading-relaxed">
          <li>
            <strong>Core Framework:</strong>
            <a
              href="https://v2.tauri.app/"
              target="_blank"
              rel="noopener"
              class="text-primary font-bold hover:underline">Tauri v2</a
            > (Rust backend, web frontend)
          </li>
          <li>
            <strong>Frontend:</strong>
            <a
              href="https://svelte.dev/"
              target="_blank"
              rel="noopener"
              class="text-primary font-bold hover:underline">SvelteKit</a
            >
          </li>
          <li>
            <strong>Styling:</strong>
            <a
              href="https://tailwindcss.com/"
              target="_blank"
              rel="noopener"
              class="text-primary font-bold hover:underline">Tailwind CSS v4</a
            >
          </li>
          <li>
            <strong>UI Components:</strong>
            <a
              href="https://next.shadcn-svelte.com/"
              target="_blank"
              rel="noopener"
              class="text-primary font-bold hover:underline">shadcn-svelte</a
            >
          </li>
          <li>
            <strong>Local Database:</strong>
            <a
              href="https://www.sqlite.org/"
              target="_blank"
              rel="noopener"
              class="text-primary font-bold hover:underline">SQLite</a
            >
            via
            <a
              href="https://orm.drizzle.team/"
              target="_blank"
              rel="noopener"
              class="text-primary font-bold hover:underline">Drizzle ORM</a
            >
          </li>
          <li>
            <strong>Cloud Sync & Backend:</strong>
            <a
              href="https://convex.dev/"
              target="_blank"
              rel="noopener"
              class="text-primary font-bold hover:underline">Convex</a
            >
          </li>
          <li>
            <strong>Authentication:</strong>
            <a
              href="https://clerk.com/"
              target="_blank"
              rel="noopener"
              class="text-primary font-bold hover:underline">Clerk</a
            >
            (OAuth with Google, etc.) via
            <a
              href="https://svelte-clerk.netlify.app"
              target="_blank"
              rel="noopener"
              class="text-primary font-bold hover:underline">svelte-clerk</a
            >
          </li>
          <li>
            <strong>Internationalization:</strong>
            <a
              href="https://github.com/kaisermann/svelte-i18n"
              target="_blank"
              rel="noopener"
              class="text-primary font-bold hover:underline">svelte-i18n</a
            >
          </li>
          <li>
            <strong>Utilities:</strong>
            <ul class="ml-4 list-inside list-disc space-y-1">
              <li>
                <a
                  href="https://github.com/uuidjs/uuid"
                  target="_blank"
                  rel="noopener"
                  class="text-primary font-bold hover:underline">uuid</a
                > (Unique Identifiers)
              </li>
              <li>
                <a
                  href="https://date-fns.org/"
                  target="_blank"
                  rel="noopener"
                  class="text-primary font-bold hover:underline">date-fns</a
                > (Date Manipulation and Formatting)
              </li>
            </ul>
          </li>
          <li>
            <strong>Package Manager:</strong>
            <a
              href="https://pnpm.io/"
              target="_blank"
              rel="noopener"
              class="text-primary font-bold hover:underline">pnpm</a
            >
          </li>
        </ul>
      </div>

      <!-- Section Divider -->
      <hr class="border-border" />

      <!-- Closing Remark -->
      <p class="text-muted-foreground pb-8 text-center text-sm">
        Happy tracking! <span role="img" aria-label="Smiling face with sunglasses">😎</span>
      </p>
    </CardContent>
  </Card>
</div>

<style>
  a {
    text-decoration: underline !important;
  }
</style>
