<script lang="ts">
  import { onMount } from "svelte";
  import { SvelteDate } from "svelte/reactivity";
  import { get } from "svelte/store";
  import { Card, CardContent, CardHeader } from "$lib/components/ui/card";
  import { Label } from "$lib/components/ui/label";
  import Switch from "$lib/components/ui/switch/switch.svelte";
  import { type Completion, completionsStore } from "$lib/stores/completions";
  import { settings } from "$lib/stores/settings";
  import { getAppOpenHistory } from "$lib/utils/tracking";

  // Local state for completions
  const completions = $state<Completion[]>([]);
  let loadingCompletions = $state(false);

  // State for usage history
  let usageHistoryTimestamps = $state<number[]>([]);
  let loadingUsageHistory = $state(false);
  let activeDatesSet = $state(new Set<string>());

  /**
   * Helper function to format a Date object into a 'YYYY-MM-DD' string.
   * This uses the local timezone.
   */
  function formatLocalDate(date: SvelteDate): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Load data on mount if settings are enabled
  onMount(async () => {
    if ($settings.verboseLogs) {
      await loadCompletions();
    }
    if ($settings.showUsageHistory) {
      await loadUsageHistory();
    }
  });

  $effect(() => {
    if ($settings.verboseLogs) loadCompletions();
  });

  $effect(() => {
    if ($settings.showUsageHistory) loadUsageHistory();
  });

  async function loadCompletions() {
    loadingCompletions = true;
    completions.length = 0;
    completions.push(...get(completionsStore));
    if (completions.length === 0 && completionsStore.refresh) {
      await completionsStore.refresh();
      completions.length = 0;
      completions.push(...get(completionsStore));
    }
    loadingCompletions = false;
  }

  /**
   * Asynchronously loads app open history and formats it for display.
   */
  async function loadUsageHistory() {
    loadingUsageHistory = true;
    usageHistoryTimestamps = await getAppOpenHistory();
    // Use the local date formatter to prevent timezone issues.
    activeDatesSet = new Set(
      usageHistoryTimestamps.map((ts) => formatLocalDate(new SvelteDate(ts)))
    );
    usageHistoryTimestamps = usageHistoryTimestamps.slice().reverse(); // Show most recent first
    loadingUsageHistory = false;
  }
</script>

<Card>
  <CardHeader>
    <Label class="text-lg">App Settings</Label>
  </CardHeader>
  <CardContent class="space-y-4">
    <!-- Developer Mode Toggle -->
    <div class="flex items-center justify-between">
      <Label for="devmode">Dev Mode</Label>
      <Switch id="devmode" bind:checked={$settings.developerMode} />
    </div>
    {#if $settings.developerMode}
      <!-- Conditional UI for developer-only settings -->
      <div class="flex items-center justify-between">
        <Label for="show-usage-history" class="text-sm">Show Usage History</Label>
        <Switch id="show-usage-history" bind:checked={$settings.showUsageHistory} />
      </div>
      <!-- Verbose Logs Toggle -->
      <div class="flex items-center justify-between">
        <Label for="verbose-logs" class="text-sm">Verbose Logs</Label>
        <Switch id="verbose-logs" bind:checked={$settings.verboseLogs} />
      </div>
      {#if $settings.showUsageHistory}
        <!-- Usage History Display -->
        <div class="mt-4">
          <h3 class="mb-2 text-lg font-medium">Usage History</h3>
          {#if loadingUsageHistory}
            <p>Loading usage history...</p>
          {:else if usageHistoryTimestamps.length > 0}
            <div class="mt-2 space-y-2">
              <p class="text-sm text-gray-600">
                App opened on {activeDatesSet.size} unique days, {usageHistoryTimestamps.length} times
                total.
              </p>
              <ul class="mt-2 space-y-1 text-sm text-gray-500">
                {#each usageHistoryTimestamps.slice(0, 10) as timestamp (timestamp)}
                  <li>
                    <span class="font-mono text-xs"
                      >{new SvelteDate(timestamp).toLocaleString()}</span
                    >
                  </li>
                {/each}
                {#if usageHistoryTimestamps.length > 10}
                  <li class="text-xs italic">...and {usageHistoryTimestamps.length - 10} more</li>
                {/if}
              </ul>
            </div>
          {:else}
            <p>No usage history recorded yet.</p>
          {/if}
        </div>
      {/if}
      {#if $settings.verboseLogs}
        <!-- Verbose Completions History -->
        <div class="mt-4">
          <h3 class="mb-2 text-lg font-medium">All Completions History</h3>
          {#if loadingCompletions}
            <p>Loading completions...</p>
          {:else if completions.length > 0}
            <ul class="mt-2 space-y-1 text-sm text-gray-500">
              {#each completions as c (c.id)}
                <li>
                  <span class="font-mono text-xs"
                    >{new SvelteDate(c.completedAt).toLocaleString()}</span
                  >
                  - Habit: <span class="font-semibold">{c.habitId}</span>
                  {#if c.userId}
                    - User: {c.userId}
                  {/if}
                </li>
              {/each}
            </ul>
          {:else}
            <p>No completions recorded yet.</p>
          {/if}
        </div>
      {/if}
    {/if}
  </CardContent>
</Card>
