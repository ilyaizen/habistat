<script lang="ts">
  import { onMount } from "svelte";
  import {
    anonymousUserId,
    logAppOpenIfNeeded,
    getAppOpenHistory,
    hasExistingSession,
    isSessionMigrated,
    SESSION_USER_ID_KEY
  } from "$lib/utils/tracking";
  import { goto } from "$app/navigation";
  import ActivityMonitor from "$lib/components/activity-monitor.svelte";
  import * as Alert from "$lib/components/ui/alert";
  import * as Card from "$lib/components/ui/card";
  import { _ } from "svelte-i18n";
  import { getContext } from "svelte";
  import type { Writable } from "svelte/store";
  import { browser } from "$app/environment";
  import { page } from "$app/stores";

  let currentUserId = $state<string | null>(null);
  let activeDates = $state<Set<string>>(new Set());
  let fetchError = $state<string | null>(null);
  let earliestActivityDate = $state<string | null>(null);
  let loadingState = $state(true);
  let authChecked = $state(false);
  let retryCount = $state(0);
  let maxRetries = 3;

  // Get auth mode and online status from context
  const authMode = getContext<Writable<"offline" | "online">>("authMode");
  const isOnline = getContext<Writable<boolean>>("isOnline");

  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  onMount(() => {
    if (browser) {
      // Initialize immediately and retry if needed
      loadData();

      // Set up Clerk listener if available
      if (window.Clerk) {
        window.Clerk.addListener(({ user }) => {
          console.log("Clerk user change detected:", !!user);
          if (!authChecked && user) {
            loadData();
          }
        });
      }
    }
  });

  function loadData() {
    if (!browser) return;
    if (retryCount >= maxRetries) {
      console.error("Max retries reached for loading dashboard data");
      fetchError = "Failed to load dashboard after multiple attempts. Please reload the page.";
      loadingState = false;
      return;
    }

    loadingState = true;
    authChecked = true;
    retryCount++;

    console.log(`Loading dashboard data (attempt ${retryCount}/${maxRetries})...`);

    try {
      // Check if we have a valid user ID from various sources
      let userId = $anonymousUserId;

      // If no anonymous ID but we have a migrated session, get the user ID from localStorage
      if (!userId && isSessionMigrated()) {
        userId = localStorage.getItem(SESSION_USER_ID_KEY);
        console.log("Using authenticated user ID:", userId);
      }

      // Store current user ID for display purposes
      currentUserId = userId;

      // Redirect to home if no session exists
      if (!userId && !hasExistingSession()) {
        console.log("No session found, redirecting to home");
        goto("/");
        return;
      }

      // Only proceed with activity tracking if we have a valid ID
      if (userId) {
        logAppOpenIfNeeded();
        loadActivityData();
      } else {
        // If we don't have a user ID yet but have an existing session,
        // retry after a short delay (could be an auth in progress)
        setTimeout(() => {
          if (browser) loadData();
        }, 800);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      fetchError = $_("errors.dashboard_load");

      // Retry after a delay if we haven't exceeded max retries
      if (retryCount < maxRetries) {
        setTimeout(() => {
          if (browser) loadData();
        }, 1000 * retryCount); // Increase delay with each retry
      } else {
        loadingState = false;
      }
    }
  }

  function loadActivityData() {
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
</script>

<div class="flex flex-col">
  <main class="flex-1 p-4 md:p-6 lg:p-8">
    <div class="container mx-auto max-w-6xl">
      {#if browser}
        {#if loadingState}
          <div class="flex min-h-[60vh] items-center justify-center">
            <p class="text-muted-foreground text-lg">Loading dashboard...</p>
          </div>
        {:else}
          <div class="mb-6 flex items-center justify-between">
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
        <div class="flex min-h-[60vh] items-center justify-center">
          <p class="text-muted-foreground text-lg">Loading dashboard...</p>
        </div>
      {/if}
    </div>
  </main>
</div>
