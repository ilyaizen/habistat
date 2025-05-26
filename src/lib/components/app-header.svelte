<script lang="ts">
  import { Menu, X } from "lucide-svelte";
  import { page } from "$app/stores";
  import { getContext, onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { type Writable, type Readable } from "svelte/store";
  import { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut } from "svelte-clerk";
  import { goto } from "$app/navigation";
  import { _ } from "svelte-i18n";
  import type { UserResource } from "@clerk/types";

  import AvatarDropdown from "./avatar-dropdown-old.svelte";
  import ThemeToggle from "./theme-toggle.svelte";
  let isMobileMenuOpen = false;

  // Get Clerk user state from context
  const user = getContext<Readable<UserResource | null>>("clerk-user");

  // Get auth mode from context (still useful for offline indication)
  const authMode = getContext<Writable<"offline" | "online">>("authMode");

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
          class:font-medium={$page.url.pathname.includes("/dashboard")}
        >
          Dashboard
        </a>

        <!-- Calendars navigation item for calendar management -->
        <!-- <a
          href="/calendars"
          class="text-muted-foreground hover:text-foreground transition-colors"
          class:font-medium={$page.url.pathname.includes("/calendars")}
        >
          Calendars
        </a> -->
        <!-- Stats navigation item for user statistics and analytics -->
        <a
          href="/stats"
          class="text-muted-foreground hover:text-foreground transition-colors"
          class:font-medium={$page.url.pathname.includes("/stats")}
        >
          Stats
        </a>
        <a
          href="/pricing"
          class="text-muted-foreground hover:text-foreground transition-colors"
          class:font-medium={$page.url.pathname.includes("/pricing")}
        >
          Pricing
        </a>
        <!-- <a
          href="/settings"
          class="text-muted-foreground hover:text-foreground transition-colors"
          class:font-medium={$page.url.pathname.includes("/settings")}
        >
          Settings
        </a> -->
        <!-- Dev navigation item for developers -->
        <!-- <a
          href="/dev"
          class="text-muted-foreground hover:text-foreground transition-colors"
          class:font-medium={$page.url.pathname.includes("/dev")}
        >
          Dev
        </a> -->
      </div>
    </nav>

    <div class="flex items-center justify-end space-x-2 rtl:space-x-reverse">
      <ThemeToggle />
      <AvatarDropdown />
    </div>
  </div>

  {#if isMobileMenuOpen}
    <div class="md:hidden">
      <div class="flex flex-col space-y-4 p-4">
        <button
          class="text-muted-foreground hover:text-foreground text-left font-medium"
          on:click={() => handleNavigation("/dashboard")}
        >
          Dashboard
        </button>
        <button
          class="text-muted-foreground hover:text-foreground text-left font-medium transition-colors"
          on:click={() => handleNavigation("/settings")}
        >
          Settings
        </button>
        <!-- Dev navigation item for developers -->
        <button
          class="text-muted-foreground hover:text-foreground text-left font-medium transition-colors"
          on:click={() => handleNavigation("/dev")}
        >
          Dev
        </button>
        <!-- Calendars navigation item for calendar management -->
        <button
          class="text-muted-foreground hover:text-foreground text-left font-medium transition-colors"
          on:click={() => handleNavigation("/calendars")}
        >
          Calendars
        </button>
        <!-- Stats navigation item for user statistics and analytics -->
        <button
          class="text-muted-foreground hover:text-foreground text-left font-medium transition-colors"
          on:click={() => handleNavigation("/stats")}
        >
          Stats
        </button>
      </div>
    </div>
  {/if}
</header>
