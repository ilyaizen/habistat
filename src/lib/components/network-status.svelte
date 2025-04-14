<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Badge } from "./ui/badge";
  import { Wifi, WifiOff } from "lucide-svelte"; // Icons for online/offline

  let isOnline = $state(navigator.onLine); // Initial state

  const updateOnlineStatus = () => {
    isOnline = navigator.onLine;
  };

  onMount(() => {
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Initial check in case the event listeners don't fire immediately
    updateOnlineStatus();
  });

  onDestroy(() => {
    window.removeEventListener("online", updateOnlineStatus);
    window.removeEventListener("offline", updateOnlineStatus);
  });
</script>

{#if isOnline}
  <Badge variant="secondary" class="flex items-center space-x-1">
    <Wifi class="h-3 w-3 text-green-600" />
    <span>Online</span>
  </Badge>
{:else}
  <Badge variant="destructive" class="flex items-center space-x-1">
    <WifiOff class="h-3 w-3" />
    <span>Offline</span>
  </Badge>
{/if}

<style>
  /* Add styles if needed, e.g., fixed positioning if placed globally */
</style>
