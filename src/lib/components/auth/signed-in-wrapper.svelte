<script lang="ts">
  // A wrapper around the SignedIn component to handle TypeScript compatibility issues with Svelte 5
  import { SignedIn } from "svelte-clerk";
  import { page } from "$app/state";
  import { onMount, onDestroy } from "svelte";
  import { migrateSession, isSessionMigrated, markSessionClaimed } from "$lib/utils/tracking";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";

  // Define children prop using Svelte 5 syntax
  const { children } = $props<{
    children: () => unknown;
  }>();

  // Define nullSnippet function to fix TypeScript error
  const nullSnippet = () => null;

  // Track migration state
  let migrationAttempted = $state(false);
  let migrationInProgress = $state(false);
  let migrationError = $state<string | null>(null);

  // Track if component is still mounted to prevent async updates after unmount
  let isMounted = $state(false);

  onMount(() => {
    isMounted = true;

    if (!browser) return;

    // First ensure the session is marked as claimed
    markSessionClaimed();

    // Check if session is already migrated to avoid unnecessary processing
    if (isSessionMigrated()) {
      console.log("Session was already migrated previously, skipping migration check");
      return;
    }

    // We'll use a short delay to ensure Clerk has time to initialize
    const initialDelay = 500;
    setTimeout(attemptMigration, initialDelay);

    // Set up a backup interval for migration attempts
    // This will keep trying until migration succeeds or times out
    const maxMigrationTime = 10000; // 10 seconds max
    const interval = setInterval(() => {
      // Only attempt if not already in progress and not already migrated
      if (isMounted && !migrationInProgress && !isSessionMigrated() && !migrationAttempted) {
        attemptMigration();
      } else if (isSessionMigrated() || migrationAttempted || !isMounted) {
        // Clear interval once migration is done or attempted
        clearInterval(interval);
      }
    }, 2000);

    // Ensure we don't keep trying forever
    setTimeout(() => {
      if (interval) clearInterval(interval);
    }, maxMigrationTime);
  });

  onDestroy(() => {
    isMounted = false;
  });

  /**
   * Helper function to attempt migration once
   */
  async function attemptMigration() {
    // Don't attempt migration if we already tried or if it's in progress
    if (migrationInProgress || migrationAttempted || !isMounted) {
      return;
    }

    try {
      migrationInProgress = true;

      // First check if we can safely access window.Clerk
      if (!browser || typeof window === "undefined") {
        console.log("Browser environment not available, skipping migration");
        migrationError = "Browser environment not available";
        migrationAttempted = true; // Mark as attempted to avoid retrying
        return;
      }

      // Make sure we have the Clerk global
      if (!window.Clerk) {
        console.log("Clerk not available yet, will retry later");
        migrationError = "Clerk not initialized yet";
        return; // Will retry via interval
      }

      // Make sure the user is available
      if (!window.Clerk.user) {
        console.log("Clerk user not available yet, will retry later");
        migrationError = "User not available yet";
        return; // Will retry via interval
      }

      // Get current user ID
      const userId = window.Clerk.user.id;
      if (!userId) {
        console.log("User ID not available, skipping migration");
        migrationError = "User ID not available";
        migrationAttempted = true; // Mark as attempted to avoid retrying
        return;
      }

      // Get user email if available
      const userEmail = window.Clerk.user.primaryEmailAddress?.emailAddress || "";

      console.log("User is signed in, attempting session migration...");

      // Always mark session as claimed regardless of migration outcome
      markSessionClaimed();

      // Try migration but don't let it break the app if it fails
      let wasNewMigration = false;
      try {
        wasNewMigration = await migrateSession(userId, userEmail);
      } catch (migrationError) {
        console.error("Migration failed but continuing:", migrationError);
      }

      console.log(
        `Migration ${wasNewMigration ? "performed" : "skipped"}, migration status:`,
        isSessionMigrated()
      );

      // Mark as attempted to avoid retrying unnecessarily
      migrationAttempted = true;

      // If migration was successful, navigate to a clean URL
      if (wasNewMigration && isMounted && browser) {
        console.log("Migration complete, navigating to clean dashboard URL");

        // Add a short delay to ensure all localStorage operations complete
        setTimeout(() => {
          try {
            // Use a different approach to avoid the issue with Clerk's URL modification
            // Create a clean URL without any query parameters
            const cleanUrl = new URL("/dashboard", window.location.origin);

            // Use a hard navigation to completely refresh the app state
            // This will clear any Clerk handshake parameters
            window.location.href = cleanUrl.toString();
          } catch (error) {
            console.error("Navigation error after migration:", error);
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error during session migration:", error);
      migrationError = String(error);
      migrationAttempted = true; // Mark as attempted even on error
    } finally {
      if (isMounted) {
        migrationInProgress = false;
      }
    }
  }
</script>

<!--
  TypeScript workaround for Svelte 5 compatibility with svelte-clerk
  This component will be updated once svelte-clerk is officially compatible with Svelte 5
-->
{#key 1}
  <SignedIn>
    {@render children?.()}
  </SignedIn>
{/key}
