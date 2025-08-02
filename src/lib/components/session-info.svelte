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
  import type { LoadedClerk, UserResource } from "@clerk/types";
  import { Trash2 } from "@lucide/svelte";
  import { getContext } from "svelte";
  // import { settings } from "$lib/stores/settings";
  import { derived, get, type Readable } from "svelte/store";
  import { SignInButton, SignUpButton, UserButton } from "svelte-clerk";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { anonymousUserId, sessionStore } from "$lib/utils/tracking";
  import { Input } from "./ui/input";
  import { Label } from "./ui/label";

  // Derive anonymous ID from the store for reactive updates
  const anonymousId = derived(anonymousUserId, ($id) => $id);

  // Get Clerk user context for authentication state
  const clerkUser = getContext<Readable<UserResource | null>>("clerkUser");

  // Get Clerk instance from Svelte context (properly typed now)
  const clerkStore = getContext<Readable<LoadedClerk | null>>("clerk");
  const clerk = derived(clerkStore, ($clerk) => $clerk);

  // Derive session details for display and state management
  const sessionDetails = derived(sessionStore, ($session) => {
    return {
      state: $session?.state ?? "unknown",
      associatedClerkUserId: $session?.clerkUserId ?? null,
      associatedClerkEmail: $session?.clerkUserEmail ?? null,
      rawSessionState: $session?.state ?? null
    };
  });

  // Local state management
  let deleting = $state(false); // Tracks ongoing deletion process
  // let usageHistoryTimestamps = $state<number[]>([]); // Stores app open timestamps
  let confirmDialogOpen = $state(false); // Controls visibility of confirmation dialog
  let signOutDialogOpen = $state(false); // Controls visibility of sign out confirmation dialog

  // Usage history state for display (if re-enabled)
  // let usageHistory: number[] = [];
  // let loadingUsageHistory = false;

  /**
   * Clears all IndexedDB databases for the app.
   * This is necessary to fully remove all client-side data.
   */
  async function clearAllIndexedDB() {
    if (!window.indexedDB) return;
    // List all databases (supported in modern browsers)
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
    } else {
      // Fallback: try to delete known DBs (if any are hardcoded)
      indexedDB.deleteDatabase("habistat-sqljs-db");
    }
  }

  /**
   * Handles user session deletion with confirmation
   * - Disassociates the session
   * - Logs out Clerk and clears cookies
   * - Deletes all app data (localStorage, sessionStorage, IndexedDB)
   * - Redirects to the frontpage for reinitiation
   */
  async function deleteUserSessionWithConfirm() {
    if (deleting) return;
    deleting = true;
    try {
      console.log("[DEBUG] Starting session deletion...");

      // 1. Clear all app data and session state first
      console.log("[DEBUG] Clearing app data...");
      sessionStore.set(null);
      localStorage.clear();
      sessionStorage.clear();
      await clearAllIndexedDB();

      // 2. Try to sign out from Clerk using the proper context
      console.log("[DEBUG] Attempting Clerk sign out...");
      const clerkInstance = get(clerk);
      console.log("[DEBUG] Clerk instance from context:", clerkInstance);
      console.log(
        "[DEBUG] Has signOut method:",
        clerkInstance && typeof clerkInstance.signOut === "function"
      );

      if (clerkInstance && typeof clerkInstance.signOut === "function") {
        try {
          console.log("[DEBUG] Calling clerkInstance.signOut()...");
          await clerkInstance.signOut();
          console.log("[DEBUG] Clerk sign out completed successfully");
        } catch (signOutError) {
          console.warn("[DEBUG] Clerk sign out failed:", signOutError);

          // Fallback: try window.Clerk if available
          if (
            typeof window !== "undefined" &&
            window.Clerk &&
            typeof window.Clerk.signOut === "function"
          ) {
            try {
              console.log("[DEBUG] Trying fallback window.Clerk.signOut()...");
              await window.Clerk.signOut();
              console.log("[DEBUG] Fallback sign out completed successfully");
            } catch (fallbackError) {
              console.warn("[DEBUG] Fallback sign out failed:", fallbackError);
            }
          }
        }
      } else {
        console.warn("[DEBUG] No valid Clerk instance available, attempting fallback methods...");

        // Try window.Clerk as fallback
        if (
          typeof window !== "undefined" &&
          window.Clerk &&
          typeof window.Clerk.signOut === "function"
        ) {
          try {
            console.log("[DEBUG] Trying window.Clerk.signOut() as fallback...");
            await window.Clerk.signOut();
            console.log("[DEBUG] Window.Clerk sign out completed successfully");
          } catch (windowError) {
            console.warn("[DEBUG] Window.Clerk sign out failed:", windowError);
          }
        }
      }

      // 3. Manual cookie cleanup as final fallback
      console.log("[DEBUG] Performing manual cookie cleanup...");
      const cookiesToClear = [
        "__session",
        "__clerk_db_jwt",
        "__clerk_db_jwt_refresh",
        "__client_uat",
        "__clerk_handshake",
        "__clerk_redirect_count",
        "__clerk_clerk_js_version",
        "__Secure-clerk-db-jwt",
        "__Host-clerk-db-jwt"
      ];

      cookiesToClear.forEach((cookieName) => {
        // biome-ignore lint/suspicious/noDocumentCookie: This is a deliberate fallback for cookie clearing.
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
        // biome-ignore lint/suspicious/noDocumentCookie: This is a deliberate fallback for cookie clearing.
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
        // biome-ignore lint/suspicious/noDocumentCookie: This is a deliberate fallback for cookie clearing.
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });

      // 4. Force a hard refresh to ensure a clean state
      console.log("[DEBUG] Forcing page refresh...");
      // Add a small delay to ensure all cleanup operations complete
      await new Promise((resolve) => setTimeout(resolve, 200));
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to delete session:", error);
      // Still attempt a refresh as a fallback
      window.location.href = "/";
    } finally {
      deleting = false;
      confirmDialogOpen = false;
      signOutDialogOpen = false;
    }
  }

  // Example: load usage history on mount (if you want to show it)
  /*
  import { onMount } from "svelte";
  onMount(async () => {
    loadingUsageHistory = true;
    usageHistory = await getAppOpenHistory();
    loadingUsageHistory = false;
  });
  */
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
          <SignInButton mode="modal">
            <Button variant="outline">Sign In</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button variant="outline">Sign Up</Button>
          </SignUpButton>
        </div>
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

    <!-- Clerk Session Info Card (separate section) -->
    {#if $clerkUser}
      {@const user = $clerkUser}
      <div class="mb-2">
        <Label class="text-base font-semibold">Clerk Session Info</Label>
      </div>
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
      <div class="space-y-2">
        <Label for="avatarUrlInput" class="text-sm font-medium">Avatar URL</Label>
        <Input
          id="avatarUrlInput"
          type="text"
          value={user.imageUrl ?? "No avatar"}
          readonly
          class="flex-1"
          aria-label="Avatar URL"
        />
      </div>
    {/if}
    <div class="flex gap-2">
      <UserButton />
      <!-- Sign out button for signed-in users -->
      <AlertDialog.Root bind:open={signOutDialogOpen}>
        <AlertDialog.Trigger>
          <Button variant="outline">Sign Out</Button>
        </AlertDialog.Trigger>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Sign Out & Clear Data?</AlertDialog.Title>
            <AlertDialog.Description>
              This will sign you out and clear all local data associated with your session. Are you
              sure?
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action
              onclick={deleteUserSessionWithConfirm}
              class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sign Out & Clear Data
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>
      <!-- <Button variant="outline" onclick={() => goto("/settings")}>Settings</Button> -->
    </div>

    <!--
    <div class="space-y-2 mt-4">
      <h3 class="text-sm font-medium">Usage History (App Opens)</h3>
      {#if loadingUsageHistory}
        <p class="text-muted-foreground text-sm">Loading...</p>
      {:else if usageHistory.length > 0}
        <ul class="text-muted-foreground max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
          {#each usageHistory as timestamp}
            <li>{new Date(timestamp).toLocaleString()}</li>
          {/each}
        </ul>
      {:else}
        <p class="text-muted-foreground text-sm">No usage history recorded yet.</p>
      {/if}
    </div>
    -->
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
