<!--
  Sync Status Component
  Shows current sync status with visual indicators
-->
<script lang="ts">
import type { UserResource } from "@clerk/types";
import { AlertCircle, Cloud, CloudOff, RefreshCw, Wifi, WifiOff } from "@lucide/svelte";
import { getContext, onDestroy } from "svelte";
import type { Readable } from "svelte/store";
import { browser } from "$app/environment";
import { Badge } from "$lib/components/ui/badge";
import { Button } from "$lib/components/ui/button";
import { isSyncing, lastSyncTime, syncError, syncIsOnline, syncStore } from "$lib/stores/sync";

// Get current user from context to only show sync for authenticated users
const clerkUserStore = getContext<Readable<UserResource | null>>("clerkUser");

let user = $state<UserResource | null>(null);
let unsubscribe: (() => void) | undefined;

// Subscribe to user changes with improved error handling
$effect(() => {
  if (!browser) return;

  try {
    // Clean up previous subscription if it exists
    if (unsubscribe) unsubscribe();

    // Only subscribe if clerkUserStore is available
    if (clerkUserStore) {
      unsubscribe = clerkUserStore.subscribe((u) => {
        user = u;
      });
    } else {
      console.warn("[SyncStatus] No clerkUserStore found in context");
    }
  } catch (error) {
    console.error("[SyncStatus] Error subscribing to clerkUserStore:", error);
  }

  return () => {
    if (unsubscribe) unsubscribe();
  };
});

// Cleanup on component destruction
onDestroy(() => {
  if (unsubscribe) unsubscribe();
});

function formatLastSync(timestamp: number | null): string {
  if (!timestamp) return "Never";

  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function handleSyncClick() {
  syncStore.triggerSync();
}

function handleClearError() {
  syncStore.clearError();
}
</script>

<!-- Only show sync status for authenticated users -->
{#if user}
  <div class="flex items-center gap-2 text-sm">
    <!-- Online/Offline indicator -->
    {#if $syncIsOnline}
      <Badge variant="secondary" class="gap-1">
        <Wifi class="h-3 w-3" />
        Online
      </Badge>
    {:else}
      <Badge variant="outline" class="gap-1">
        <WifiOff class="h-3 w-3" />
        Offline
      </Badge>
    {/if}

    <!-- Sync status -->
    {#if $isSyncing}
      <Badge variant="default" class="gap-1">
        <RefreshCw class="h-3 w-3 animate-spin" />
        Syncing...
      </Badge>
    {:else if $syncError}
      <Badge variant="destructive" class="cursor-pointer gap-1" onclick={handleClearError}>
        <AlertCircle class="h-3 w-3" />
        Sync Error
      </Badge>
    {:else if $syncIsOnline}
      <Badge variant="secondary" class="gap-1">
        <Cloud class="h-3 w-3" />
        Synced {formatLastSync($lastSyncTime)}
      </Badge>
    {:else}
      <Badge variant="outline" class="gap-1">
        <CloudOff class="h-3 w-3" />
        Local Only
      </Badge>
    {/if}

    <!-- Manual sync button -->
    {#if $syncIsOnline && !$isSyncing}
      <Button
        size="sm"
        variant="ghost"
        onclick={handleSyncClick}
        class="h-6 px-2"
        aria-label="Trigger manual sync"
      >
        <RefreshCw class="h-3 w-3" />
      </Button>
    {/if}
  </div>

  <!-- Error details -->
  {#if $syncError}
    <div class="text-destructive mt-1 text-xs">
      {$syncError}
    </div>
  {/if}
{/if}
