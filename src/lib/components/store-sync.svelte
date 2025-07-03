<!--
  Store Sync Component
  Handles synchronization of stores with user authentication state and cloud sync.
  Uses Svelte 5 $effect to react to page data changes and Clerk auth state.
-->
<script lang="ts">
  import { page } from "$app/state";
  import { getContext } from "svelte";
  import { calendarsStore } from "$lib/stores/calendars";
  import { habits } from "$lib/stores/habits";
  import { completionsStore } from "$lib/stores/completions";
  import { syncStore } from "$lib/stores/sync";
  import { browser } from "$app/environment";
  import { toast } from "svelte-sonner";
  import type { UserResource } from "@clerk/types";
  import type { Readable } from "svelte/store";

  // Get Clerk user from context
  const clerkUserStore = getContext<Readable<UserResource | null>>("clerkUser");

  let currentUserId: string | null = null;
  let hasShownMigrationToast = false;

  // React to Clerk authentication changes and sync stores
  $effect(() => {
    if (!browser) return;

    const unsubscribe = clerkUserStore.subscribe(async (user) => {
      const newUserId = user?.id || null;

      // Only react to actual changes in user ID
      if (newUserId === currentUserId) return;

      const previousUserId = currentUserId;
      currentUserId = newUserId;

      console.log("[StoreSync] User changed:", { previousUserId, newUserId });

      // Update all stores with the current user
      calendarsStore.setUser(newUserId);
      habits.setUser(newUserId);

      if (newUserId) {
        // User logged in
        console.log("[StoreSync] User authenticated, setting up sync...");

        // Set up sync service with user ID
        syncStore.setUserId(newUserId);

        // Show migration prompt if this is a new login and we haven't shown it yet
        if (!previousUserId && !hasShownMigrationToast) {
          hasShownMigrationToast = true;

          // Check if there's anonymous data to migrate
          const migrationResult = await syncStore.migrateAnonymousData();

          if (migrationResult.success && migrationResult.migratedCount > 0) {
            toast.success("Welcome back!", {
              description: `Successfully synced ${migrationResult.migratedCount} completion${migrationResult.migratedCount === 1 ? "" : "s"} to your account.`
            });
          } else if (migrationResult.success) {
            // No data to migrate, just show sync success
            toast.success("Account synced!", {
              description: "Your data is now synced across devices."
            });
          }
        }
      } else {
        // User logged out
        console.log("[StoreSync] User logged out, clearing sync...");
        syncStore.setUserId(null);
        hasShownMigrationToast = false;
      }
    });

    return unsubscribe;
  });

  // Also handle page data changes (for SSR/initial load)
  $effect(() => {
    if (!browser) return;

    const pageUserId = page.data?.session?.user?.id || null;

    // Update stores with page data user (backup mechanism)
    if (pageUserId && pageUserId !== currentUserId) {
      console.log("[StoreSync] Page data user detected:", pageUserId);
      calendarsStore.setUser(pageUserId);
      habits.setUser(pageUserId);
    }
  });
</script>

<!-- This component has no visual output, it only handles store synchronization -->
