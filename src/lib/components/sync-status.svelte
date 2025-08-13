<!--
  Unified Sync Status Component
  Shows current sync status with visual indicators and multiple display variants
-->
<script lang="ts">
  import type { UserResource } from "@clerk/types";
  import { AlertCircle, Cloud, CloudOff, RefreshCw, Wifi, WifiOff } from "@lucide/svelte";
  import { getContext, onDestroy } from "svelte";
  import type { Readable } from "svelte/store";
  import { browser } from "$app/environment";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import {
    isSyncing,
    lastSyncTime,
    syncError,
    syncIsOnline,
    syncStore
  } from "$lib/stores/sync-stores";
  import { cn } from "$lib/utils";

  // Props using Svelte 5 syntax
  // Unified sync status props; this replaces other indicator variants across the app
  interface Props {
    variant?: "badges" | "minimal" | "detailed";
    showText?: boolean;
    size?: "sm" | "md" | "lg";
    onRetry?: () => void;
  }

  let { variant = "badges", showText = false, size = "md", onRetry }: Props = $props();

  // Only show sync for authenticated users
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
    syncStore.triggerFullSync();
  }

  function handleClearError() {
    syncStore.clearError();
  }

  // Get sync status for indicator variants
  const syncStatus = $derived(() => {
    if (!$syncIsOnline) return "offline";
    if ($isSyncing) return "syncing";
    if ($syncError) return "error";
    if ($lastSyncTime) return "synced";
    return "idle";
  });

  // Get appropriate icon for current status
  const statusIcon = $derived(() => {
    switch (syncStatus()) {
      case "syncing":
        return "🔄";
      case "synced":
        return "✅";
      case "error":
        return "❌";
      case "offline":
        return "📴";
      default:
        return "⏸️";
    }
  });

  // Get status message
  const statusMessage = $derived(() => {
    switch (syncStatus()) {
      case "syncing":
        return "Syncing data...";
      case "synced":
        return `Last synced ${formatLastSync($lastSyncTime)}`;
      case "error":
        return $syncError || "Sync error occurred";
      case "offline":
        return "Offline - changes saved locally";
      default:
        return "Ready to sync";
    }
  });

  // Style classes for indicator variants
  const statusClasses = $derived(
    cn(
      "inline-flex items-center gap-1 transition-colors duration-200",
      {
        "text-muted-foreground": syncStatus() === "idle",
        "text-blue-600": syncStatus() === "syncing",
        "text-green-600": syncStatus() === "synced",
        "text-red-600": syncStatus() === "error",
        "text-orange-600": syncStatus() === "offline"
      },
      {
        "text-xs": size === "sm",
        "text-sm": size === "md",
        "text-base": size === "lg"
      }
    )
  );

  // Handle retry action
  function handleRetry() {
    if (onRetry) {
      onRetry();
    } else {
      syncStore.triggerFullSync();
    }
  }
</script>

<!-- Only show sync status for authenticated users -->
{#if user}
  {#if variant === "badges"}
    <!-- Original badge-based display -->
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
  {:else if variant === "minimal"}
    <!-- Minimal icon-based display with tooltip -->
    <div class={statusClasses}>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <button
            class="inline-flex items-center transition-opacity hover:opacity-80"
            disabled={syncStatus() === "syncing"}
            onclick={syncStatus() === "error" ? handleRetry : undefined}
          >
            <span class="text-lg" class:animate-spin={syncStatus() === "syncing"}>
              {statusIcon}
            </span>
            {#if showText}
              <span class="ml-1 font-medium">
                {syncStatus() === "synced"
                  ? "Synced"
                  : syncStatus() === "syncing"
                    ? "Syncing..."
                    : syncStatus() === "error"
                      ? "Error"
                      : syncStatus() === "offline"
                        ? "Offline"
                        : "Ready"}
              </span>
            {/if}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>{statusMessage}</p>
          {#if syncStatus() === "error"}
            <p class="text-muted-foreground mt-1 text-xs">Click to retry</p>
          {/if}
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  {:else if variant === "detailed"}
    <!-- Detailed view with progress and retry button -->
    <div class={statusClasses}>
      <div class="flex items-center gap-2">
        <span class="text-lg" class:animate-spin={syncStatus() === "syncing"}>
          {statusIcon}
        </span>

        <div class="flex flex-col">
          <span class="text-sm font-medium">{statusMessage}</span>

          {#if syncStatus() === "syncing"}
            <div class="text-muted-foreground flex items-center gap-2 text-xs">
              <div class="bg-muted h-1 w-16 overflow-hidden rounded-full">
                <div class="h-full animate-pulse bg-blue-600"></div>
              </div>
              <span>Syncing...</span>
            </div>
          {/if}

          {#if syncStatus() === "error" && $syncError}
            <span class="mt-1 text-xs text-red-600">{$syncError}</span>
          {/if}
        </div>

        {#if syncStatus() === "error"}
          <Button variant="outline" size="sm" onclick={handleRetry} class="ml-2">Retry</Button>
        {/if}
      </div>
    </div>
  {/if}
{/if}
