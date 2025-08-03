<script lang="ts">
  import { Cloud, Database, RefreshCw } from "@lucide/svelte";
  import SyncStatus from "$lib/components/sync-status.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Card, CardContent, CardHeader } from "$lib/components/ui/card";
  import { Label } from "$lib/components/ui/label";
  import { settings } from "$lib/stores/settings";
  import { isSyncing, lastSyncTime, syncError, syncIsOnline, syncStore } from "$lib/stores/sync";
  import type { Readable } from "svelte/store";

  // Define the extended sync store interface with simplified methods
  interface ExtendedSyncStore extends Readable<any> {
    setUserId: (userId: string | null) => void;
    triggerSync: () => Promise<any>;
    migrateAnonymousData: () => Promise<any>;
    clearError: () => void;
    getSyncService: () => any | null;
  }

  // Type assertion for the sync store
  const extendedSyncStore = syncStore as unknown as ExtendedSyncStore;
  const developerMode = $derived($settings.developerMode);

  // Function to get error severity and color based on error type
  function getErrorSeverity(errorMessage: string | null) {
    if (!errorMessage) return null;

    const message = errorMessage.toLowerCase();

    if (
      message.includes("not authenticated") ||
      message.includes("jwt") ||
      message.includes("token")
    ) {
      return { type: "auth", color: "text-orange-600 bg-orange-50 border-orange-200", icon: "🔐" };
    }

    if (
      message.includes("network") ||
      message.includes("offline") ||
      message.includes("connection")
    ) {
      return { type: "network", color: "text-blue-600 bg-blue-50 border-blue-200", icon: "🌐" };
    }

    if (message.includes("timeout") || message.includes("slow") || message.includes("retry")) {
      return {
        type: "timeout",
        color: "text-yellow-600 bg-yellow-50 border-yellow-200",
        icon: "⏱️"
      };
    }

    if (message.includes("quota") || message.includes("limit") || message.includes("rate")) {
      return { type: "quota", color: "text-purple-600 bg-purple-50 border-purple-200", icon: "📊" };
    }

    // Default error styling
    return { type: "general", color: "text-red-600 bg-red-50 border-red-200", icon: "⚠️" };
  }

  const errorInfo = $derived(getErrorSeverity($syncError));
</script>

<!-- Sync Settings Section -->
<Card class="mb-6">
  <CardHeader>
    <Label class="flex items-center gap-2"><Cloud class="h-4 w-4" /> Sync Status</Label>
  </CardHeader>
  <CardContent class="space-y-4">
    <!-- Current sync status display -->
    <div class="flex flex-col space-y-3">
      <SyncStatus />

      <!-- Sync controls -->
      <div class="flex flex-wrap gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          onclick={() => extendedSyncStore.triggerSync()}
          disabled={$isSyncing || !$syncIsOnline}
          class="flex items-center gap-2"
        >
          <RefreshCw class="h-3 w-3 {$isSyncing ? 'animate-spin' : ''}" />
          {$isSyncing ? "Syncing..." : "Sync Now"}
        </Button>

        {#if $syncError}
          <Button
            size="sm"
            variant="secondary"
            onclick={() => extendedSyncStore.clearError()}
            class="flex items-center gap-2"
          >
            Clear Error
          </Button>
        {/if}
      </div>

      <!-- Sync information -->
      <div class="text-muted-foreground space-y-1 text-sm">
        <p>
          <strong>Status:</strong>
          {#if $syncIsOnline}
            <span class="text-green-600">Connected to cloud</span>
          {:else}
            <span class="text-amber-600">Offline mode - changes saved locally</span>
          {/if}
        </p>
        {#if $lastSyncTime}
          <p>
            <strong>Last sync:</strong>
            {new Date($lastSyncTime).toLocaleString()}
          </p>
        {/if}

        {#if $syncError && errorInfo}
          <div class="mt-2 rounded-md border p-3 text-xs {errorInfo.color}">
            <div class="flex items-start gap-2">
              <span class="text-base">{errorInfo.icon}</span>
              <div class="flex-1">
                <p class="font-medium capitalize">{errorInfo.type} Error</p>
                <p class="mt-1 break-words opacity-90">{$syncError}</p>

                {#if errorInfo.type === "auth"}
                  <p class="mt-2 text-xs opacity-75">
                    Authentication issue - try refreshing the page or signing out and back in.
                  </p>
                {:else if errorInfo.type === "network"}
                  <p class="mt-2 text-xs opacity-75">
                    Network connectivity issue - check your internet connection.
                  </p>
                {:else if errorInfo.type === "timeout"}
                  <p class="mt-2 text-xs opacity-75">
                    Request timed out - the system will retry automatically.
                  </p>
                {:else if errorInfo.type === "quota"}
                  <p class="mt-2 text-xs opacity-75">
                    Service limits reached - please try again later.
                  </p>
                {/if}
              </div>
            </div>
          </div>
        {/if}

        <p class="mt-2 text-xs opacity-75">
          Your data automatically syncs when you're online and signed in. All changes are saved
          locally first to ensure no data is lost.
        </p>
      </div>
    </div>
  </CardContent>
</Card>

<!-- Data Migration Section (for developer mode only) -->
{#if developerMode}
  <Card class="mb-6">
    <CardHeader>
      <Label class="flex items-center gap-2"><Database class="h-4 w-4" /> Data Migration</Label>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="text-muted-foreground text-sm">
        <p>Anonymous data migration happens automatically when you first sign in.</p>
        <p class="text-xs opacity-75">This section is visible because Developer Mode is enabled.</p>
      </div>

      <Button
        size="sm"
        variant="outline"
        onclick={() => extendedSyncStore.migrateAnonymousData()}
        disabled={$isSyncing}
        class="flex items-center gap-2"
      >
        <Database class="h-3 w-3" />
        Trigger Migration
      </Button>
    </CardContent>
  </Card>
{/if}
