<!--
  Debug Auth Status Component
  Shows detailed authentication and sync status for debugging
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { authStateStore } from "$lib/stores/auth-state";
  import { syncStore } from "$lib/stores/sync";

  // Define proper types for debug information
  interface DebugInfo {
    clerkUser: unknown;
    authState: unknown;
    convexAuth: unknown;
    session: unknown;
  }

  interface AuthCheckResult {
    timestamp: string;
    hasSession: boolean;
    sessionDetails: unknown;
    cookies: Record<string, string>;
    authStatus: string;
    error?: string;
  }

  interface ConvexTestResult {
    status?: number;
    statusText?: string;
    hasToken?: boolean;
    tokenPreview?: string;
    error?: string;
  }

  let debugInfo = $state<DebugInfo | null>(null);
  let authCheckResult = $state<AuthCheckResult | null>(null);
  let convexTestResult = $state<ConvexTestResult | null>(null);

  // Auth state from stores
  const authState = $derived($authStateStore);
  const syncState = $derived($syncStore);

  async function checkAuthStatus() {
    if (!browser) return;

    try {
      const response = await fetch("/api/auth/check");
      const data = await response.json();
      authCheckResult = data;
      console.log("[Debug] Auth check result:", data);
    } catch (error) {
      console.error("[Debug] Auth check failed:", error);
      authCheckResult = {
        timestamp: new Date().toISOString(),
        hasSession: false,
        sessionDetails: {},
        cookies: {},
        authStatus: "error",
        error: (error as Error).message,
      };
    }
  }

  async function testConvexAuth() {
    if (!browser) return;

    try {
      const response = await fetch("/api/auth/token");
      const token = await response.text();

      convexTestResult = {
        status: response.status,
        statusText: response.statusText,
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 50)}...` : undefined,
      };

      console.log("[Debug] Convex token test result:", convexTestResult);
    } catch (error) {
      console.error("[Debug] Convex token test failed:", error);
      convexTestResult = { error: (error as Error).message, hasToken: false };
    }
  }

  async function triggerSync() {
    await syncStore.triggerSync();
  }

  onMount(() => {
    checkAuthStatus();
    testConvexAuth();
  });
</script>

<Card class="w-full max-w-4xl mx-auto">
  <CardHeader>
    <CardTitle class="flex items-center gap-2">
      🔍 Authentication & Sync Debug Status
      <Button
        size="sm"
        onclick={() => {
          checkAuthStatus();
          testConvexAuth();
        }}
      >
        Refresh
      </Button>
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    <!-- Auth State Store Status -->
    <div>
      <h3 class="font-semibold mb-2">Auth State Store</h3>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div>
          Clerk Ready: <Badge
            variant={authState.clerkReady ? "default" : "destructive"}
          >
            {authState.clerkReady}
          </Badge>
        </div>
        <div>
          Clerk User ID: <code class="text-xs"
            >{authState.clerkUserId || "null"}</code
          >
        </div>
        <div>
          Convex Auth Status: <Badge
            variant={authState.convexAuthStatus === "authenticated"
              ? "default"
              : "secondary"}
          >
            {authState.convexAuthStatus}
          </Badge>
        </div>
        <div>
          Last Auth Check: {authState.lastAuthCheck
            ? new Date(authState.lastAuthCheck).toLocaleTimeString()
            : "Never"}
        </div>
      </div>
      {#if authState.error}
        <div class="text-red-600 text-sm mt-2">Error: {authState.error}</div>
      {/if}
    </div>

    <!-- Sync Store Status -->
    <div>
      <h3 class="font-semibold mb-2">Sync Store Status</h3>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div>
          Status: <Badge
            variant={syncState.status === "success"
              ? "default"
              : syncState.status === "error"
                ? "destructive"
                : "secondary"}
          >
            {syncState.status}
          </Badge>
        </div>
        <div>
          Online: <Badge variant={syncState.isOnline ? "default" : "secondary"}>
            {syncState.isOnline}
          </Badge>
        </div>
        <div>
          Last Sync: {syncState.lastSyncTime
            ? new Date(syncState.lastSyncTime).toLocaleTimeString()
            : "Never"}
        </div>
        <div>
          <Button
            size="sm"
            onclick={triggerSync}
            disabled={syncState.status === "syncing"}
          >
            {syncState.status === "syncing" ? "Syncing..." : "Trigger Sync"}
          </Button>
        </div>
      </div>
      {#if syncState.error}
        <div class="text-red-600 text-sm mt-2">
          Sync Error: {syncState.error}
        </div>
      {/if}
    </div>

    <!-- Server Auth Check -->
    {#if authCheckResult}
      <div>
        <h3 class="font-semibold mb-2">Server Auth Check</h3>
        <div class="text-sm space-y-1">
          <div>
            Status: <Badge
              variant={authCheckResult.authStatus === "signed_in"
                ? "default"
                : "destructive"}
            >
              {authCheckResult.authStatus}
            </Badge>
          </div>
          <div>Has Session: {authCheckResult.hasSession}</div>
          {#if authCheckResult.sessionDetails && Object.keys(authCheckResult.sessionDetails).length > 0}
            <details class="text-xs">
              <summary class="cursor-pointer">Session Details</summary>
              <pre
                class="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">{JSON.stringify(
                  authCheckResult.sessionDetails,
                  null,
                  2,
                )}</pre>
            </details>
          {/if}
          <details class="text-xs">
            <summary class="cursor-pointer">Cookie Status</summary>
            <pre class="mt-2 p-2 bg-gray-100 rounded text-xs">{JSON.stringify(
                authCheckResult.cookies,
                null,
                2,
              )}</pre>
          </details>
        </div>
      </div>
    {/if}

    <!-- Convex Token Test -->
    {#if convexTestResult}
      <div>
        <h3 class="font-semibold mb-2">Convex Token Test</h3>
        <div class="text-sm space-y-1">
          <div>
            HTTP Status: <Badge
              variant={convexTestResult.status === 200
                ? "default"
                : "destructive"}
            >
              {convexTestResult.status}
              {convexTestResult.statusText}
            </Badge>
          </div>
          <div>Has Token: {convexTestResult.hasToken}</div>
          {#if convexTestResult.tokenPreview}
            <div class="text-xs">
              Token Preview: <code>{convexTestResult.tokenPreview}</code>
            </div>
          {/if}
          {#if convexTestResult.error}
            <div class="text-red-600">Error: {convexTestResult.error}</div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Instructions -->
    <div class="bg-blue-50 p-3 rounded text-sm">
      <h4 class="font-semibold">Expected for Working Auth:</h4>
      <ul class="list-disc list-inside space-y-1 mt-1">
        <li>Clerk Ready: <code>true</code></li>
        <li>Convex Auth Status: <code>authenticated</code></li>
        <li>Server Auth Status: <code>signed_in</code></li>
        <li>Convex Token HTTP Status: <code>200</code></li>
        <li>Has Token: <code>true</code></li>
      </ul>
    </div>
  </CardContent>
</Card>

<style>
  /* Optional: Add any custom styles here */
</style>
