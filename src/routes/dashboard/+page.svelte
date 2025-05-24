<script lang="ts">
  import { onMount } from "svelte";
  import { logAppOpenIfNeeded, getAppOpenHistory, sessionStore } from "$lib/utils/tracking";
  import { goto } from "$app/navigation";
  import ActivityMonitor from "$lib/components/activity-monitor-old.svelte";
  import * as Alert from "$lib/components/ui/alert";
  import * as Card from "$lib/components/ui/card";
  import { _ } from "svelte-i18n";
  import type { Writable, Readable } from "svelte/store";
  import { browser } from "$app/environment";
  import type { UserResource } from "@clerk/types";
  import { getContext } from "svelte";

  let currentUserId = $state<string | null>(null);
  let activeDates = $state<Set<string>>(new Set());
  let earliestActivityDate = $state<string | null>(null);
  let fetchError = $state<string | null>(null);
  let loadingState = $state(true);

  // Get auth mode and online status from context
  const authMode = getContext<Writable<"offline" | "online">>("authMode");
  const isOnline = getContext<Writable<boolean>>("isOnline");
  // Get user store from context
  const userStore = getContext<Readable<UserResource | null> | undefined>("clerk-user");

  onMount(() => {
    if (browser) {
      console.log("[Dashboard onMount] Component mounted.");
    }
  });

  function loadActivityData() {
    if (!browser) return;
    try {
      const historyTimestamps = getAppOpenHistory();
      const dates = new Set<string>();
      let minTimestamp = Infinity;

      if (historyTimestamps.length > 0) {
        for (const ts of historyTimestamps) {
          dates.add(formatDate(new Date(ts)));
          if (ts < minTimestamp) {
            minTimestamp = ts;
          }
        }
        earliestActivityDate = formatDate(new Date(minTimestamp));
      } else {
        earliestActivityDate = null;
      }

      activeDates = dates;
      fetchError = null;
      loadingState = false;
    } catch (error) {
      console.error("Failed to process activity history:", error);
      fetchError = $_("errors.activity_load");
      activeDates = new Set();
      loadingState = false;
    }
  }

  $effect(() => {
    if (!browser) return;

    const user = $userStore;
    const session = $sessionStore;

    if (!session) {
      loadingState = true;
      return;
    }

    let userIdToUse: string | null = null;
    let needsActivityLoad = false;

    if (user?.id && session.state === "associated") {
      userIdToUse = user.id;
      needsActivityLoad = true;
    } else if (!user?.id && session.state === "anonymous") {
      userIdToUse = session.id;
      needsActivityLoad = true;
    } else if (!user?.id && session.state === "associated") {
      userIdToUse = session.id;
      needsActivityLoad = true;
    } else {
      loadingState = true;
    }

    if (userIdToUse) {
      currentUserId = userIdToUse;
      if (needsActivityLoad) {
        logAppOpenIfNeeded();
        loadActivityData();
      } else {
        loadingState = false;
      }
    } else {
      loadingState = false;
      goto("/sign-in", { replaceState: true });
    }
  });

  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
</script>

{#if browser}
  {#if loadingState}
    <div class="flex items-center justify-center">
      <p class="text-muted-foreground text-lg">Loading dashboard...</p>
    </div>
  {:else}
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold">{$_("dashboard.title")}</h1>
        {#if !$isOnline && $authMode === "online"}
          <Alert.Root variant="destructive" class="max-w-md">
            <Alert.Description>
              You are currently offline. Your data will be stored locally and synced when you're
              back online.
            </Alert.Description>
          </Alert.Root>
        {/if}
      </div>

      {#if fetchError}
        <Alert.Root variant="destructive">
          <Alert.Title>{$_("common.error")}</Alert.Title>
          <Alert.Description>{fetchError}</Alert.Description>
        </Alert.Root>
      {/if}

      {#if currentUserId && !fetchError}
        <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card.Root class="md:col-span-3">
            <Card.Header>
              <Card.Title class="text-xl">{$_("dashboard.activity_title")}</Card.Title>
            </Card.Header>
            <Card.Content>
              {#if activeDates.size > 0}
                <ActivityMonitor {activeDates} sessionStartDate={earliestActivityDate} />
              {:else}
                <p class="text-muted-foreground">{$_("dashboard.no_activity")}</p>
              {/if}
            </Card.Content>
          </Card.Root>
        </div>
      {/if}
    </div>
  {/if}
{:else}
  <div class="flex items-center justify-center">
    <p class="text-muted-foreground text-lg">Loading dashboard...</p>
  </div>
{/if}
