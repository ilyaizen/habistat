<!--
  Store Sync Component
  Handles synchronization of stores with user authentication state and cloud sync.
  Uses Svelte 5 $effect to react to page data changes and Clerk auth state.
-->
<script lang="ts">
  // Debug configuration - set to true to enable verbose logging
  const DEBUG_VERBOSE = false;

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
  import { syncStore } from "$lib/stores/sync-stores";

  // Get Clerk user from context with safe fallback
  const clerkUserStore = getContext<Readable<UserResource | null>>("clerkUser") || undefined;

  let currentUserId: string | null = null;
  let hasShownMigrationToast = false;

  // Variables for subscription cleanup
  let clerkUnsubscribe: (() => void) | undefined;
  let pageUnsubscribe: (() => void) | undefined;

  // Unified Effect: React to Clerk user changes and coordinated auth state
  $effect(() => {
    if (!browser || !clerkUserStore) return;

    clerkUnsubscribe = clerkUserStore.subscribe((user) => {
      const newUserId = user?.id || null;
      const previousUserId = currentUserId;
      currentUserId = newUserId;

      // 1. Always keep the central auth store up-to-date
      authState.setClerkState(newUserId, !!user);

      if (newUserId === previousUserId) return; // Exit if user ID hasn't changed

      if (DEBUG_VERBOSE) {
        const action = newUserId ? `signed in as ${newUserId}` : "signed out";
        console.log(`🔄 StoreSync: User state changed: ${action}`);
      }

      // 2. Now, react to the new user state
      if (newUserId) {
        // User is signed in. Initialize stores and trigger sync.
        if (DEBUG_VERBOSE) console.log("⚙️ Initializing stores and sync for user");
        calendarsStore.setUser(newUserId);
        habits.setUser(newUserId);
        syncStore.setUserId(newUserId); // This triggers the sync flow

        // Handle data migration on initial login
        if (!hasShownMigrationToast) {
          hasShownMigrationToast = true;
          syncStore.migrateAnonymousData().then((migrationResult) => {
            if (migrationResult.success && migrationResult.migratedCount > 0) {
              toast.success("Welcome back!", {
                description: `Synced ${migrationResult.migratedCount} item(s) to your account.`
              });
            } else if (migrationResult.success) {
              // Optional: show a generic success message even if nothing was migrated
              // toast.success("Account synced!", {
              //   description: "Your data is now synced across devices."
              // });
            }
          });
        }
      } else {
        // User is signed out. Clear all user-specific data.
        if (DEBUG_VERBOSE) console.log("📤 Clearing user data from stores");
        calendarsStore.setUser(null);
        habits.setUser(null);
        syncStore.setUserId(null); // Clear sync state
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

          // Update stores with page data user (backup mechanism)
          if (pageUserId && pageUserId !== currentUserId) {
            if (DEBUG_VERBOSE) {
              console.log("[StoreSync] Page data user detected:", pageUserId);
            }
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
