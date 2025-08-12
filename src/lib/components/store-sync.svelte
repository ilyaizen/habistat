<!--
  Store Sync Component
  Handles synchronization of stores with user authentication state and cloud sync.
  Uses Svelte 5 $effect to react to page data changes and Clerk auth state.
-->
<script lang="ts">
  // Centralized debug flag
  import { DEBUG_VERBOSE } from "$lib/utils/debug";

  import type { UserResource } from "@clerk/types";
  import { getContext, onDestroy, onMount } from "svelte";
  import type { Readable } from "svelte/store";
  import { browser } from "$app/environment";
  // For page data
  import { page } from "$app/stores";
  import { authState } from "$lib/stores/auth-state";
  import { calendarsStore } from "$lib/stores/calendars";
  import { habits } from "$lib/stores/habits";
  import { syncStore } from "$lib/stores/sync-stores";

  // Get Clerk user from context with safe fallback
  const clerkUserStore = getContext<Readable<UserResource | null>>("clerkUser") || undefined;

  let currentUserId: string | null = null;
  let hasShownMigrationToast = false;
  // Prime initial emission so a page refresh with an already-signed-in user
  // doesn't get treated as a fresh sign-in by this component. The SyncService
  // has its own priming; we mirror it here to avoid duplicate triggers.
  let primed = false;

  // Variables for subscription cleanup
  let clerkUnsubscribe: (() => void) | undefined;
  let pageUnsubscribe: (() => void) | undefined;

  // Unified Effect: React to Clerk user changes and coordinated auth state
  $effect(() => {
    if (!browser || !clerkUserStore) return;

    clerkUnsubscribe = clerkUserStore.subscribe((user) => {
      const newUserId = user?.id || null;
      const previousUserId = currentUserId;

      // 1) Always keep the central auth store up-to-date
      authState.setClerkState(newUserId, !!user);

      // Prime on first emission and do nothing else (avoid refresh-induced sync)
      if (!primed) {
        primed = true;
        currentUserId = newUserId;
        // If a user is already signed in on initial load, filter stores locally
        // without initiating any Convex subscriptions/sync.
        if (newUserId) {
          calendarsStore.setUser(newUserId, false, false);
          habits.setUser(newUserId, false, false);
        }
        return;
      }

      if (newUserId === previousUserId) return; // Exit if user ID hasn't changed

      currentUserId = newUserId;

      if (DEBUG_VERBOSE) {
        const action = newUserId ? `signed in as ${newUserId}` : "signed out";
        console.log(`🔄 StoreSync: User state changed: ${action}`);
      }

      // 2) React only to real transitions post-prime
      if (newUserId) {
        // On real sign-in, only set the userId for the sync store.
        // The SyncService (auth listener) will handle migration + full sync
        // and will call per-store setUser during fullSync.
        syncStore.setUserId(newUserId);
      } else {
        // On real sign-out, clear user-specific data from stores
        if (DEBUG_VERBOSE) console.log("📤 Clearing user data from stores");
        calendarsStore.setUser(null);
        habits.setUser(null);
        syncStore.setUserId(null);
        hasShownMigrationToast = false;
      }
    });

    return () => clerkUnsubscribe?.();
  });

  // Handle page data changes (for SSR/initial load) safely using onMount
  onMount(() => {
    if (!browser) return;

    try {
      // Subscribe to page store directly (this is a proper svelte store)
      pageUnsubscribe = page.subscribe((p) => {
        if (!p || !p.data) return;

        try {
          const pageUserId = p.data?.session?.user?.id || null;

          // Do not trigger per-store user set from page data on initial load.
          // Auth transitions are handled via Clerk subscription + SyncService.
          // We only use page data here for diagnostics.
          if (DEBUG_VERBOSE && pageUserId && pageUserId !== currentUserId) {
            console.log("[StoreSync] Page data user detected:", pageUserId);
          }
        } catch (pageError) {
          console.error("[StoreSync] Error processing page data:", pageError);
        }
      });
    } catch (error) {
      console.error("[StoreSync] Error subscribing to page store:", error);
    }
  });

  // Cleanup all subscriptions on component destruction
  onDestroy(() => {
    if (clerkUnsubscribe) clerkUnsubscribe();
    if (pageUnsubscribe) pageUnsubscribe();
  });
</script>

<!-- This component has no visual output, it only handles store synchronization -->
