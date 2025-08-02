<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { getConvexClient, isAuthReady, isOfflineMode } from "$lib/utils/convex";
  import { api } from "../../../convex/_generated/api";

  // Debug state
  let debugInfo = {
    clerkLoaded: false,
    clerkPublishableKey: "",
    convexClient: null as any,
    authReady: false,
    offlineMode: false,
    userIdentity: null as any,
    clerkUser: null as any,
    clerkSession: null as any,
    errors: [] as string[]
  };

  // Test Convex function
  async function testConvexAuth() {
    try {
      const client = getConvexClient();
      if (!client) {
        debugInfo.errors.push("Convex client not available");
        return;
      }

      // Test with a simple query
      const result = await client.query(api.users.getCurrentUser, {});
      debugInfo.errors.push(`Query successful: ${JSON.stringify(result)}`);
    } catch (error) {
      debugInfo.errors.push(`Query failed: ${error}`);
    }
  }

  onMount(() => {
    if (!browser) return;

    // Check environment variables
    debugInfo.clerkPublishableKey = window.clerkPublishableKey || "Not set";

    // Check Clerk status
    const checkClerk = () => {
      debugInfo.clerkLoaded = !!window.Clerk;
      debugInfo.clerkUser = window.Clerk?.user || null;
      debugInfo.clerkSession = window.Clerk?.session || null;
    };

    // Check Convex status
    const checkConvex = () => {
      debugInfo.convexClient = getConvexClient();
      debugInfo.authReady = isAuthReady();
      debugInfo.offlineMode = isOfflineMode();
    };

    // Initial checks
    checkClerk();
    checkConvex();

    // Listen for Clerk events
    window.addEventListener("clerk-loaded", () => {
      debugInfo.errors.push("Clerk loaded event received");
      checkClerk();
      checkConvex();
    });

    window.addEventListener("clerk-cdn-failed", () => {
      debugInfo.errors.push("Clerk CDN failed event received");
    });

    // Periodic status update
    const interval = setInterval(() => {
      checkClerk();
      checkConvex();
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  });

  async function testClerkToken() {
    try {
      if (!window.Clerk?.session) {
        debugInfo.errors.push("No Clerk session available");
        return;
      }

      const token = await window.Clerk.session.getToken({ template: "convex" });
      if (token) {
        debugInfo.errors.push(`Clerk token retrieved successfully (length: ${token.length})`);
        debugInfo.errors.push(`Token preview: ${token.substring(0, 50)}...`);
      } else {
        debugInfo.errors.push("Failed to get Clerk token");
      }
    } catch (error) {
      debugInfo.errors.push(`Clerk token error: ${error}`);
    }
  }
</script>

<div class="container mx-auto p-6">
  <h1 class="mb-6 text-2xl font-bold">🔍 Convex + Clerk Debug Console</h1>

  <div class="grid gap-6">
    <!-- Environment Info -->
    <div class="rounded bg-gray-100 p-4">
      <h2 class="mb-2 font-semibold">🌐 Environment</h2>
      <p>
        <strong>Clerk Publishable Key:</strong>
        {debugInfo.clerkPublishableKey}
      </p>
      <p><strong>Browser:</strong> {browser}</p>
      <p><strong>Online:</strong> {browser ? navigator.onLine : "N/A"}</p>
    </div>

    <!-- Clerk Status -->
    <div class="rounded bg-blue-100 p-4">
      <h2 class="mb-2 font-semibold">🔐 Clerk Status</h2>
      <p><strong>Loaded:</strong> {debugInfo.clerkLoaded ? "✅" : "❌"}</p>
      <p>
        <strong>User:</strong>
        {debugInfo.clerkUser
          ? `✅ ${debugInfo.clerkUser.emailAddresses?.[0]?.emailAddress || "No email"}`
          : "❌ Not signed in"}
      </p>
      <p>
        <strong>Session:</strong>
        {debugInfo.clerkSession ? "✅ Active" : "❌ None"}
      </p>

      <div class="mt-2">
        <button class="rounded bg-blue-500 px-3 py-1 text-sm text-white" onclick={testClerkToken}>
          Test Clerk Token
        </button>
      </div>
    </div>

    <!-- Convex Status -->
    <div class="rounded bg-green-100 p-4">
      <h2 class="mb-2 font-semibold">⚡ Convex Status</h2>
      <p>
        <strong>Client:</strong>
        {debugInfo.convexClient ? "✅ Connected" : "❌ Not connected"}
      </p>
      <p><strong>Auth Ready:</strong> {debugInfo.authReady ? "✅" : "❌"}</p>
      <p>
        <strong>Offline Mode:</strong>
        {debugInfo.offlineMode ? "⚠️ Yes" : "✅ No"}
      </p>

      <div class="mt-2">
        <button class="rounded bg-green-500 px-3 py-1 text-sm text-white" onclick={testConvexAuth}>
          Test Convex Query
        </button>
      </div>
    </div>

    <!-- Debug Log -->
    <div class="rounded bg-yellow-100 p-4">
      <h2 class="mb-2 font-semibold">📝 Debug Log</h2>
      <div class="max-h-64 overflow-y-auto">
        {#each debugInfo.errors as error, i}
          <p class="mb-1 font-mono text-sm">[{i + 1}] {error}</p>
        {/each}
        {#if debugInfo.errors.length === 0}
          <p class="text-sm text-gray-500">No debug messages yet...</p>
        {/if}
      </div>

      <button
        class="mt-2 rounded bg-red-500 px-3 py-1 text-sm text-white"
        onclick={() => (debugInfo.errors = [])}
      >
        Clear Log
      </button>
    </div>
  </div>
</div>

<style>
  :global(body) {
    font-family: Arial, sans-serif;
  }
</style>
