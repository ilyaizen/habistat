<script lang="ts">
  import { Menu, X, Award, ArrowUpRight, ArrowDownRight } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import Avatar from "$lib/components/avatar.svelte";
  // import SubscriptionBadge from "$lib/components/subscription-badge.svelte";
  // Use a single unified sync status component across the app
  // import SyncStatus from "$lib/components/sync-status.svelte";
  // import { _ } from "svelte-i18n";
  // Re-enable gamification UI using a compact badge in the header
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  // import { Skeleton } from "$lib/components/ui/skeleton";
  import { settings } from "$lib/stores/settings";
  import { gamification } from "$lib/stores/gamification";
  import NumberFlow from "$lib/vendor/number-flow/NumberFlow.svelte";

  let isMobileMenuOpen = $state(false);

  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  function closeMobileMenu() {
    isMobileMenuOpen = false;
  }

  function handleNavigation(path: string) {
    closeMobileMenu();
    goto(path);
  }
</script>

<!--
  Habistat App Header
  All navigation links in this header must correspond to actual routes in
  src/routes.
  This ensures navigation does not break and is easy to maintain.
  The 'Dev' navigation item is for developer tools and diagnostics, only visible to all users for now.
  -->

<header class="border-border/40 relative border-b">
  <div class="container mx-auto flex h-16 justify-between px-4 rtl:flex-row-reverse">
    <div class="flex items-center md:hidden">
      <Button variant="ghost" size="sm" class="h-9 w-9 px-0" onclick={toggleMobileMenu}>
        {#if isMobileMenuOpen}
          <X class="h-4 w-4" />
        {:else}
          <Menu class="h-4 w-4" />
        {/if}
        <span class="sr-only">Toggle menu</span>
      </Button>
    </div>

    <!-- Logo on the left -->
    <div class="hidden items-center md:flex rtl:mr-0 rtl:ml-4">
      <a href="/" class="nunito-header flex items-center space-x-2 rtl:space-x-reverse">
        <img src="/logo.svg" alt="Habistat Logo" class="h-6 w-6" />
        <span class="hidden font-bold sm:inline-block">Habistat</span>
      </a>
    </div>

    <!-- Navigation in the center, absolutely centered -->
    <nav
      class="absolute top-0 left-1/2 hidden h-full -translate-x-1/2 items-center justify-center md:flex"
    >
      <div class="nunito-header flex items-center gap-6 text-sm">
        <a
          href="/dashboard"
          class="text-muted-foreground hover:text-foreground transition-colors"
          class:font-medium={page.url.pathname.includes("/dashboard")}
        >
          Habits
        </a>
        <!-- Temporary link to the new hybrid dashboard page -->
        <!-- <a
          href="/dashboard-new"
          class="text-muted-foreground hover:text-foreground transition-colors"
          class:font-medium={page.url.pathname.includes("/dashboard-new")}
        >
          New
        </a> -->
        <!-- Stats navigation item for user statistics and analytics -->
        <!-- <a
          href="/stats"
          class="text-muted-foreground hover:text-foreground transition-colors"
          class:font-medium={page.url.pathname.includes("/stats")}
        >
          Stats
        </a> -->
        <!-- <a
          href="/premium"
          class="text-muted-foreground hover:text-foreground transition-colors"
          class:font-medium={page.url.pathname.includes("/premium")}
        >
          Upgrade
        </a> -->
        <a
          href="/settings"
          class="text-muted-foreground hover:text-foreground transition-colors"
          class:font-medium={page.url.pathname.includes("/settings")}
        >
          Settings
        </a>

        <!-- Dev navigation item for developers -->
        {#if $settings.developerMode}
          <!-- <a
            href="/dev"
            class="text-muted-foreground hover:text-foreground transition-colors"
            class:font-medium={page.url.pathname.includes("/dev")}
          >
            Dev
          </a> -->
        {/if}
      </div>
    </nav>

    <div class="flex items-center justify-end space-x-2 rtl:space-x-reverse">
      <!-- <SyncStatus variant="minimal" showText={false} /> -->
      <!-- <SubscriptionBadge /> -->
      <!--
        Gamification badge is always rendered so NumberFlow mounts with 0 and
        animates to the computed value when the store updates post-mount.
        We only soften the visuals while loading to avoid layout shifts.
      -->
      <Badge
        variant="outline"
        class={`bg-background hidden items-center gap-1 rounded-full px-2 py-0.5 md:inline-flex ${$gamification.loading ? "opacity-70" : ""}`}
        aria-busy={$gamification.loading}
        title="Your total points"
      >
        <Award class="text-primary h-3 w-3" />
        <span class="tabular-nums">
          <!--
            Explicit 'animated' and 'willChange' ensure smooth transitions.
            Rendering during loading (value is 0) guarantees a 0 → N change
            after mount, which triggers the animation.
          -->
          <NumberFlow
            value={$gamification.totalPoints}
            animated={true}
            willChange={true}
            respectMotionPreference={true}
          />
        </span>
        <!-- {#if $gamification.weeklyPointsDelta !== 0}
          <span class="ml-1 inline-flex items-center text-[10px] font-medium">
            {#if $gamification.weeklyPointsDelta > 0}
              <ArrowUpRight class="h-3 w-3 text-emerald-600" />
              <span class="text-emerald-700 tabular-nums dark:text-emerald-400"
                >{Math.abs($gamification.weeklyPointsDelta)}</span
              >
            {:else}
              <ArrowDownRight class="h-3 w-3 text-rose-600" />
              <span class="text-rose-700 tabular-nums dark:text-rose-400"
                >{Math.abs($gamification.weeklyPointsDelta)}</span
              >
            {/if}
          </span>
        {/if} -->
      </Badge>
      <Avatar />
    </div>
  </div>

  {#if isMobileMenuOpen}
    <div class="md:hidden">
      <div class="flex flex-col space-y-4 p-4">
        <button
          class="text-muted-foreground hover:text-foreground text-left font-medium"
          onclick={() => handleNavigation("/")}
        >
          Home
        </button>
        <button
          class="text-muted-foreground hover:text-foreground text-left font-medium"
          onclick={() => handleNavigation("/dashboard")}
        >
          Habits
        </button>
        <!-- Temporary mobile link to the new hybrid dashboard page -->
        <button
          class="text-muted-foreground hover:text-foreground text-left font-medium"
          onclick={() => handleNavigation("/dashboard-new")}
        >
          New
        </button>
        <!-- Stats navigation item for user statistics and analytics -->
        <!-- <button
          class="text-muted-foreground hover:text-foreground text-left font-medium"
          onclick={() => handleNavigation("/stats")}
        >
          Stats
        </button> -->
        <!-- <button
          class="text-muted-foreground hover:text-foreground text-left font-medium"
          onclick={() => handleNavigation("/premium")}
        >
          Upgrade
        </button> -->
        <button
          class="text-muted-foreground hover:text-foreground text-left font-medium"
          onclick={() => handleNavigation("/settings")}
        >
          Settings
        </button>
        {#if $settings.developerMode}
          <!-- <button
            class="text-muted-foreground hover:text-foreground text-left font-medium"
            onclick={() => handleNavigation("/dev")}
          >
            Dev
          </button> -->
        {/if}
      </div>
    </div>
  {/if}
</header>
