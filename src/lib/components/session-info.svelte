<script lang="ts">
  import { Button } from "./ui/button";
  import { Input } from "./ui/input";
  import { Label } from "./ui/label";
  import { Trash2 } from "lucide-svelte";
  import { deleteUserSession, getAppOpenHistory } from "$lib/utils/tracking";
  import { goto } from "$app/navigation";
  import { settings } from "$lib/stores/settings";
  import { derived } from "svelte/store";

  const showUsageHistory = derived(settings, ($s) => $s.showUsageHistory);

  let { userId = "N/A" }: { userId?: string } = $props();
  let deleting = $state(false);
  let usageHistoryTimestamps = $state<number[]>([]);

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
  </div>

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
</div>

<style>
  /* Add any specific styles if needed */
</style>
