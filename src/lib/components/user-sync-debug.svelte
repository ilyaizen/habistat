<script lang="ts">
  import { onMount } from "svelte";
  import { useClerk } from "$lib/hooks/use-clerk";
  import { userSyncService } from "$lib/services/user-sync";
  import { syncStore } from "$lib/stores/sync";
  import { authState } from "$lib/stores/auth-state";

  // Initialize Clerk hook
  const { clerkUserStore, setupSessionAssociation, initializeClerk } = useClerk();

  // State for debugging
  let debugInfo = {
    userSyncInProgress: false,
    lastSyncedUserId: null as string | null,
    authState: null as any,
    user: null as any,
    errors: [] as string[]
  };

  let unsubscribeAuth: (() => void) | null = null;

  onMount(() => {
    // Initialize Clerk
    initializeClerk();

    // Set up session association (which includes user sync)
    const unsubscribeSession = setupSessionAssociation();

    // Subscribe to auth state changes for debugging
    unsubscribeAuth = authState.subscribe((state) => {
      debugInfo.authState = state;
    });

    // Subscribe to user changes for debugging
    const unsubscribeUser = clerkUserStore.subscribe((user) => {
      debugInfo.user = user;
      updateDebugInfo();
    });

    // Update debug info periodically
    const interval = setInterval(updateDebugInfo, 1000);

    return () => {
      unsubscribeSession();
      unsubscribeAuth?.();
      unsubscribeUser();
      clearInterval(interval);
    };
  });

  function updateDebugInfo() {
    debugInfo.userSyncInProgress = userSyncService.isSyncInProgress();
    debugInfo.lastSyncedUserId = userSyncService.getLastSyncedUserId();
  }

  async function manualSync() {
    if (!debugInfo.user) {
      debugInfo.errors = [...debugInfo.errors, "No user to sync"];
      return;
    }

    try {
      const result = await userSyncService.forceSyncCurrentUser(debugInfo.user);
      if (result.success) {
        debugInfo.errors = [...debugInfo.errors, `Manual sync successful: ${result.userId}`];
      } else {
        debugInfo.errors = [...debugInfo.errors, `Manual sync failed: ${result.error}`];
      }
    } catch (error) {
      debugInfo.errors = [...debugInfo.errors, `Manual sync error: ${error}`];
    }
    updateDebugInfo();
  }

  function clearErrors() {
    debugInfo.errors = [];
  }

  function resetSync() {
    userSyncService.reset();
    updateDebugInfo();
  }
</script>

<!-- User Sync Debug Component -->
<div class="rounded-lg border border-gray-300 bg-gray-100 p-4 font-mono text-sm">
  <h3 class="mb-4 text-lg font-bold text-gray-800">🔧 User Sync Debug Panel</h3>

  <!-- User Info -->
  <div class="mb-4">
    <h4 class="mb-2 font-semibold text-gray-700">👤 User Info:</h4>
    {#if debugInfo.user}
      <div class="rounded border bg-green-50 p-2">
        <p><strong>ID:</strong> {debugInfo.user.id}</p>
        <p><strong>Email:</strong> {debugInfo.user.primaryEmailAddress?.emailAddress || "N/A"}</p>
        <p><strong>Name:</strong> {debugInfo.user.fullName || "N/A"}</p>
      </div>
    {:else}
      <div class="rounded border bg-red-50 p-2 text-red-700">No user signed in</div>
    {/if}
  </div>

  <!-- Auth State -->
  <div class="mb-4">
    <h4 class="mb-2 font-semibold text-gray-700">🔐 Auth State:</h4>
    <div class="rounded border bg-blue-50 p-2">
      <p><strong>Clerk Ready:</strong> {debugInfo.authState?.clerkReady ? "✅" : "❌"}</p>
      <p><strong>Clerk User ID:</strong> {debugInfo.authState?.clerkUserId || "None"}</p>
      <p>
        <strong>Convex Auth Status:</strong>
        {debugInfo.authState?.convexAuthStatus || "Unknown"}
      </p>
      {#if debugInfo.authState?.error}
        <p class="text-red-600"><strong>Error:</strong> {debugInfo.authState.error}</p>
      {/if}
    </div>
  </div>

  <!-- Sync Status -->
  <div class="mb-4">
    <h4 class="mb-2 font-semibold text-gray-700">🔄 Sync Status:</h4>
    <div class="rounded border bg-yellow-50 p-2">
      <p><strong>User Sync In Progress:</strong> {debugInfo.userSyncInProgress ? "🔄" : "✅"}</p>
      <p><strong>Last Synced User ID:</strong> {debugInfo.lastSyncedUserId || "None"}</p>
    </div>
  </div>

  <!-- Controls -->
  <div class="mb-4">
    <h4 class="mb-2 font-semibold text-gray-700">🎮 Controls:</h4>
    <div class="flex flex-wrap gap-2">
      <button
        onclick={manualSync}
        disabled={!debugInfo.user || debugInfo.userSyncInProgress}
        class="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600 disabled:bg-gray-400"
      >
        Force Manual Sync
      </button>
      <button
        onclick={resetSync}
        class="rounded bg-yellow-500 px-3 py-1 text-white hover:bg-yellow-600"
      >
        Reset Sync State
      </button>
      <button
        onclick={clearErrors}
        class="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600"
      >
        Clear Errors
      </button>
    </div>
  </div>

  <!-- Errors/Logs -->
  {#if debugInfo.errors.length > 0}
    <div class="mb-4">
      <h4 class="mb-2 font-semibold text-gray-700">📋 Logs/Errors:</h4>
      <div class="max-h-32 overflow-y-auto rounded border bg-gray-50 p-2">
        {#each debugInfo.errors as error, index}
          <p
            class="mb-1 text-xs {error.includes('successful')
              ? 'text-green-600'
              : error.includes('error') || error.includes('failed')
                ? 'text-red-600'
                : 'text-gray-600'}"
          >
            [{index + 1}] {error}
          </p>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Instructions -->
  <div class="text-xs text-gray-600">
    <p><strong>💡 Instructions:</strong></p>
    <ul class="mt-1 list-inside list-disc space-y-1">
      <li>Sign in/out to test automatic user sync</li>
      <li>Use "Force Manual Sync" to trigger sync manually</li>
      <li>Check browser console for detailed logs</li>
      <li>User sync ensures uniqueness by both email and Clerk ID</li>
    </ul>
  </div>
</div>

<style>
  /* Add any additional styling if needed */
</style>
