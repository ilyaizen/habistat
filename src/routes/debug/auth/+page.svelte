<!--
  Debug Authentication Page
  Accessible at /debug/auth to test authentication and sync issues
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from "$lib/components/ui/card";
  import { Separator } from "$lib/components/ui/separator";
  import { getDb } from "$lib/db/client";
  import { getConvexClient, isAuthReady, isOfflineMode } from "$lib/utils/convex";
  import { api } from "../../../convex/_generated/api";

  // Type definitions for better type safety
  interface TableCheck {
    exists: boolean;
    error: string | null;
  }

  interface MigrationStatus {
    migrationsApplied: number;
    error: string | null;
  }

  interface EndpointResult {
    status: number;
    ok: boolean;
    statusText: string;
    response: any;
    error?: string;
  }

  interface ConvexQueryResult {
    success: boolean;
    result: any;
    error: string | null;
  }

  // Reactive debug state
  let debugData = {
    timestamp: new Date().toISOString(),
    environment: {
      convexUrl: "",
      clerkKey: "",
      isDevelopment: false
    },
    convex: {
      clientInitialized: false,
      authReady: false,
      offlineMode: false,
      lastError: null as string | null
    },
    clerk: {
      sessionCheck: null,
      tokenCheck: null,
      userInfo: null
    },
    database: {
      initialized: false,
      tables: [] as string[],
      tableChecks: {} as Record<string, TableCheck>,
      migrationStatus: null as MigrationStatus | null
    },
    api: {
      tokenEndpoint: null as EndpointResult | null,
      checkEndpoint: null as EndpointResult | null,
      convexQuery: null as ConvexQueryResult | null
    }
  };

  let isLoading = $state(false);
  let convexTestResult = null;

  onMount(async () => {
    await runDiagnostics();
  });

  async function runDiagnostics() {
    isLoading = true;
    debugData.timestamp = new Date().toISOString();

    try {
      // Check environment variables
      debugData.environment = {
        convexUrl: import.meta.env.VITE_CONVEX_URL || "Not set",
        clerkKey: import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY ? "Set" : "Not set",
        isDevelopment: import.meta.env.DEV
      };

      // Check Convex client status
      const convexClient = getConvexClient();
      debugData.convex = {
        clientInitialized: !!convexClient,
        authReady: isAuthReady(),
        offlineMode: isOfflineMode(),
        lastError: null
      };

      // Test API endpoints
      await testApiEndpoints();

      // Check database status
      await checkDatabaseStatus();

      // Test Convex query if possible
      if (convexClient && isAuthReady()) {
        await testConvexQuery();
      }
    } catch (error) {
      console.error("Diagnostics failed:", error);
      debugData.convex.lastError = error instanceof Error ? error.message : "Unknown error";
    }

    isLoading = false;
  }

  async function testApiEndpoints() {
    try {
      // Test token endpoint
      const tokenResponse = await fetch("/api/auth/token");
      debugData.api.tokenEndpoint = {
        status: tokenResponse.status,
        ok: tokenResponse.ok,
        statusText: tokenResponse.statusText,
        response: tokenResponse.ok ? await tokenResponse.text() : await tokenResponse.text()
      };

      // Test check endpoint
      const checkResponse = await fetch("/api/auth/check");
      debugData.api.checkEndpoint = {
        status: checkResponse.status,
        ok: checkResponse.ok,
        statusText: checkResponse.statusText,
        response: checkResponse.ok ? await checkResponse.json() : await checkResponse.text()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      debugData.api.tokenEndpoint = {
        status: 0,
        ok: false,
        statusText: "Network Error",
        response: null,
        error: errorMessage
      };
      debugData.api.checkEndpoint = {
        status: 0,
        ok: false,
        statusText: "Network Error",
        response: null,
        error: errorMessage
      };
    }
  }

  async function checkDatabaseStatus() {
    try {
      const db = await getDb();
      debugData.database.initialized = !!db;

      if (db) {
        // Check for required tables
        const tableNames = [
          "calendars",
          "habits",
          "completions",
          "activeTimers",
          "appOpens",
          "syncMetadata"
        ];

        for (const tableName of tableNames) {
          try {
            const result = await db.run(
              `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`
            );
            debugData.database.tableChecks[tableName] = {
              exists: result.rows && result.rows.length > 0,
              error: null
            };
          } catch (error) {
            debugData.database.tableChecks[tableName] = {
              exists: false,
              error: error instanceof Error ? error.message : "Unknown error"
            };
          }
        }

        // Get list of all tables
        try {
          const allTablesResult = await db.run("SELECT name FROM sqlite_master WHERE type='table'");
          debugData.database.tables = allTablesResult.rows?.map((row: any) => row.name) || [];
        } catch (error) {
          debugData.database.tables = [];
        }

        // Check migration status
        try {
          const migrationResult = await db.run("SELECT COUNT(*) as count FROM _migrations");
          debugData.database.migrationStatus = {
            migrationsApplied: migrationResult.rows?.[0]?.count || 0,
            error: null
          };
        } catch (error) {
          debugData.database.migrationStatus = {
            migrationsApplied: 0,
            error: error instanceof Error ? error.message : "Unknown error"
          };
        }
      }
    } catch (error) {
      debugData.database = {
        initialized: false,
        tables: [],
        tableChecks: {},
        migrationStatus: {
          migrationsApplied: 0,
          error: error instanceof Error ? error.message : "Unknown error"
        }
      };
    }
  }

  async function testConvexQuery() {
    try {
      const convexClient = getConvexClient();
      if (!convexClient) {
        throw new Error("Convex client not initialized");
      }

      // Test the problematic getCurrentUser query
      const result = await convexClient.query(api.users.getCurrentUser, {});
      debugData.api.convexQuery = {
        success: true,
        result: result,
        error: null
      };
    } catch (error) {
      debugData.api.convexQuery = {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  async function fixDatabase() {
    try {
      const db = await getDb();

      // Run the initial migration manually
      const initialMigration = `
        CREATE TABLE IF NOT EXISTS calendars (
          id TEXT PRIMARY KEY,
          userId TEXT,
          name TEXT NOT NULL,
          colorTheme TEXT NOT NULL,
          position INTEGER NOT NULL,
          isEnabled INTEGER DEFAULT 1 NOT NULL,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS habits (
          id TEXT PRIMARY KEY,
          userId TEXT,
          calendarId TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL,
          timerEnabled INTEGER DEFAULT 0 NOT NULL,
          targetDurationSeconds INTEGER,
          pointsValue INTEGER DEFAULT 0,
          position INTEGER NOT NULL,
          isEnabled INTEGER DEFAULT 1 NOT NULL,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS completions (
          id TEXT PRIMARY KEY,
          userId TEXT,
          habitId TEXT NOT NULL,
          completedAt INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS activeTimers (
          id TEXT PRIMARY KEY,
          userId TEXT,
          habitId TEXT NOT NULL,
          startTime INTEGER NOT NULL,
          pausedTime INTEGER,
          totalPausedDurationSeconds INTEGER DEFAULT 0 NOT NULL,
          status TEXT NOT NULL,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS appOpens (
          id TEXT PRIMARY KEY,
          timestamp INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS syncMetadata (
          id TEXT PRIMARY KEY,
          lastSyncTimestamp INTEGER DEFAULT 0 NOT NULL
        );
      `;

      await db.run(initialMigration);

      // Re-run diagnostics to verify
      await runDiagnostics();

      alert("Database tables created successfully!");
    } catch (error) {
      alert(`Failed to fix database: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  function getStatusBadge(success: boolean, text?: string) {
    return success
      ? { variant: "default", text: text || "✓ OK" }
      : { variant: "destructive", text: text || "✗ Error" };
  }
</script>

<svelte:head>
  <title>Auth Debug - Habistat</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-6">
  <div class="flex items-center justify-between">
    <h1 class="text-3xl font-bold">🔍 Habistat Debug Dashboard</h1>
    <Button onclick={runDiagnostics} disabled={isLoading}>
      {isLoading ? "Running..." : "Refresh Diagnostics"}
    </Button>
  </div>

  <p class="text-muted-foreground">
    Debug tool for authentication and database issues. Last updated: {debugData.timestamp}
  </p>

  <!-- Environment Status -->
  <Card>
    <CardHeader>
      <CardTitle>🌍 Environment Configuration</CardTitle>
      <CardDescription>Check if required environment variables are set</CardDescription>
    </CardHeader>
    <CardContent class="space-y-2">
      <div class="flex items-center justify-between">
        <span>Convex URL:</span>
        <Badge variant={debugData.environment.convexUrl !== "Not set" ? "default" : "destructive"}>
          {debugData.environment.convexUrl}
        </Badge>
      </div>
      <div class="flex items-center justify-between">
        <span>Clerk Publishable Key:</span>
        <Badge variant={debugData.environment.clerkKey === "Set" ? "default" : "destructive"}>
          {debugData.environment.clerkKey}
        </Badge>
      </div>
      <div class="flex items-center justify-between">
        <span>Development Mode:</span>
        <Badge variant="outline">{debugData.environment.isDevelopment}</Badge>
      </div>
    </CardContent>
  </Card>

  <!-- Convex Status -->
  <Card>
    <CardHeader>
      <CardTitle>🔄 Convex Client Status</CardTitle>
      <CardDescription>Check Convex client initialization and authentication</CardDescription>
    </CardHeader>
    <CardContent class="space-y-2">
      <div class="flex items-center justify-between">
        <span>Client Initialized:</span>
        <Badge variant={debugData.convex.clientInitialized ? "default" : "destructive"}>
          {debugData.convex.clientInitialized ? "✓ Yes" : "✗ No"}
        </Badge>
      </div>
      <div class="flex items-center justify-between">
        <span>Auth Ready:</span>
        <Badge variant={debugData.convex.authReady ? "default" : "destructive"}>
          {debugData.convex.authReady ? "✓ Yes" : "✗ No"}
        </Badge>
      </div>
      <div class="flex items-center justify-between">
        <span>Offline Mode:</span>
        <Badge variant={debugData.convex.offlineMode ? "destructive" : "default"}>
          {debugData.convex.offlineMode ? "⚠ Yes" : "✓ No"}
        </Badge>
      </div>
      {#if debugData.convex.lastError}
        <div class="rounded bg-red-50 p-2 text-sm text-red-600">
          Error: {debugData.convex.lastError}
        </div>
      {/if}
    </CardContent>
  </Card>

  <!-- API Endpoints Status -->
  <Card>
    <CardHeader>
      <CardTitle>🔗 API Endpoints</CardTitle>
      <CardDescription>Test authentication API endpoints</CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      {#if debugData.api.tokenEndpoint}
        <div>
          <h4 class="font-medium">/api/auth/token</h4>
          <div class="mt-1 flex items-center gap-2">
            <Badge variant={debugData.api.tokenEndpoint.ok ? "default" : "destructive"}>
              {debugData.api.tokenEndpoint.status}
            </Badge>
            <span class="text-muted-foreground text-sm"
              >{debugData.api.tokenEndpoint.statusText}</span
            >
          </div>
          {#if debugData.api.tokenEndpoint.response}
            <pre
              class="mt-2 max-h-32 overflow-auto rounded bg-gray-100 p-2 text-xs">{typeof debugData
                .api.tokenEndpoint.response === "string"
                ? debugData.api.tokenEndpoint.response.substring(0, 200) + "..."
                : JSON.stringify(debugData.api.tokenEndpoint.response, null, 2)}</pre>
          {/if}
        </div>
      {/if}

      {#if debugData.api.checkEndpoint}
        <div>
          <h4 class="font-medium">/api/auth/check</h4>
          <div class="mt-1 flex items-center gap-2">
            <Badge variant={debugData.api.checkEndpoint.ok ? "default" : "destructive"}>
              {debugData.api.checkEndpoint.status}
            </Badge>
            <span class="text-muted-foreground text-sm"
              >{debugData.api.checkEndpoint.statusText}</span
            >
          </div>
          {#if debugData.api.checkEndpoint.response}
            <pre
              class="mt-2 max-h-32 overflow-auto rounded bg-gray-100 p-2 text-xs">{JSON.stringify(
                debugData.api.checkEndpoint.response,
                null,
                2
              )}</pre>
          {/if}
        </div>
      {/if}

      {#if debugData.api.convexQuery}
        <div>
          <h4 class="font-medium">Convex users:getCurrentUser Query</h4>
          <div class="mt-1 flex items-center gap-2">
            <Badge variant={debugData.api.convexQuery.success ? "default" : "destructive"}>
              {debugData.api.convexQuery.success ? "✓ Success" : "✗ Failed"}
            </Badge>
          </div>
          {#if debugData.api.convexQuery.error}
            <pre class="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">{debugData.api.convexQuery
                .error}</pre>
          {/if}
          {#if debugData.api.convexQuery.result}
            <pre class="mt-2 rounded bg-green-50 p-2 text-xs text-green-700">{JSON.stringify(
                debugData.api.convexQuery.result,
                null,
                2
              )}</pre>
          {/if}
        </div>
      {/if}
    </CardContent>
  </Card>

  <!-- Database Status -->
  <Card>
    <CardHeader>
      <CardTitle>🗄️ Database Status</CardTitle>
      <CardDescription>Check local SQLite database tables and migrations</CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="flex items-center justify-between">
        <span>Database Initialized:</span>
        <Badge variant={debugData.database.initialized ? "default" : "destructive"}>
          {debugData.database.initialized ? "✓ Yes" : "✗ No"}
        </Badge>
      </div>

      {#if debugData.database.migrationStatus}
        <div class="flex items-center justify-between">
          <span>Migrations Applied:</span>
          <Badge variant={debugData.database.migrationStatus.error ? "destructive" : "default"}>
            {debugData.database.migrationStatus.migrationsApplied}
          </Badge>
        </div>
        {#if debugData.database.migrationStatus.error}
          <div class="rounded bg-red-50 p-2 text-sm text-red-600">
            Migration Error: {debugData.database.migrationStatus.error}
          </div>
        {/if}
      {/if}

      <Separator />

      <h4 class="font-medium">Required Tables Status:</h4>
      <div class="grid grid-cols-2 gap-2">
        {#each Object.entries(debugData.database.tableChecks) as [tableName, status]}
          <div class="flex items-center justify-between">
            <span class="text-sm">{tableName}:</span>
            <Badge variant={status.exists ? "default" : "destructive"} class="text-xs">
              {status.exists ? "✓" : "✗"}
            </Badge>
          </div>
        {/each}
      </div>

      {#if debugData.database.tables.length > 0}
        <div>
          <h4 class="font-medium">
            All Tables ({debugData.database.tables.length}):
          </h4>
          <div class="text-muted-foreground text-xs">
            {debugData.database.tables.join(", ")}
          </div>
        </div>
      {/if}

      <div class="mt-4 flex gap-2">
        <Button size="sm" variant="outline" onclick={fixDatabase}>🔧 Fix Missing Tables</Button>
      </div>
    </CardContent>
  </Card>

  <!-- Quick Fix Instructions -->
  <Card>
    <CardHeader>
      <CardTitle>🚑 Quick Fix Instructions</CardTitle>
      <CardDescription>Common solutions for detected issues</CardDescription>
    </CardHeader>
    <CardContent class="space-y-4 text-sm">
      {#if !debugData.convex.authReady}
        <div class="rounded border-l-4 border-yellow-400 bg-yellow-50 p-3">
          <h5 class="font-medium text-yellow-800">⚠️ Convex Authentication Not Ready</h5>
          <p class="mt-1 text-yellow-700">
            Ensure you've set the <code>CLERK_JWT_ISSUER_DOMAIN</code> environment variable in your Convex
            dashboard.
          </p>
          <ol class="mt-2 list-inside list-decimal space-y-1 text-yellow-700">
            <li>Go to Clerk Dashboard → JWT Templates → Create "convex" template</li>
            <li>Copy the Issuer URL (e.g., https://your-domain.clerk.accounts.dev)</li>
            <li>Go to Convex Dashboard → Settings → Environment Variables</li>
            <li>Add CLERK_JWT_ISSUER_DOMAIN with the Issuer URL</li>
            <li>Redeploy: <code>bun exec convex deploy</code></li>
          </ol>
        </div>
      {/if}

      {#if Object.values(debugData.database.tableChecks).some((check) => !check.exists)}
        <div class="rounded border-l-4 border-red-400 bg-red-50 p-3">
          <h5 class="font-medium text-red-800">🗄️ Missing Database Tables</h5>
          <p class="mt-1 text-red-700">
            Local SQLite database is missing required tables. Click "Fix Missing Tables" button
            above.
          </p>
        </div>
      {/if}

      {#if debugData.api.tokenEndpoint && !debugData.api.tokenEndpoint.ok}
        <div class="rounded border-l-4 border-red-400 bg-red-50 p-3">
          <h5 class="font-medium text-red-800">🔑 Token Endpoint Error</h5>
          <p class="mt-1 text-red-700">
            The authentication token endpoint is failing. Check your Clerk configuration and ensure
            you're logged in.
          </p>
        </div>
      {/if}
    </CardContent>
  </Card>
</div>
