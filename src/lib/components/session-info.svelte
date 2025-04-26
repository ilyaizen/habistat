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

  const showUsageHistory = derived(settings, ($s) => $s.showUsageHistory);
  const anonymousId = derived(trackedAnonymousUserId, ($id) => $id);
  const user = getContext<Readable<UserResource | null>>("clerk-user");

  let deleting = $state(false);
  let usageHistoryTimestamps = $state<number[]>([]);
  let confirmDialogOpen = $state(false);

  const sessionState = derived(sessionStore, ($session) => $session?.state ?? "anonymous");
  const associatedUserId = derived(sessionStore, ($session) => $session?.clerkUserId ?? null);
  const associatedUserEmail = derived(sessionStore, ($session) => $session?.clerkUserEmail ?? null);

  $effect(() => {
    const currentAnonymousId = get(anonymousId);
    if (currentAnonymousId) {
      const history = getAppOpenHistory();
      usageHistoryTimestamps = history ? history.reverse() : [];
    } else {
      usageHistoryTimestamps = [];
    }
  });

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

<div class="space-y-6">
  <div class="space-y-2">
    <Label for="userIdInput" class="text-sm font-medium">User ID</Label>
    <div class="flex items-center space-x-2">
      <Input
        id="userIdInput"
        type="text"
        value={$anonymousId ?? "Loading..."}
        readonly
        class="flex-1"
      />

      <AlertDialog.Root bind:open={confirmDialogOpen}>
        <AlertDialog.Trigger>
          <Button
            variant="destructive"
            size="icon"
            title="Delete Session"
            disabled={deleting || !$anonymousId}
          >
            {#if deleting}
              <span class="animate-spin">...</span>
            {:else}
              <Trash2 class="h-4 w-4" />
            {/if}
            <span class="sr-only">Delete Session</span>
          </Button>
        </AlertDialog.Trigger>

        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Delete Session?</AlertDialog.Title>
            <AlertDialog.Description>
              Are you sure you want to delete your session? This action cannot be undone and will
              clear all local data.
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action
              onclick={deleteUserSessionWithConfirm}
              class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </div>
    {#if $sessionState === "associated"}
      <p class="text-muted-foreground text-xs">
        This is your anonymous session ID. Local data is associated with your account.
      </p>
    {/if}
  </div>

  {#if $user}
    {@const typedUser = $user as UserResource | null}
    <div class="space-y-2">
      <Label for="userEmailInput" class="text-sm font-medium">Account Email</Label>
      <Input
        id="userEmailInput"
        type="text"
        value={$associatedUserEmail ?? typedUser?.primaryEmailAddress?.emailAddress ?? "No email"}
        readonly
        class="flex-1"
      />
      {#if $sessionState === "associated"}
        <p class="text-muted-foreground text-sm">Your account is linked and ready to sync.</p>
      {/if}
    </div>

    <div class="space-y-2">
      <Label for="claimedUserIdInput" class="text-sm font-medium">Account ID</Label>
      <Input
        id="claimedUserIdInput"
        type="text"
        value={$associatedUserId ?? typedUser?.id ?? "No ID"}
        readonly
        class="flex-1"
      />
    </div>
  {/if}

  {#if !$user}
    <div class="space-y-2">
      <p class="text-muted-foreground text-sm">Sign in to view your account details.</p>
      {#if $sessionState === "anonymous"}
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

  <div class="space-y-2">
    <Label for="sessionStateInput" class="text-sm font-medium">Session State</Label>
    <Input id="sessionStateInput" type="text" value={$sessionState} readonly class="flex-1" />
  </div>
</div>
