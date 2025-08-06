<!--
  Sync Status Indicator Component
  Shows current sync status with visual feedback and tooltip
-->
<script lang="ts">
  import {
    consolidatedSyncStore,
    getSyncStatusIcon,
    getSyncStatusMessage
  } from "$lib/stores/sync-consolidated";
  import { networkStore } from "$lib/stores/network";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { Button } from "$lib/components/ui/button";
  import { cn } from "$lib/utils";

  // Props using Svelte 5 syntax
  interface Props {
    showText?: boolean;
    size?: "sm" | "md" | "lg";
    variant?: "minimal" | "detailed";
    onRetry?: () => void;
  }

  let { showText = false, size = "md", variant = "minimal", onRetry }: Props = $props();

  // Reactive values using Svelte 5 syntax
  let syncInfo = $derived($consolidatedSyncStore);
  let networkInfo = $derived($networkStore);
  let status = $derived(networkInfo.isOnline ? syncInfo.status : "offline");
  let icon = $derived(getSyncStatusIcon(status));
  let message = $derived(getSyncStatusMessage(status, syncInfo));

  // Style classes based on status
  let statusClasses = $derived(
    cn(
      "inline-flex items-center gap-1 transition-colors duration-200",
      {
        "text-muted-foreground": status === "idle",
        "text-blue-600 animate-spin": status === "syncing",
        "text-green-600": status === "synced",
        "text-red-600": status === "error",
        "text-orange-600": status === "offline"
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
    }
  }
</script>

<div class={statusClasses}>
  {#if variant === "minimal"}
    <!-- Simple icon with tooltip -->
    <Tooltip.Root>
      <Tooltip.Trigger>
        <button
          class="inline-flex items-center transition-opacity hover:opacity-80"
          disabled={status === "syncing"}
          onclick={status === "error" && onRetry ? handleRetry : undefined}
        >
          <span class="text-lg" class:animate-spin={status === "syncing"}>
            {icon}
          </span>
          {#if showText}
            <span class="ml-1 font-medium">
              {status === "synced"
                ? "Synced"
                : status === "syncing"
                  ? "Syncing..."
                  : status === "error"
                    ? "Error"
                    : status === "offline"
                      ? "Offline"
                      : "Ready"}
            </span>
          {/if}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <p>{message}</p>
        {#if status === "error" && onRetry}
          <p class="text-muted-foreground mt-1 text-xs">Click to retry</p>
        {/if}
      </Tooltip.Content>
    </Tooltip.Root>
  {:else}
    <!-- Detailed view with progress and retry button -->
    <div class="flex items-center gap-2">
      <span class="text-lg" class:animate-spin={status === "syncing"}>
        {icon}
      </span>

      <div class="flex flex-col">
        <span class="text-sm font-medium">{message}</span>

        {#if status === "syncing" && syncInfo.totalItems && syncInfo.completedItems !== undefined}
          <div class="text-muted-foreground flex items-center gap-2 text-xs">
            <div class="bg-muted h-1 w-16 overflow-hidden rounded-full">
              <div
                class="h-full bg-blue-600 transition-all duration-300"
                style="width: {(syncInfo.completedItems / syncInfo.totalItems) * 100}%"
              ></div>
            </div>
            <span>{syncInfo.completedItems}/{syncInfo.totalItems}</span>
          </div>
        {/if}

        {#if status === "error" && syncInfo.error}
          <span class="mt-1 text-xs text-red-600">{syncInfo.error}</span>
        {/if}
      </div>

      {#if status === "error" && onRetry}
        <Button variant="outline" size="sm" onclick={handleRetry} class="ml-2">Retry</Button>
      {/if}
    </div>
  {/if}
</div>
