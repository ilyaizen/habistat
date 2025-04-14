<script lang="ts">
  import { Menu, X } from "lucide-svelte";
  import { page } from "$app/stores";
  import { getContext, onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { type Writable } from "svelte/store";
  // import { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut } from "svelte-clerk";
  import { goto } from "$app/navigation";
  import { _ } from "svelte-i18n";
  import { writable } from "svelte/store";
  import { browser } from "$app/environment";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { locale } from "svelte-i18n";
  import AvatarDropdown from "./avatar-dropdown.svelte";

  let isMobileMenuOpen = false;
  let anonymousUserId: string | null = null;

  // Get auth mode from context
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

<header class="border-border/40 border-b relative">
  <div class="container mx-auto flex h-10 justify-between px-4 rtl:flex-row-reverse">
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
      <a href="/" class="flex items-center space-x-2 rtl:space-x-reverse">
        <img src="/logo.png" alt="Habistat Logo" class="h-6 w-6" />
        <span class="hidden font-bold sm:inline-block">Habistat</span>
      </a>
    </div>

    <!-- Navigation in the center, absolutely centered -->
    <nav class="hidden md:flex absolute left-1/2 top-0 h-full items-center justify-center -translate-x-1/2">
      <div class="flex items-center gap-6 text-sm">
        <a
          href="/dashboard"
          class="text-muted-foreground hover:text-foreground transition-colors"
          class:font-medium={$page.url.pathname.includes("/dashboard")}
        >
          Dashboard
        </a>
        <a
          href="/settings"
          class="text-muted-foreground hover:text-foreground transition-colors"
          class:font-medium={$page.url.pathname.includes("/settings")}
        >
          Settings
        </a>
      </div>
    </nav>

    <div class="flex items-center justify-end space-x-2 rtl:space-x-reverse">
      <AvatarDropdown />

      <!-- <div class="flex items-center gap-4">
        {#if $authMode === "online"}
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost">Sign in</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button variant="default">Sign up</Button>
            </SignUpButton>
          </SignedOut>
        {/if}
      </div> -->
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
        {#if $authMode === "online"}
          <!-- <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <div class="flex flex-col gap-2">
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm" class="w-full">Sign in</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="default" size="sm" class="w-full">Sign up</Button>
              </SignUpButton>
            </div>
          </SignedOut> -->
        {/if}
      </div>
    </div>
  {/if}
</header>
