<!--
  Store Sync Component
  Handles synchronization of stores with user authentication state and cloud sync.
  Uses Svelte 5 $effect to react to page data changes and Clerk auth state.
-->
<script lang="ts">
  import type { UserResource } from "@clerk/types";
  import { getContext, onDestroy, onMount } from "svelte";
  import type { Readable } from "svelte/store";
  import { get } from "svelte/store";
  import { toast } from "svelte-sonner";
  import { browser } from "$app/environment";
  // For page data
  import { page } from "$app/stores";
  import { authState } from "$lib/stores/auth-state";
  import { calendarsStore } from "$lib/stores/calendars";
  import { habits } from "$lib/stores/habits";
  import { syncStore } from "$lib/stores/sync";

  // Get Clerk user from context with safe fallback
  const clerkUserStore = getContext<Readable<UserResource | null>>("clerkUser") || undefined;

  let currentUserId: string | null = null;
  let hasShownMigrationToast = false;

  // Variables for subscription cleanup
  let clerkUnsubscribe: (() => void) | undefined;
  let pageUnsubscribe: (() => void) | undefined;

  // Effect 1: React to Clerk user changes and notify the central auth store
  $effect(() => {
    if (!browser || !clerkUserStore) return;

    clerkUnsubscribe = clerkUserStore.subscribe((user) => {
      const newUserId = user?.id || null;
      if (newUserId === currentUserId) return;

      const previousUserId = currentUserId;
      currentUserId = newUserId;

      // Only log significant user changes
      if (previousUserId !== newUserId) {
        const action = newUserId ? "signed in" : "signed out";
        console.log(`🔄 StoreSync: User ${action}`);
      }
      // Notify the central auth state store about the change
      authState.setClerkState(newUserId, !!user);

      // Immediately notify the sync store
      syncStore.setUserId(newUserId);
    });

    return () => clerkUnsubscribe?.();
  });

  // Effect 2: React to the final, coordinated authentication state
  $effect(() => {
    if (!browser) return;

    const authStateData = get(authState);
    const isReady = authStateData.clerkReady && authStateData.clerkUserId;
    // Debug: Auth ready state tracking
    // console.log(`[StoreSync] Coordinated auth ready state: ${isReady}`);

    if (isReady) {
      // Auth is fully ready, now we can safely initialize stores
      if (currentUserId) {
        console.log("⚙️ Stores initialized for user");
        calendarsStore.setUser(currentUserId);
        habits.setUser(currentUserId);

        // Handle data migration on initial login
        if (!hasShownMigrationToast) {
          hasShownMigrationToast = true;
          syncStore.migrateAnonymousData().then((migrationResult) => {
            if (migrationResult.success && migrationResult.migratedCount > 0) {
              toast.success("Welcome back!", {
                description: `Synced ${migrationResult.migratedCount} item(s) to your account.`
              });
            } else if (migrationResult.success) {
              toast.success("Account synced!", {
                description: "Your data is now synced across devices."
              });
            }
          });
        }
      }
    } else {
      // User logged out or auth not ready
      const state = get(authState);
      if (!state.clerkUserId) {
        console.log("📤 Stores cleared (user signed out)");
        calendarsStore.setUser(null);
        habits.setUser(null);
        syncStore.setUserId(null);
        hasShownMigrationToast = false;
      }
    }
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

          // Update stores with page data user (backup mechanism)
          if (pageUserId && pageUserId !== currentUserId) {
            console.log("[StoreSync] Page data user detected:", pageUserId);
            calendarsStore.setUser(pageUserId);
            habits.setUser(pageUserId);
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
