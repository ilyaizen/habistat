<script lang="ts">
  import { Button } from "./ui/button";
  import { Input } from "./ui/input";
  import { Label } from "./ui/label";
  import { Trash2 } from "lucide-svelte";
  import { page } from "$app/stores";
  import { getAppOpenHistory, sessionStore, anonymousUserId } from "$lib/utils/tracking";
  import { handleLogout } from "$lib/utils/auth";
  import { goto } from "$app/navigation";
  import { settings } from "$lib/stores/settings";
  import { derived, get, type Readable, writable } from "svelte/store";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { SignedIn, SignedOut } from "svelte-clerk";
  import type { UserResource } from "@clerk/types";
  import { getContext } from "svelte";

  // Get the reactive user store from context
  const clerkUser = getContext<Readable<UserResource | null>>("clerk-user");

  // Derive anonymous ID directly from the tracking store's exported anonymousUserId store
  const anonymousId = derived(anonymousUserId, ($id) => $id);

  // Derive session details based *only* on the local session store now.
  // Association status is handled implicitly by SignedIn/SignedOut components.
  const sessionDetails = derived(sessionStore, ($session) => {
    // Reflect the state stored locally ('anonymous', 'associated', 'unknown')
    return {
      state: $session?.state ?? "unknown",
      // Get Clerk User ID *persisted* in the local session (might be stale)
      associatedClerkUserId: $session?.clerkUserId ?? null,
      // Get Clerk User Email *persisted* in the local session (might be stale)
      associatedClerkEmail: $session?.clerkUserEmail ?? null,
      // Raw state from local session store
      rawSessionState: $session?.state ?? null
    };
  });

  // Derive visibility setting for usage history from the global settings store
  const showUsageHistory = derived(settings, ($s) => $s.showUsageHistory);

  // Reactive state for component-specific logic
  let deleting = $state(false); // Flag to prevent multiple deletion attempts
  let usageHistoryTimestamps = $state<number[]>([]); // Stores app open timestamps
  let confirmDialogOpen = $state(false); // Controls the visibility of the confirmation dialog

  // Effect to load usage history when the anonymousId becomes available or changes
  $effect(() => {
    const currentAnonymousId = get(anonymousId); // Get the current value non-reactively
    if (currentAnonymousId) {
      const history = getAppOpenHistory(); // Fetch history from local storage
      // Reverse history to display the most recent opens first
      usageHistoryTimestamps = history ? history.reverse() : [];
    } else {
      // Clear history if there's no anonymous ID (e.g., initial load, after clearing data)
      usageHistoryTimestamps = [];
    }
  });

  // Log page data on component mount for inspection
  $effect(() => {
    console.log("[SessionInfo] $page.data:", $page.data);
  });

  /**
   * Handles the confirmation and execution of the user/session data deletion.
   * Calls the shared logout handler which clears Clerk session and local session data.
   */
  async function deleteUserSessionWithConfirm() {
    if (deleting) return; // Prevent concurrent deletion requests

    deleting = true; // Set deleting flag
    try {
      // Use the shared logout handler which signs out of Clerk and clears sessionStore
      await handleLogout();
    } catch (error) {
      // Log any errors during the logout/deletion process
      console.error("Failed to delete session:", error);
      // TODO: Optionally show user feedback here (e.g., toast notification)
    } finally {
      // Reset deleting flag and close the dialog regardless of success/failure
      deleting = false;
      confirmDialogOpen = false;
    }
  }
</script>

<div class="space-y-6">
  <div class="space-y-2">
    <Label class="text-lg">Session Information</Label>
    <p class="text-muted-foreground text-sm">
      Details about your current session, including anonymous and linked account identifiers.
    </p>
  </div>
  <!-- Always show Session ID -->
  <div class="space-y-2">
    <Label for="anonymousIdInput" class="text-sm font-medium">Session ID</Label>
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
    <!-- Use context store to show status -->
    {#if $clerkUser === undefined}
      <p class="text-muted-foreground text-xs">Checking authentication status...</p>
    {:else if $clerkUser}
      <p class="text-muted-foreground text-xs">
        This session ID is linked to your signed-in account (details below).
      </p>
    {:else}
      <p class="text-muted-foreground text-xs">
        You are currently anonymous. Signing in will link this ID to your account.
      </p>
    {/if}
    <noscript>
      <p class="text-muted-foreground text-xs">Sign-in status requires JavaScript.</p>
    </noscript>
  </div>

  <!-- Clerk Authenticated User Info -->
  <SignedIn>
    {#if $clerkUser}
      <div class="space-y-2">
        <Label for="accountEmailInput" class="text-sm font-medium">Account Email</Label>
        <Input
          id="accountEmailInput"
          type="text"
          value={$clerkUser.primaryEmailAddress?.emailAddress ?? "No email associated"}
          readonly
          class="flex-1"
          aria-label="Account Email"
        />
      </div>

      <div class="space-y-2">
        <Label for="accountIdInput" class="text-sm font-medium">Account ID</Label>
        <Input
          id="accountIdInput"
          type="text"
          value={$clerkUser.id ?? "No ID associated"}
          readonly
          class="flex-1"
          aria-label="Account ID"
        />
        <p class="text-muted-foreground text-sm">Account linked to the session ID above.</p>
      </div>
    {:else}
      <!-- Optional: Show loading or error if SignedIn but context is null -->
      <p class="text-muted-foreground text-xs">Loading user details...</p>
    {/if}
  </SignedIn>

  <!-- Sign In/Up Buttons (Only show if NOT logged in via Clerk) -->
  <!-- Use context store check instead of ClerkLoaded -->
  {#if $clerkUser === null}
    <SignedOut>
      <div class="space-y-2">
        <p class="text-muted-foreground text-sm">You are not signed in.</p>
        {#if $sessionDetails.state === "anonymous" && $anonymousId}
          <p class="text-muted-foreground text-xs">
            You have local data stored under the session ID shown above. Signing in will associate
            this data with your account.
          </p>
        {/if}
        <div class="flex gap-2">
          <Button variant="outline" onclick={() => goto("/sign-in")}>Sign In</Button>
          <Button variant="outline" onclick={() => goto("/sign-up")}>Sign Up</Button>
        </div>
      </div>
    </SignedOut>
  {/if}
  <noscript>
    <div class="space-y-2">
      <p class="text-muted-foreground text-sm">Sign-in/Sign-up requires JavaScript.</p>
    </div>
  </noscript>

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
    <Label for="sessionStateDebugInput" class="text-sm font-medium">Session State</Label>
    <Input
      id="sessionStateDebugInput"
      type="text"
      value={$sessionDetails.state ?? "unknown"}
      readonly
      class="flex-1"
      aria-label="Local Session State"
    />
    <p class="text-muted-foreground text-xs">
      Indicates if the session is 'anonymous' or 'associated' (linked to your signed-in account).
    </p>
  </div>
</div>
