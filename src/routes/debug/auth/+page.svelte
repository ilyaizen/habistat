<!--
  Debug Authentication Page
  Accessible at /debug/auth to test authentication and sync issues
-->
<script lang="ts">
import DebugAuthStatus from "$lib/components/debug-auth-status.svelte";
</script>

<svelte:head>
  <title>Auth Debug - Habistat</title>
</svelte:head>

<div class="container mx-auto p-4">
  <h1 class="text-3xl font-bold mb-6">Authentication Debug Page</h1>

  <p class="mb-6 text-gray-600">
    This page helps diagnose authentication and sync issues. Check the status
    below to identify where the problem is occurring.
  </p>

  <DebugAuthStatus />
</div>
