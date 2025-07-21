<script lang="ts">
import type { UserResource } from "@clerk/types";
// TODO: 2025-07-22 - Add this back in when we have a way to handle it
// import { isOnline } from "$lib/stores/network";
import { getContext } from "svelte";
import type { Readable } from "svelte/store";
import { Badge } from "$lib/components/ui/badge";

// Props for controlling sync indicator behavior
let {
  isSyncing = false
  // showOfflineOnly = false
}: {
  isSyncing?: boolean;
  // showOfflineOnly?: boolean;
} = $props();

// Get user from context (if available)
const clerkUserStore = getContext<Readable<UserResource | null> | undefined>("clerkUser");

// Derive sync status from network and user state
const syncStatus = $derived.by(() => {
  // If user context not available or user not authenticated, check if we should show offline
  if (!clerkUserStore || !$clerkUserStore) {
    // if (showOfflineOnly && !$isOnline) return "offline";
    return null; // Don't show anything for anonymous users
  }

  // If explicitly syncing, show that regardless of network
  if (isSyncing) return "syncing";

  // Network-based status for authenticated users
  // if (!$isOnline) return "offline";

  return "synced";
});

const syncConfig = $derived.by(() => {
  switch (syncStatus) {
    // case "offline":
    //   return {
    //     text: "Offline",
    //     variant: "secondary" as const,
    //     pulse: false
    //   };
    case "syncing":
      return {
        text: "Syncing",
        variant: "default" as const,
        pulse: true
      };
    case "synced":
      return {
        text: "Synced",
        variant: "secondary" as const,
        pulse: false
      };
    default:
      return null;
  }
});
</script>

{#if syncConfig}
  <Badge variant={syncConfig.variant} class={syncConfig.pulse ? "animate-pulse" : ""}>
    {syncConfig.text}
  </Badge>
{/if}
