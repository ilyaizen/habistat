<script lang="ts">
  import { onMount } from "svelte";
  import {
    logAppOpenIfNeeded,
    getAppOpenHistory,
    getAssociatedUserId,
    anonymousUserId,
    sessionStore,
    markSessionAssociated,
    type UserSession
  } from "$lib/utils/tracking";
  import { goto } from "$app/navigation";
  import ActivityMonitor from "$lib/components/activity-monitor.svelte";
  import * as Alert from "$lib/components/ui/alert";
  import * as Card from "$lib/components/ui/card";
  import { _ } from "svelte-i18n";
  import type { Writable, Readable } from "svelte/store";
  import { browser } from "$app/environment";
  import { get } from "svelte/store";
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
      // onMount is now simpler, effect handles loading
      console.log("[Dashboard onMount] Component mounted.");
    }
  });

  function loadActivityData() {
    // Ensure browser context for localStorage access in getAppOpenHistory
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

  // Reactive effect to load data when user/session state is ready
  $effect(() => {
    if (!browser) return; // Don't run on server

    const user = $userStore;
    const session = $sessionStore;

    console.log(
      `[Dashboard Effect Run] User: ${user?.id ?? "null"}, Session: ${session?.id ?? "null"} (${session?.state ?? "unknown"})`
    );

    // Wait until session is loaded/initialized
    if (!session) {
      console.log("[Dashboard Effect] Waiting for session store to initialize...");
      loadingState = true; // Keep showing loading until session is ready
      return;
    }

    let userIdToUse: string | null = null;
    let needsActivityLoad = false;

    // --- Perform Association Check ---
    if (user?.id && session.state === "anonymous") {
      console.log(
        `[Dashboard Effect Action] User found and session anonymous. Calling markSessionAssociated for user ${user.id}`
      );
      markSessionAssociated(user.id, user.primaryEmailAddress?.emailAddress);

      // IMPORTANT: After marking, the $sessionStore dependency *should* re-trigger this effect.
      // The *next* run of the effect will hopefully have session.state === 'associated'.
      // We don't proceed to load data in *this* run to avoid race conditions.
      loadingState = true; // Keep loading while waiting for association to reflect
    }

    // --- Determine User ID to Use ---
    if (user?.id && session.state === "associated") {
      // User logged in, session associated
      userIdToUse = user.id;
      console.log(`[Dashboard Effect] Using Clerk User ID: ${userIdToUse}`);
      needsActivityLoad = true;
    } else if (!user?.id && session.state === "anonymous") {
      // User logged out (or never logged in), session is anonymous
      userIdToUse = session.id; // Use anonymous ID
      console.log(`[Dashboard Effect] Using Anonymous Session ID: ${userIdToUse}`);
      needsActivityLoad = true;
    } else if (!user?.id && session.state === "associated") {
      // Edge case: User logged out, but session *was* associated. Treat as anonymous for now.
      // This might happen if logout clears Clerk user before session state clears.
      // Consider clearing session fully on logout via handleLogout in auth.ts.
      userIdToUse = session.id; // Fallback to anonymous ID
      console.warn(
        `[Dashboard Effect] User logged out but session still 'associated'. Using anonymous ID: ${userIdToUse}`
      );
      needsActivityLoad = true;
    } else {
      // Still waiting for user, or other invalid state
      console.log("[Dashboard Effect] Waiting for valid user/session state combination.");
      loadingState = true; // Keep loading
    }

    // --- Set currentUserId and Load Data if Ready ---
    if (userIdToUse) {
      currentUserId = userIdToUse;
      if (needsActivityLoad) {
        console.log(`[Dashboard Effect] Loading activity data for user: ${currentUserId}`);
        logAppOpenIfNeeded(); // Log app open for the determined user
        loadActivityData(); // Load data for the determined user (already sets loadingState = false)
      } else {
        loadingState = false; // Ensure loading stops if activity load isn't needed but user is determined
      }
    } else {
      // If no userIdToUse could be determined, potentially redirect or show error
      console.error(
        "[Dashboard Effect] Could not determine a valid user ID. Redirecting to sign-in."
      );
      loadingState = false; // Stop loading before redirect
      goto("/sign-in", { replaceState: true });
    }
  });

  // Helper function reused by loadActivityData
  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
