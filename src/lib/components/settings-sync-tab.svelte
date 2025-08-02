<script lang="ts">
  import { Cloud, Database, RefreshCw, Shield, Lock } from "@lucide/svelte";
  import SyncStatus from "$lib/components/sync-status.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Card, CardContent, CardHeader } from "$lib/components/ui/card";
  import { Label } from "$lib/components/ui/label";
  import { settings } from "$lib/stores/settings";
  import { isSyncing, lastSyncTime, syncError, syncIsOnline, syncStore } from "$lib/stores/sync";
  import type { Readable } from "svelte/store";

  // Define the extended sync store interface with optional diagnostic methods
  interface ExtendedSyncStore extends Readable<any> {
    setUserId: (userId: string | null) => void;
    triggerSync: () => Promise<any>;
    migrateAnonymousData: () => Promise<any>;
    clearError: () => void;
    getSyncService: () => any | null;
    verifyAuthentication?: () => Promise<any>;
    checkEnvironment?: () => Promise<any>;
    authDiagnostics?: any;
  }

  // Type assertion to add the optional diagnostic methods
  const extendedSyncStore = syncStore as unknown as ExtendedSyncStore;
  const developerMode = $derived($settings.developerMode);

  // Define the JWT info interface
  interface JwtInfo {
    exp: string;
    iat: string;
    domain: string;
    applicationID: string;
    error?: string;
  }

  // Function to extract and format JWT payload for debugging
  function extractJwtInfo(errorMessage: string | null | undefined): JwtInfo | null {
    try {
      if (!errorMessage || typeof errorMessage !== "string") return null;

      // Try to extract a JWT token from the error message (simplified)
      const jwtMatch = errorMessage.match(/eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);
      if (!jwtMatch) return null;

      const jwt = jwtMatch[0];
      const parts = jwt.split(".");
      if (parts.length !== 3) return null;

      // Decode the payload (middle part)
      try {
        const payload = JSON.parse(atob(parts[1]));
        return {
          exp: new Date(payload.exp * 1000).toLocaleString(),
          iat: new Date(payload.iat * 1000).toLocaleString(),
          domain: payload.domain || "Missing",
          applicationID: payload.applicationID || "Missing"
          // Add other critical fields
        };
      } catch (e) {
        return {
          exp: "Unknown",
          iat: "Unknown",
          domain: "Error",
          applicationID: "Error",
          error: "Failed to decode JWT"
        };
      }
    } catch (e) {
      return null;
    }
  }

  // Check if verification functions exist in syncStore
  const canVerifyAuth = $derived(!!extendedSyncStore.verifyAuthentication);
  const canCheckEnv = $derived(!!extendedSyncStore.checkEnvironment);
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

        {#if developerMode}
          <Button
            size="sm"
            variant="ghost"
            onclick={() =>
              canVerifyAuth
                ? extendedSyncStore.verifyAuthentication?.()
                : alert("Authentication verification not implemented")}
            class="flex items-center gap-2"
            title="Test authentication with Convex (Developer Mode)"
            disabled={!canVerifyAuth}
          >
            Verify Auth
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

        {#if $syncError}
          <div class="bg-destructive/10 text-destructive mt-2 rounded-md p-2 text-xs">
            <p><strong>Error details:</strong></p>
            <p class="break-words">{$syncError}</p>

            {#if $syncError.includes("JWT") || $syncError.includes("token") || $syncError.includes("authenticate") || $syncError.includes("Not authenticated")}
              <p class="mt-1"><strong>Authentication Issue Detected:</strong></p>
              <ul class="list-inside list-disc">
                <li>JWT secret mismatch between Clerk and Convex</li>
                <li>Token expired or malformed</li>
                <li>
                  Missing required claims (domain={process.env.CLERK_JWT_ISSUER_DOMAIN},
                  applicationID="convex")
                </li>
                <li>Webhook signing secret misconfiguration</li>
              </ul>

              <div class="border-destructive/20 mt-2 border-t pt-2">
                <p><strong>Debugging Steps:</strong></p>
                <ol class="list-inside list-decimal">
                  <li>Verify environment variables (CLERK_JWT_ISSUER_DOMAIN)</li>
                  <li>Check Clerk JWT template for required claims</li>
                  <li>Confirm webhook signing secret matches in both services</li>
                  <li>Look for token validation errors in server logs</li>
                </ol>
              </div>

              {#if developerMode && $syncError.includes("JWT")}
                <div class="border-destructive/20 mt-2 border-t pt-2">
                  <p><strong>JWT Error Diagnostics:</strong></p>
                  <p class="font-mono text-[10px] opacity-80">{$syncError}</p>

                  {#if extractJwtInfo($syncError)}
                    <div class="bg-muted/30 mt-2 rounded p-1">
                      <p class="text-[10px] font-medium">JWT Payload Analysis:</p>
                      <ul class="list-inside font-mono text-[10px]">
                        <li>
                          domain:
                          <span
                            class={extractJwtInfo($syncError)?.domain === "Missing"
                              ? "text-destructive"
                              : ""}
                          >
                            {extractJwtInfo($syncError)?.domain}
                          </span>
                        </li>
                        <li>
                          applicationID:
                          <span
                            class={extractJwtInfo($syncError)?.applicationID === "Missing"
                              ? "text-destructive"
                              : ""}
                          >
                            {extractJwtInfo($syncError)?.applicationID}
                          </span>
                        </li>
                        <li>Issued: {extractJwtInfo($syncError)?.iat}</li>
                        <li>Expires: {extractJwtInfo($syncError)?.exp}</li>
                      </ul>
                      {#if extractJwtInfo($syncError)?.domain === "Missing" || extractJwtInfo($syncError)?.applicationID === "Missing"}
                        <p class="text-destructive mt-1 text-[10px]">⚠️ Missing required claims!</p>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/if}
            {/if}
          </div>
        {/if}

        <p class="mt-2 text-xs">
          Your data automatically syncs when you're online and signed in. All changes are saved
          locally first to ensure no data is lost.
        </p>
      </div>
    </div>
  </CardContent>
</Card>

<!-- Data Migration Section (for developer info) -->
{#if developerMode}
  <!-- Data Migration Section -->
  <Card class="mb-6">
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
        onclick={() => extendedSyncStore.migrateAnonymousData()}
        disabled={$isSyncing}
        class="flex items-center gap-2"
      >
        <Database class="h-3 w-3" />
        Trigger Migration
      </Button>
    </CardContent>
  </Card>

  <!-- Authentication Diagnostics Section -->
  <Card>
    <CardHeader>
      <Label class="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-4 w-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path></svg
        >
        Authentication Diagnostics
      </Label>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="text-muted-foreground text-sm">
        <p><strong>JWT Requirements:</strong></p>
        <ul class="list-inside list-disc">
          <li>domain = process.env.CLERK_JWT_ISSUER_DOMAIN</li>
          <li>applicationID = "convex"</li>
          <li>Valid JWT signing secret</li>
        </ul>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onclick={() =>
            canVerifyAuth
              ? extendedSyncStore.verifyAuthentication?.()
              : alert("Authentication verification not implemented")}
          class="flex items-center gap-2"
          disabled={!canVerifyAuth}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-3 w-3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path></svg
          >
          Verify Auth Token
        </Button>

        <Button
          size="sm"
          variant="outline"
          onclick={() =>
            canCheckEnv
              ? extendedSyncStore.checkEnvironment?.()
              : alert("Environment check not implemented")}
          class="flex items-center gap-2"
          disabled={!canCheckEnv}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-3 w-3"
            ><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path
              d="M7 11V7a5 5 0 0 1 10 0v4"
            ></path></svg
          >
          Check Environment
        </Button>
      </div>

      {#if extendedSyncStore.authDiagnostics}
        <div class="border-border mt-2 border-t pt-2">
          <p class="text-sm font-medium">Authentication Diagnostics:</p>
          <pre
            class="bg-muted/50 mt-1 max-h-32 overflow-auto rounded p-2 font-mono text-[10px]">{JSON.stringify(
              extendedSyncStore.authDiagnostics,
              null,
              2
            )}</pre>
        </div>
      {/if}
    </CardContent>
  </Card>
{/if}
