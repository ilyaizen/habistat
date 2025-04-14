<script lang="ts">
  import { onMount } from "svelte";
  import {
    anonymousUserId,
    logAppOpenIfNeeded,
    getAppOpenHistory,
    hasExistingSession
  } from "$lib/utils/tracking";
  import { goto } from "$app/navigation";
  import ActivityMonitor from "$lib/components/activity-monitor.svelte";
  import * as Alert from "$lib/components/ui/alert";
  import * as Card from "$lib/components/ui/card";
  import { _, isLoading } from "svelte-i18n";
  import { getContext } from "svelte";
  import type { Writable } from "svelte/store";
  import { browser } from "$app/environment";
  import { page } from "$app/stores";

  let currentUserId = $state<string | null>(null);
  let activeDates = $state<Set<string>>(new Set());
  let fetchError = $state<string | null>(null);
  let earliestActivityDate = $state<string | null>(null);

  // Get auth mode from context
  const authMode = getContext<Writable<"offline" | "online">>("authMode");

  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Check session and redirect if needed
  $effect(() => {
    if (browser) {
      const userId = $anonymousUserId;
      currentUserId = userId;

      // Redirect to home if no session exists
      if (!userId || !hasExistingSession()) {
        const lang = $page.params.lang;
        goto(lang ? `/${lang}` : `/`);
        return;
      }

      // Only proceed with activity tracking if we have a valid session
      logAppOpenIfNeeded();
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
      } catch (error) {
        console.error("Failed to fetch or process activity history:", error);
        fetchError = $_("errors.activity_load");
        activeDates = new Set();
      }
    }
  });
</script>

<div class="flex flex-col">
  <main class="flex-1 p-4 md:p-6 lg:p-8">
    <div class="container mx-auto max-w-6xl">
      {#if browser}
        {#if $isLoading}
          <p class="text-muted-foreground text-lg">Loading...</p>
        {:else}
          <div class="mb-6 flex items-center justify-between">
            <h1 class="text-3xl font-bold">{$_("dashboard.title")}</h1>
          </div>

          {#if fetchError}
            <Alert.Root variant="destructive" class="mb-4">
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
        {/if}
      {:else}
        <p class="text-muted-foreground text-lg">Loading dashboard...</p>
      {/if}
    </div>
  </main>
</div>
