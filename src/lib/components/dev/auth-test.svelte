<script lang="ts">
  // Import necessary functions and components for authentication testing
  import { simulateAuthFlow, resetAuthState, logAuthState } from "$lib/utils/test-auth-flow";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import {
    getSessionState,
    markSessionAuthInitiated,
    markSessionClaimed
  } from "$lib/utils/tracking";
  import { onMount } from "svelte";

  // State variable to hold the current authentication state ('anonymous', 'pending', 'claimed')
  let currentState = $state("");
  // State variable to track if an authentication simulation is in progress
  let isLoading = $state(false);

  // Fetch the initial authentication state when the component mounts
  onMount(() => {
    updateState();
  });

  // Function to update the currentState variable by fetching the latest session state
  function updateState() {
    currentState = getSessionState();
  }

  // Asynchronous function to handle the simulation of the full authentication flow
  async function handleSimulateAuth() {
    isLoading = true; // Set loading state to true
    await simulateAuthFlow(); // Run the simulation
    updateState(); // Update the displayed state
    isLoading = false; // Set loading state back to false
  }

  // Function to manually mark the session as having initiated authentication
  function handleInitiateAuth() {
    markSessionAuthInitiated(); // Update the tracking state
    updateState(); // Update the displayed state
  }

  // Function to manually mark the session as claimed (authenticated)
  function handleClaimAuth() {
    markSessionClaimed(); // Update the tracking state
    updateState(); // Update the displayed state
  }

  // Function to reset the authentication state back to the initial anonymous state
  function handleReset() {
    resetAuthState(); // Reset the tracking state
    updateState(); // Update the displayed state
  }

  // Function to log the current detailed authentication state to the browser console
  function handleLogState() {
    logAuthState();
  }
</script>

<!-- Component Root Container -->
<div class="mt-6">
  <!-- Card component for displaying the auth test controls -->
  <Card.Root>
    <Card.Header>
      <!-- Card Title -->
      <Card.Title>Auth Flow Testing</Card.Title>
      <!-- Card Description -->
      <Card.Description>Test and debug the local anonymous session flow.</Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Display the current authentication state -->
      <div class="mb-4 flex items-center gap-4">
        <span class="font-medium">Current state:</span>
        <!-- Dynamically styled badge indicating the state -->
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

      <!-- Grid layout for action buttons -->
      <div class="mt-6 grid grid-cols-2 gap-4">
        <!-- Button to initiate the authentication process -->
        <Button
          variant="outline"
          onclick={handleInitiateAuth}
          disabled={currentState !== "anonymous"}
        >
          Initiate Auth (Set Pending)
        </Button>

        <!-- Button to mark the session as claimed -->
        <Button variant="outline" onclick={handleClaimAuth} disabled={currentState !== "pending"}>
          Claim Session (Set Claimed)
        </Button>

        <!-- Button to run the full authentication flow simulation -->
        <!-- Note: This simulation might need updates depending on how Clerk integrates -->
        <!-- <Button
          variant={currentState === "anonymous" ? "default" : "outline"}
          onclick={handleSimulateAuth}
          disabled={isLoading || currentState !== 'anonymous'}
        >
          {isLoading ? "Running..." : "Simulate Full Auth Flow"}
        </Button> -->

        <!-- Button to reset the authentication state -->
        <Button variant="destructive" onclick={handleReset}>Reset Auth State</Button>

        <!-- Button to log the current state to the console -->
        <Button variant="secondary" onclick={handleLogState}>Log State to Console</Button>

        <!-- Button to manually refresh the displayed state -->
        <Button variant="secondary" onclick={updateState}>Refresh State</Button>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Informational text about the purpose of this component -->
  <div class="text-muted-foreground mt-4 text-sm">
    <p>Use these controls to manually test local anonymous session states.</p>
    <p>Open the browser console for detailed logs.</p>
  </div>
</div>
