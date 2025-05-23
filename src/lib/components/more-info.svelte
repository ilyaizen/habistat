<script lang="ts">
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import { X } from "lucide-svelte";
  import { anonymousUserId } from "$lib/utils/tracking";
  import { goto } from "$app/navigation";
  import { Card, CardContent } from "$lib/components/ui/card";

  // Props passed from parent (about-drawer)
  // open: Controls the visibility of the drawer
  export let open = false;
  // handleStart: Function to execute when the "Start Tracking Now" button is clicked
  export let handleStart: () => void;
  // showMoreInfoButton: Prop to control visibility of a button (currently unused in this snippet, might be for parent)
  export let showMoreInfoButton = false; // Kept for compatibility, though not directly used in the new layout
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
  <div class="grid grid-cols-1 items-start gap-8 md:grid-cols-2 md:gap-12">
    <!--
      Responsive grid: single column on mobile, two columns on md+ screens. Increased gap for better separation.
    -->
    <div class="flex flex-col items-start justify-center space-y-4">
      <div class="flex items-center gap-4">
        <img src="/logo.png" alt="Habistat Logo" class="h-10 w-10 sm:h-12 sm:w-12" />
        <!--
          Logo scales down on mobile for better fit.
        -->
        <h1 class="text-2xl font-bold sm:text-3xl md:text-4xl">Habistat</h1>
        <!--
          Responsive heading size for logo.
        -->
      </div>
      <p class="mb-8 text-xs sm:mb-16">
        <!--
          Reduced bottom margin on mobile to save space.
        -->
        <span role="img" aria-label="Open-Source">🌐</span>
        <strong>Open-Source</strong> <span class="text-muted-foreground/20">|</span>
        <span role="img" aria-label="Cross-Platform">🔄</span>
        <strong>Cross-Platform</strong>
        <span class="text-muted-foreground/20">|</span>
        <span role="img" aria-label="Semi-Gamified">🎯</span>
        <strong>Semi-Gamified</strong>
      </p>
      <p class="text-base sm:text-lg">
        <!--
          Responsive font size for intro text.
        -->
        <strong>Habistat</strong> is a free, open-source habit tracker focused on privacy and simplicity.
        It helps you build good habits, break bad ones, and track daily activity, with your data fully
        under your control. Features include time-based habit tracking and optional gamification: streaks,
        points, and a virtual garden that grows – ideally, like you. 🌱
      </p>
      <p class="text-base sm:text-lg">
        An alternative to
        <a
          href="https://everyday.app/"
          target="_blank"
          rel="noopener"
          class="text-primary font-bold hover:underline">Everyday</a
        >,
        <a
          href="https://www.habitify.me/"
          target="_blank"
          rel="noopener"
          class="text-primary font-bold hover:underline">Habitify</a
        >, and
        <a
          href="https://habitica.com/"
          target="_blank"
          rel="noopener"
          class="text-primary font-bold hover:underline">Habitica</a
        >, it is built with the lightweight
        <a
          href="https://v2.tauri.app/"
          target="_blank"
          rel="noopener"
          class="text-primary font-bold hover:underline">Tauri</a
        >
        framework and runs smoothly on Android, iOS, Windows, macOS, and in any modern browser.
      </p>
    </div>

    <!-- Right Column: Main marketing tagline -->
    <div
      class="mt-8 flex h-full flex-col items-center justify-center text-center md:mt-0 md:items-end md:text-right"
    >
      <!--
        On mobile, tagline is centered and spaced below intro. On md+, aligns right and vertically centered.
      -->
      <blockquote class="border-border mt-0 border-l-2 pl-4 italic md:mt-0 md:pl-6">
        <h2 class="text-primary text-2xl leading-snug font-semibold sm:text-3xl md:text-4xl">
          Build Habits,<br />track progress,<br />achieve goals.
        </h2>
      </blockquote>
    </div>
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
  <Card class="mx-auto w-full max-w-3xl">
    <CardContent class="space-y-8">
      <!--
        Content is centered and width-constrained for readability on large screens, full width on mobile.
      -->
      <!-- Why Habistat Section -->
      <div>
        <h2 class="mb-3 text-2xl font-semibold">
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
        <h2 class="mb-3 text-2xl font-semibold">
          <span role="img" aria-label="Sparkles">✨</span> Features
        </h2>
        <ul class="list-inside space-y-2 leading-relaxed">
          <li>
            <strong>✅ Positive & 🚫 Negative Habits</strong>: Keep track of what to do and what to
            avoid. Earn points for fun and remember, your progress is ultimately judged by you.
          </li>
          <li>
            <strong>📊 Dashboard & 🎉 Visuals</strong>: View your trends and progress with sleek
            charts and a GitHub-style activity grid.
          </li>
          <li>
            <strong>📅 Custom Calendars & 🏆 Gamification</strong>: Group habits by themes, earn
            rewards, and grow your virtual garden.
          </li>
          <li>
            <strong>🛜 Offline-First with 🔄 Optional Sync</strong>: Fully functional offline and
            sync across devices only if you choose.
          </li>
          <li>
            <strong>🔒 Full Data Portability</strong>: Easily import or export your habit history
            anytime, no restrictions.
          </li>
          <li>
            <strong>📱 Clean, Adaptive UI</strong>: Enjoy light/dark modes, multilingual support,
            and a stylish design built with SvelteKit, Tailwind CSS, and shadcn-svelte.
          </li>
        </ul>
      </div>

      <!-- Section Divider -->
      <hr class="border-border" />

      <!-- Getting Started Section -->
      <div>
        <h2 class="mb-3 text-2xl font-semibold">
          <span role="img" aria-label="Rocket">🚀</span> Getting Started
        </h2>
        <ol class="list-inside list-decimal space-y-2 leading-relaxed">
          <li>
            <strong>Create a Calendar:</strong> Name it (e.g., <em>Hobbies</em>, <em>Fitness</em>,
            <em>Negative</em>) and pick a color.
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

      <!-- Roadmap Section -->
      <div>
        <h2 class="mb-3 text-2xl font-semibold">
          <span role="img" aria-label="Map">🗺️</span> Roadmap (Future Ideas)
        </h2>
        <ul class="list-inside list-disc space-y-1 leading-relaxed">
          <li>[ ] More gamification elements (badges, leaderboards for friends).</li>
          <li>[ ] Public API for integrations.</li>
          <li>[ ] More themes and customization options.</li>
          <li>[ ] Health app integrations</li>
          <li>[ ] ... and much more! Feel free to suggest features!</li>
        </ul>
      </div>

      <!-- Section Divider -->
      <hr class="border-border" />

      <!-- Tech Stack Section -->
      <div>
        <h2 class="mb-3 text-2xl font-semibold">
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

      <!-- Useful Links Section -->
      <div>
        <h2 class="mb-3 text-2xl font-semibold">
          <span role="img" aria-label="Chain link">🔗</span> Useful Links
        </h2>
        <ul class="list-inside list-disc space-y-1 leading-relaxed">
          <li>
            <strong>Website:</strong>
            <a
              href="https://habistat.vercel.app"
              target="_blank"
              rel="noopener"
              class="text-primary font-bold hover:underline">https://habistat.vercel.app</a
            >
          </li>
          <li>
            <strong>Creator:</strong>
            <a
              href="https://github.com/ilyaizen"
              target="_blank"
              rel="noopener"
              class="text-primary font-bold hover:underline">Ilya Aizenberg</a
            >
          </li>
          <li>
            <strong>Issue Tracker:</strong>
            <a
              href="https://github.com/ilyaizen/habistat/issues"
              target="_blank"
              rel="noopener"
              class="text-primary font-bold hover:underline"
              >https://github.com/ilyaizen/habistat/issues</a
            >
          </li>
        </ul>
      </div>

      <!-- Section Divider -->
      <hr class="border-border" />

      <!-- License Section -->
      <div>
        <h2 class="mb-3 text-2xl font-semibold">
          <span role="img" aria-label="Scroll">📜</span> License
        </h2>
        <p class="leading-relaxed">
          This project is licensed under the <strong>MIT License</strong>. See the
          <a
            href="LICENSE"
            target="_blank"
            rel="noopener"
            class="text-primary font-bold hover:underline">LICENSE</a
          >
          file for details.
        </p>
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
