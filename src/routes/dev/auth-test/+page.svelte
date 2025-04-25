<script lang="ts">
  import { simulateAuthFlow, resetAuthState, logAuthState } from "$lib/utils/test-auth-flow";
  import { Button } from "$lib/components/ui/button";
  import { Card } from "$lib/components/ui/card";
  import {
    getSessionState,
    markSessionAuthInitiated,
    markSessionClaimed
  } from "$lib/utils/tracking";
  import { onMount } from "svelte";

  let currentState = $state("");
  let isLoading = $state(false);

  onMount(() => {
    updateState();
  });

  function updateState() {
    currentState = getSessionState();
  }

  async function handleSimulateAuth() {
    isLoading = true;
    await simulateAuthFlow();
    updateState();
    isLoading = false;
  }

  function handleInitiateAuth() {
    markSessionAuthInitiated();
    updateState();
  }

  function handleClaimAuth() {
    markSessionClaimed();
    updateState();
  }

  function handleReset() {
    resetAuthState();
    updateState();
  }

  function handleLogState() {
    logAuthState();
  }
</script>

<div class="container mx-auto py-8">
  <h1 class="mb-6 text-3xl font-bold">Auth Flow Testing</h1>

  <Card.Root class="mb-6">
    <Card.Header>
      <Card.Title>Current Auth State</Card.Title>
      <Card.Description>Test and debug the authentication flow</Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="mb-4 flex items-center gap-4">
        <span class="font-medium">Current state:</span>
        <span
          class="rounded-full px-3 py-1 text-sm font-medium"
          class:bg-red-100={currentState === "anonymous"}
          class:text-red-800={currentState === "anonymous"}
          class:bg-yellow-100={currentState === "pending"}
          class:text-yellow-800={currentState === "pending"}
          class:bg-green-100={currentState === "claimed"}
          class:text-green-800={currentState === "claimed"}
        >
          {currentState}
        </span>
      </div>

      <div class="mt-6 grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          onclick={handleInitiateAuth}
          disabled={currentState !== "anonymous"}
        >
          Initiate Auth
        </Button>

        <Button variant="outline" onclick={handleClaimAuth} disabled={currentState !== "pending"}>
          Claim Session
        </Button>

        <Button
          variant={currentState === "anonymous" ? "default" : "outline"}
          onclick={handleSimulateAuth}
          disabled={isLoading}
        >
          {isLoading ? "Running..." : "Run Full Auth Flow"}
        </Button>

        <Button variant="destructive" onclick={handleReset}>Reset Auth State</Button>

        <Button variant="secondary" onclick={handleLogState}>Log State to Console</Button>

        <Button variant="secondary" onclick={updateState}>Refresh State</Button>
      </div>
    </Card.Content>
  </Card.Root>

  <div class="text-muted-foreground mt-8 text-sm">
    <p>This page is for testing authentication flow in development environments.</p>
    <p>Open the browser console to see detailed logs during testing.</p>
  </div>
</div>
