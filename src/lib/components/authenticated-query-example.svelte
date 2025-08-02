<!--
  Example component showing proper authenticated query usage
  This prevents the race condition that causes "Not authenticated" errors
-->

<script lang="ts">
  import {
    useAuthenticatedQuery,
    useAuthenticationStatus
  } from "$lib/hooks/use-authenticated-query";
  import { api } from "../../convex/_generated/api";

  // Get authentication status
  const { isLoading, isAuthenticated, canQuery } = useAuthenticationStatus();

  // These queries will only execute when authentication is ready
  const completions = useAuthenticatedQuery(api.completions.getUserCompletions, {});
  const recentCompletions = useAuthenticatedQuery(api.completions.getCompletionsSince, {
    timestamp: Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
  });
</script>

<div class="p-4">
  <h2 class="mb-4 text-xl font-bold">Authenticated Queries Example</h2>

  {#if isLoading}
    <p class="text-gray-600">🔄 Establishing authentication...</p>
  {:else if !isAuthenticated}
    <p class="text-red-600">❌ Not authenticated - please sign in</p>
  {:else}
    <div class="space-y-4">
      <p class="text-green-600">✅ Authenticated and ready</p>

      <div>
        <h3 class="font-semibold">All Completions</h3>
        {#if completions}
          <p>Found {completions.completions?.length || 0} completions</p>
        {:else}
          <p>Loading completions...</p>
        {/if}
      </div>

      <div>
        <h3 class="font-semibold">Recent Completions (24h)</h3>
        {#if recentCompletions}
          <p>Found {recentCompletions.completions?.length || 0} recent completions</p>
        {:else}
          <p>Loading recent completions...</p>
        {/if}
      </div>
    </div>
  {/if}
</div>
