<script lang="ts">
  import { Menu, X } from "@lucide/svelte";
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
  import { goto } from "$app/navigation";
  import { _ } from "svelte-i18n";
  import { Badge } from "$lib/components/ui/badge";
  import { gamification } from "$lib/stores/gamification";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { settings } from "$lib/stores/settings";

  import Avatar from "./avatar.svelte";

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
        <!-- Stats navigation item for user statistics and analytics -->
        <a
          href="/stats"
          class="text-muted-foreground hover:text-foreground transition-colors"
          class:font-medium={page.url.pathname.includes("/stats")}
        >
          Stats
        </a>

        <a
          href="/settings"
          class="text-muted-foreground hover:text-foreground transition-colors"
          class:font-medium={page.url.pathname.includes("/settings")}
        >
          Settings
        </a>
        <!-- Dev navigation item for developers -->
        {#if $settings.developerMode}
          <a
            href="/dev"
            class="text-muted-foreground hover:text-foreground transition-colors"
            class:font-medium={page.url.pathname.includes("/dev")}
          >
            Dev
          </a>
        {/if}
      </div>
    </nav>

    <div class="flex items-center justify-end space-x-2 rtl:space-x-reverse">
      {#if $gamification.loading}
        <div class="flex items-center gap-2">
          <Skeleton class="h-6 w-16 rounded-md" />
          <Skeleton class="h-6 w-16 rounded-md" />
        </div>
      {:else}
        <!-- <Badge variant="outline" class="hidden sm:flex">
          Total: {$gamification.totalPoints}
        </Badge> -->
        <Badge
          variant={$gamification.weeklyPointsDelta >= 0 ? "default" : "destructive"}
          class="hidden sm:flex"
        >
          XP {$gamification.weeklyPointsDelta >= 0 ? "+" : ""}{$gamification.weeklyPointsDelta}
        </Badge>
      {/if}
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
        <!-- Stats navigation item for user statistics and analytics -->
        <button
          class="text-muted-foreground hover:text-foreground text-left font-medium transition-colors"
          onclick={() => handleNavigation("/stats")}
        >
          Stats
        </button>
        {#if $settings.developerMode}
          <button
            class="text-muted-foreground hover:text-foreground text-left font-medium"
            onclick={() => handleNavigation("/dev")}
          >
            Dev
          </button>
        {/if}
        <!-- <button
          class="text-muted-foreground hover:text-foreground text-left font-medium"
          onclick={() => handleNavigation("/premium")}
        >
          Premium
        </button> -->
      </div>
    </div>
  {/if}
</header>
