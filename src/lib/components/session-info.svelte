<!-- /**
 * SessionInfo Component
 *
 * Displays and manages user session information including:
 * - Anonymous session ID
 * - Clerk authentication status
 * - Usage history
 * - Session state debugging info
 *
 * This component handles both anonymous and authenticated states,
 * providing session management and data clearing functionality.
 */ -->

<script lang="ts">
  import { Button } from "./ui/button";
  import { Input } from "./ui/input";
  import { Label } from "./ui/label";
  import { Trash2 } from "lucide-svelte";
  import { getAppOpenHistory, sessionStore, anonymousUserId } from "$lib/utils/tracking";
  import { handleLogout } from "$lib/utils/auth";
  import { goto } from "$app/navigation";
  import { settings } from "$lib/stores/settings";
  import { derived, get, type Readable } from "svelte/store";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { getContext } from "svelte";
  import type { UserResource } from "@clerk/types";

  // Derive anonymous ID from the store for reactive updates
  const anonymousId = derived(anonymousUserId, ($id) => $id);

  // Get Clerk user context for authentication state
  const clerkUser = getContext<Readable<UserResource | null>>("clerkUser");

  // Derive session details for display and state management
  const sessionDetails = derived(sessionStore, ($session) => {
    return {
      state: $session?.state ?? "unknown",
      associatedClerkUserId: $session?.clerkUserId ?? null,
      associatedClerkEmail: $session?.clerkUserEmail ?? null,
      rawSessionState: $session?.state ?? null
    };
  });

  // Control visibility of usage history section
  const showUsageHistory = derived(settings, ($s) => $s.showUsageHistory);

  // Local state management
  let deleting = $state(false); // Tracks ongoing deletion process
  let usageHistoryTimestamps = $state<number[]>([]); // Stores app open timestamps
  let confirmDialogOpen = $state(false); // Controls visibility of confirmation dialog

  // Effect to update usage history when anonymous ID changes
  $effect(() => {
    const currentAnonymousId = get(anonymousId);
    if (currentAnonymousId) {
      const history = getAppOpenHistory();
      usageHistoryTimestamps = history ? history.reverse() : [];
    } else {
      usageHistoryTimestamps = [];
    }
  });

  /**
   * Handles user session deletion with confirmation
   * Prevents multiple simultaneous deletion attempts
   * Cleans up state after completion regardless of success/failure
   */
  async function deleteUserSessionWithConfirm() {
    if (deleting) return;

    deleting = true;
    try {
      await handleLogout();
    } catch (error) {
      console.error("Failed to delete session:", error);
    } finally {
      deleting = false;
      confirmDialogOpen = false;
    }
  }
</script>

<!-- Main component container - Only renders when Clerk user state is determined -->
{#if $clerkUser !== undefined}
  <div class="space-y-6">
    <!-- Session Information Header -->
    <div class="space-y-2">
      <Label class="text-lg">Session Information</Label>
      <p class="text-muted-foreground text-sm">
        Details about your current session, including anonymous and linked account identifiers.
      </p>
    </div>

    <!-- Anonymous Session ID Section -->
    <div class="space-y-2">
      <Label for="anonymousIdInput" class="text-sm font-medium">Session ID</Label>
      <div class="flex items-center space-x-2">
        <Input
          id="anonymousIdInput"
          type="text"
          value={$anonymousId ?? "Generating..."}
          readonly
          class="flex-1"
          aria-label="Anonymous Session ID"
        />

        <!-- Session Deletion Dialog -->
        <AlertDialog.Root bind:open={confirmDialogOpen}>
          <AlertDialog.Trigger>
            <Button
              variant="destructive"
              size="icon"
              title="Clear Local Data & Log Out"
              disabled={deleting || !$anonymousId}
            >
              <!-- Loading spinner during deletion -->
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

      <!-- Session status explanation -->
      {#if $clerkUser}
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

    <!-- Authenticated User Details Section -->
    {#if $clerkUser}
      {@const user = $clerkUser}
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
        <Label for="accountIdInput" class="text-sm font-medium">Account ID</Label>
        <Input
          id="accountIdInput"
          type="text"
          value={user.id ?? "No ID associated"}
          readonly
          class="flex-1"
          aria-label="Account ID"
        />
      </div>
    {/if}

    <!-- Anonymous User Actions Section -->
    {#if !$clerkUser}
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
    {/if}

    <!-- Usage History Section (Conditionally Rendered) -->
    {#if $showUsageHistory}
      <div class="space-y-2">
        <h3 class="text-sm font-medium">Usage History (App Opens)</h3>
        {#if usageHistoryTimestamps.length > 0}
          <ul
            class="text-muted-foreground max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-sm"
          >
            {#each usageHistoryTimestamps as timestamp}
              <li>{new Date(timestamp).toLocaleString()}</li>
            {/each}
          </ul>
        {:else}
          <p class="text-muted-foreground text-sm">No usage history recorded yet.</p>
        {/if}
      </div>
    {/if}

    <!-- Debug Information Section -->
    <div class="space-y-2">
      <Label for="sessionStateDebugInput" class="text-sm font-medium">Local Session State</Label>
      <Input
        id="sessionStateDebugInput"
        type="text"
        value={$sessionDetails.state ?? "unknown"}
        readonly
        class="flex-1"
        aria-label="Local Session State"
      />
      <p class="text-muted-foreground text-xs">
        Indicates if the local session tracker thinks it's 'anonymous' or 'associated'.
      </p>
    </div>
  </div>
{:else}
  <!-- Loading State -->
  <div class="flex items-center justify-center p-6">
    <span
      class="inline-block h-6 w-6 animate-spin rounded-full border-4 border-current border-t-transparent"
      role="status"
      aria-label="loading authentication"
    ></span>
    <span class="ml-3">Loading session...</span>
  </div>
{/if}
