<script lang="ts">
  import { Button } from "./ui/button";
  import { Input } from "./ui/input";
  import { Label } from "./ui/label";
  import { Trash2 } from "lucide-svelte";
  import {
    getAppOpenHistory,
    sessionStore,
    anonymousUserId as trackedAnonymousUserId
  } from "$lib/utils/tracking";
  import { handleLogout } from "$lib/utils/auth";
  import { goto } from "$app/navigation";
  import { settings } from "$lib/stores/settings";
  import { derived, get, type Readable } from "svelte/store";
  import { getContext } from "svelte";
  import type { UserResource } from "@clerk/types";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";

  // Clerk user state from context - primary source of truth for authentication
  const clerkUser = getContext<Readable<UserResource | null>>("clerk-user");

  // Derive anonymous ID directly from the tracking store
  const anonymousId = derived(trackedAnonymousUserId, ($id) => $id);

  // Derive session details (state, linked IDs) from the tracking store
  const sessionDetails = derived(sessionStore, ($session) => ({
    state: $session?.state ?? "anonymous",
    associatedClerkUserId: $session?.clerkUserId ?? null,
    associatedClerkEmail: $session?.clerkUserEmail ?? null
  }));

  const showUsageHistory = derived(settings, ($s) => $s.showUsageHistory);

  // Reactive state for component logic
  let deleting = $state(false);
  let usageHistoryTimestamps = $state<number[]>([]);
  let confirmDialogOpen = $state(false);

  // Load usage history when anonymousId is available
  $effect(() => {
    const currentAnonymousId = get(anonymousId);
    if (currentAnonymousId) {
      const history = getAppOpenHistory();
      // Reverse history to show most recent first
      usageHistoryTimestamps = history ? history.reverse() : [];
    } else {
      // Clear history if no anonymous ID (e.g., during initial load or after clearing)
      usageHistoryTimestamps = [];
    }
  });

  // Function to handle deletion confirmation and logout
  async function deleteUserSessionWithConfirm() {
    if (deleting) return;

    deleting = true;
    try {
      // Use the shared logout handler which signs out of Clerk and clears sessionStore
      await handleLogout();
    } catch (error) {
      console.error("Failed to delete session:", error);
      // Optionally show user feedback here
    } finally {
      deleting = false;
      confirmDialogOpen = false;
    }
  }
</script>

<div class="space-y-6">
  <!-- Always show Anonymous Session ID -->
  <div class="space-y-2">
    <Label for="anonymousIdInput" class="text-sm font-medium">Anonymous Session ID</Label>
    <div class="flex items-center space-x-2">
      <Input
        id="anonymousIdInput"
        type="text"
        value={$anonymousId ?? "Loading..."}
        readonly
        class="flex-1"
        aria-label="Anonymous Session ID"
      />

      <!-- Delete/Logout Button -->
      <AlertDialog.Root bind:open={confirmDialogOpen}>
        <AlertDialog.Trigger>
          <Button
            variant="destructive"
            size="icon"
            title="Clear Local Data & Log Out"
            disabled={deleting || !anonymousId}
          >
            {#if deleting}
              <span
                class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                role="status"
                aria-label="deleting"
              ></span>
            {:else}
              <Trash2 class="h-4 w-4" />
            {/if}
            <span class="sr-only">Clear Local Data & Log Out</span>
          </Button>
        </AlertDialog.Trigger>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Clear Data & Log Out?</AlertDialog.Title>
            <AlertDialog.Description>
              This will clear your session and any associated local data. Are you sure?
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action
              onclick={deleteUserSessionWithConfirm}
              class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </div>
    {#if $sessionDetails.state === "associated"}
      <p class="text-muted-foreground text-xs">
        This anonymous ID is linked to your account ({$sessionDetails.associatedClerkEmail ??
          $sessionDetails.associatedClerkUserId ??
          "..."}).
      </p>
    {:else if !$clerkUser}
      <p class="text-muted-foreground text-xs">
        You are currently anonymous. Signing in will link this ID to your account.
      </p>
    {/if}
  </div>

  <!-- Clerk Authenticated User Info -->
  {#if $clerkUser}
    {@const user = $clerkUser} // Ensure type safety
    <div class="space-y-2">
      <Label for="accountEmailInput" class="text-sm font-medium">Account Email</Label>
      <Input
        id="accountEmailInput"
        type="text"
        value={user.primaryEmailAddress?.emailAddress ?? "No email associated"}
        readonly
        class="flex-1"
        aria-label="Account Email"
      />
    </div>

    <div class="space-y-2">
      <Label for="accountIdInput" class="text-sm font-medium">Account ID (Clerk)</Label>
      <Input
        id="accountIdInput"
        type="text"
        value={user.id}
        readonly
        class="flex-1"
        aria-label="Account ID"
      />
      {#if $sessionDetails.state === "associated"}
        <p class="text-muted-foreground text-sm">Account linked to the anonymous session above.</p>
      {:else}
        <p class="text-warning-foreground text-sm">
          Warning: Logged in, but session association pending or failed. Local data might not be
          linked.
        </p>
      {/if}
    </div>

    <!-- Sign In/Up Buttons (Only show if NOT logged in via Clerk) -->
  {:else}
    <div class="space-y-2">
      <p class="text-muted-foreground text-sm">You are not signed in.</p>
      {#if $sessionDetails.state === "anonymous" && $anonymousId}
        <p class="text-muted-foreground text-xs">
          You have local data stored under the anonymous ID shown above. Signing in will associate
          this data with your account.
        </p>
      {/if}
      <div class="flex gap-2">
        <Button variant="outline" onclick={() => goto("/sign-in")}>Sign In</Button>
        <Button variant="outline" onclick={() => goto("/sign-up")}>Sign Up</Button>
      </div>
    </div>
  {/if}

  <!-- Usage History (Conditional) -->
  {#if $showUsageHistory}
    <div class="space-y-2">
      <h3 class="text-sm font-medium">Usage History (App Opens)</h3>
      {#if usageHistoryTimestamps.length > 0}
        <ul class="text-muted-foreground max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
          {#each usageHistoryTimestamps as timestamp}
            <li>{new Date(timestamp).toLocaleString()}</li>
          {/each}
        </ul>
      {:else}
        <p class="text-muted-foreground text-sm">No usage history recorded yet.</p>
      {/if}
    </div>
  {/if}

  <!-- Session State (Debug Info) -->
  <div class="space-y-2">
    <Label for="sessionStateDebugInput" class="text-sm font-medium">Session State (Debug)</Label>
    <Input
      id="sessionStateDebugInput"
      type="text"
      value={$sessionDetails.state}
      readonly
      class="flex-1"
      aria-label="Local Session State Debug"
    />
    <p class="text-muted-foreground text-xs">
      Indicates if the anonymous ID is marked as 'associated' in local storage.
    </p>
  </div>
</div>
