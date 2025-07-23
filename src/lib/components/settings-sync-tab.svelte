<script lang="ts">
import { Cloud, Database, RefreshCw } from "@lucide/svelte";
import SyncStatus from "$lib/components/sync-status.svelte";
import { Button } from "$lib/components/ui/button";
import { Card, CardContent, CardHeader } from "$lib/components/ui/card";
import { Label } from "$lib/components/ui/label";
import { settings } from "$lib/stores/settings";
import { isSyncing, lastSyncTime, syncError, syncIsOnline, syncStore } from "$lib/stores/sync";

const developerMode = $derived($settings.developerMode);
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
          onclick={() => syncStore.triggerSync()}
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
            onclick={() => syncStore.clearError()}
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
            Connected to cloud
          {:else}
            Offline mode - changes saved locally
          {/if}
        </p>
        {#if $lastSyncTime}
          <p>
            <strong>Last sync:</strong>
            {new Date($lastSyncTime).toLocaleString()}
          </p>
        {/if}
        <p class="text-xs">
          Your data automatically syncs when you're online and signed in. All changes are saved
          locally first to ensure no data is lost.
        </p>
      </div>
    </div>
  </CardContent>
</Card>

<!-- Data Migration Section (for developer info) -->
{#if developerMode}
  <Card>
    <CardHeader>
      <Label class="flex items-center gap-2"><Database class="h-4 w-4" /> Data Migration</Label>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="text-muted-foreground text-sm">
        <p>Anonymous data migration happens automatically when you first sign in.</p>
        <p>This section is visible because Developer Mode is enabled.</p>
      </div>

      <Button
        size="sm"
        variant="outline"
        onclick={() => syncStore.migrateAnonymousData()}
        disabled={$isSyncing}
        class="flex items-center gap-2"
      >
        <Database class="h-3 w-3" />
        Trigger Migration
      </Button>
    </CardContent>
  </Card>
{/if}
