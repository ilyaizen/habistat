<script lang="ts">
  // Main app tab bar for navigation between Dashboard, Calendars, and Settings
  // Uses SvelteKit's goto for navigation and $page.url for active tab detection
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { Home, Calendar, Settings as SettingsIcon } from "lucide-svelte";

  // Tab definitions: route, label, icon
  const tabs = [
    { route: "/dashboard", label: "Dashboard", icon: Home },
    { route: "/calendars", label: "Calendars", icon: Calendar },
    { route: "/settings", label: "Settings", icon: SettingsIcon }
  ];

  // Helper to check if a tab is active
  function isActive(route: string) {
    return $page.url.pathname.startsWith(route);
  }
</script>

<!--
  App Tab Bar: persistent navigation for main app sections
  - Mobile-first: fixed bottom, full width
  - Highlights active tab
  - Uses lucide icons and labels
-->
<nav
  class="border-border bg-background fixed right-0 bottom-0 left-0 z-40 flex h-16 w-full items-center justify-around border-t shadow-md md:static md:h-auto md:justify-center md:shadow-none"
>
  {#each tabs as { route, label, icon: Icon }}
    <button
      class="focus-visible:ring-ring flex flex-col items-center justify-center gap-1 px-4 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 md:flex-row md:gap-2 md:text-base"
      class:bg-primary={isActive(route)}
      class:text-primary-foreground={isActive(route)}
      class:text-muted-foreground={!isActive(route)}
      onclick={() => goto(route)}
      aria-current={isActive(route) ? "page" : undefined}
    >
      <Icon class="h-6 w-6" />
      <span>{label}</span>
    </button>
  {/each}
</nav>

<!--
  Comments:
  - This tab bar is mobile-first (fixed bottom), but adapts for desktop.
  - Highlights the active tab using Tailwind and shadcn-svelte conventions.
  - Uses lucide-svelte icons for clarity.
  - Navigation is handled via SvelteKit's goto.
-->
