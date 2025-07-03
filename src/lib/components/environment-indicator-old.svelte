<script lang="ts">
  import { isOnline } from "$lib/stores/network";
  import { platform } from "$lib/stores/platform"; // Use the new platform store
  import { Badge } from "$lib/components/ui/badge";
  import { Wifi, WifiOff, Globe, MonitorSmartphone } from "@lucide/svelte"; // Icons
  // import { onMount } from "svelte";
  // import { getContext } from "svelte";
  // import type { Writable } from "svelte/store";

  // Context for online status and auth mode
  // const isOnline = getContext<Writable<boolean>>("isOnline");
</script>

<Badge
  variant={$isOnline ? "secondary" : "destructive"}
  class="flex items-center space-x-1.5 text-xs"
>
  {#if $isOnline}
    <Wifi class="h-3 w-3 text-green-600" />
    <span>Online</span>
  {:else}
    <WifiOff class="h-3 w-3" />
    <span>Offline</span>
  {/if}
  <span class="text-muted-foreground">/</span>
  {#if ["windows", "linux", "macos", "ios", "android"].includes($platform.toLowerCase())}
    <MonitorSmartphone class="h-3 w-3" />
  {:else}
    <Globe class="h-3 w-3" />
  {/if}
  <span>{$platform}</span>
</Badge>
