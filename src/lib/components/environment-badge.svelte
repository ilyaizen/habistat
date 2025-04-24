<!--
  Environment Badge Component
  Displays the current environment (Browser/Windows/Android/etc) as a small badge
  Used on the front page as a floating badge to indicate where the app is running
-->
<script lang="ts">
  import { getPlatformName } from "$lib/utils/environment";
  import { Badge } from "$lib/components/ui/badge";
  import { onMount } from "svelte";
  import { Monitor, Globe, Server, Smartphone } from "lucide-svelte";
  import type { ComponentType } from "svelte";

  // State to hold the platform name and icon
  let platformName = $state("Loading...");
  let icon = $state<ComponentType>(Globe);

  // Only run platform detection on mount to avoid SSR issues
  onMount(async () => {
    platformName = await getPlatformName();
  });

  // Update icon when platform changes
  $effect(() => {
    switch (platformName) {
      case "Windows":
      case "macOS":
      case "Linux":
      case "Desktop":
        icon = Monitor;
        break;
      case "Android":
      case "iOS":
        icon = Smartphone;
        break;
      case "Server":
        icon = Server;
        break;
      default:
        icon = Globe;
    }
  });
</script>

<Badge variant="outline" class="flex h-5 items-center gap-1 py-0 text-xs font-normal">
  <!-- TODO: 2025-04-24 - Remove this once SvelteKit (5?) is understood -->
  <!-- svelte-ignore svelte_component_deprecated -->
  <svelte:component this={icon} class="h-3 w-3" />
  {platformName}
</Badge>
