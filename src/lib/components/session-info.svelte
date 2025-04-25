<script lang="ts">
  import { Button } from "./ui/button";
  import { Input } from "./ui/input";
  import { Label } from "./ui/label";
  import { Trash2 } from "lucide-svelte";
  import {
    deleteUserSession,
    getAppOpenHistory,
    getSessionState,
    getMigrationDetails
  } from "$lib/utils/tracking";
  import { goto } from "$app/navigation";
  import { settings } from "$lib/stores/settings";
  import { derived } from "svelte/store";
  import { onMount } from "svelte";
  import SignedIn from "clerk-sveltekit/client/SignedIn.svelte";
  import SignedOut from "clerk-sveltekit/client/SignedOut.svelte";
  import type { User } from "@clerk/backend";

  const showUsageHistory = derived(settings, ($s) => $s.showUsageHistory);

  let { userId = "N/A" }: { userId?: string } = $props();
  let deleting = $state(false);
  let usageHistoryTimestamps = $state<number[]>([]);
  let sessionState = $state<"anonymous" | "pending" | "claimed">("anonymous");

  // Function to refresh user info
  function refreshUserInfo() {
    // Get session state
    sessionState = getSessionState();
  }

  // Attempt to get user info on mount
  onMount(() => {
    refreshUserInfo();
  });

  $effect(() => {
    if (userId && userId !== "N/A") {
      usageHistoryTimestamps = getAppOpenHistory().reverse();
    } else {
      usageHistoryTimestamps = [];
    }
  });

  async function handleDeleteSession() {
    if (deleting) return;
    if (
      !window.confirm(
        "Are you sure you want to delete your anonymous session? This cannot be undone."
      )
    ) {
      return;
    }

    deleting = true;
    try {
      await deleteUserSession();
      goto("/");
    } catch (error) {
      console.error("Failed to delete session:", error);
    } finally {
      deleting = false;
    }
  }
</script>

<div class="space-y-6">
  <div class="space-y-2">
    <Label for="userIdInput" class="text-sm font-medium">User ID</Label>
    <div class="flex items-center space-x-2">
      <Input id="userIdInput" type="text" value={userId ?? "Loading..."} readonly class="flex-1" />
      <Button
        variant="destructive"
        size="icon"
        onclick={handleDeleteSession}
        title="Delete Session"
        disabled={deleting || !userId || userId === "N/A"}
      >
        <Trash2 class="h-4 w-4" />
        <span class="sr-only">Delete Session</span>
      </Button>
    </div>
    {#if sessionState === "claimed"}
      <p class="text-muted-foreground text-xs">
        This is your anonymous session ID. Data linked to your account.
      </p>
    {/if}
  </div>

  <SignedIn let:user>
    <div class="space-y-2">
      <Label for="userEmailInput" class="text-sm font-medium">Account Email</Label>
      <Input
        id="userEmailInput"
        type="text"
        value={user?.primaryEmailAddress?.emailAddress ?? "No email"}
        readonly
        class="flex-1"
      />
      <p class="text-muted-foreground text-sm">Your account is linked and ready to sync.</p>
    </div>

    <div class="space-y-2">
      <Label for="claimedUserIdInput" class="text-sm font-medium">Account ID</Label>
      <Input
        id="claimedUserIdInput"
        type="text"
        value={user?.id ?? "No ID"}
        readonly
        class="flex-1"
      />
    </div>
  </SignedIn>

  <SignedOut>
    <div class="space-y-2">
      <p class="text-muted-foreground text-sm">Sign in to view your account details.</p>
      <div class="flex gap-2">
        <Button variant="outline" onclick={() => goto("/sign-in")}>Sign In</Button>
        <Button variant="outline" onclick={() => goto("/sign-up")}>Sign Up</Button>
      </div>
    </div>
  </SignedOut>

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
    <Input id="sessionStateInput" type="text" value={sessionState} readonly class="flex-1" />
  </div>
  <div class="space-y-2">
    <Label for="authTestPage" class="text-sm font-medium">Auth Test Page</Label>
    <Button variant="outline" onclick={() => goto("/dev/auth-test")} class="w-full">
      Go to Auth Test Page
    </Button>
  </div>
</div>
