<!--
  Anonymous Data Migration Dialog
  Prompts users to migrate their local anonymous data to their authenticated account
-->
<script lang="ts">
  import { get } from "svelte/store";
  import * as Dialog from "$lib/components/ui/dialog";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Alert from "$lib/components/ui/alert";
  import { Loader2, Upload, AlertTriangle, CheckCircle } from "@lucide/svelte";
  import { SyncService } from "$lib/services/sync";
  import { authState } from "$lib/stores/auth-state";
  import { subscriptionStore } from "$lib/stores/subscription";
  import * as localData from "$lib/services/local-data";

  // Props using Svelte 5 syntax
  interface Props {
    open: boolean;
    onComplete?: (migrated: boolean) => void;
  }
  
  let { open = $bindable(), onComplete }: Props = $props();

  // State using Svelte 5 syntax
  let isChecking = $state(false);
  let isMigrating = $state(false);
  let hasAnonymousData = $state(false);
  let anonymousDataCount = $state(0);
  let migrationResult = $state<{ success: boolean; migratedCount: number; error?: string } | null>(null);
  let exceedsLimits = $state(false);
  let limitWarning = $state("");

  // Sync service instance
  const syncService = new SyncService();

  // Check for anonymous data when dialog opens
  $effect(() => {
    if (open && !isChecking && !hasAnonymousData) {
      checkForAnonymousData();
    }
  });

  async function checkForAnonymousData() {
    isChecking = true;
    try {
      // Check for anonymous completions (main indicator of usage)
      const anonymousCompletions = await localData.getAnonymousCompletions();
      
      // Also check for anonymous calendars and habits
      const allCalendars = await localData.getAllCalendars();
      const allHabits = await localData.getAllHabits();
      
      const anonymousCalendars = allCalendars.filter(c => !c.userId);
      const anonymousHabits = allHabits.filter(h => !h.userId);
      
      anonymousDataCount = anonymousCompletions.length + anonymousCalendars.length + anonymousHabits.length;
      hasAnonymousData = anonymousDataCount > 0;

      // Check if migration would exceed free tier limits
      if (hasAnonymousData) {
        const subscription = get(subscriptionStore);
        if (subscription && subscription.tier === "free") {
          const currentCalendars = allCalendars.filter(c => c.userId);
          const currentHabits = allHabits.filter(h => h.userId);
          
          const totalCalendarsAfterMigration = currentCalendars.length + anonymousCalendars.length;
          const wouldExceedCalendarLimit = totalCalendarsAfterMigration > subscription.maxCalendars;
          
          // Check habits per calendar (simplified check)
          const wouldExceedHabitLimit = anonymousHabits.length > 0 && 
            (currentHabits.length + anonymousHabits.length) > (subscription.maxHabitsPerCalendar * subscription.maxCalendars);
          
          exceedsLimits = wouldExceedCalendarLimit || wouldExceedHabitLimit;
          
          if (exceedsLimits) {
            limitWarning = wouldExceedCalendarLimit 
              ? `You have ${anonymousCalendars.length} calendars to migrate, but your free plan allows only ${subscription.maxCalendars} total calendars.`
              : `You have ${anonymousHabits.length} habits to migrate, which may exceed your free plan limits.`;
          }
        }
      }
    } catch (error) {
      console.error("Failed to check for anonymous data:", error);
    } finally {
      isChecking = false;
    }
  }

  async function handleMigrate() {
    const auth = get(authState);
    if (!auth.clerkUserId) {
      console.error("No authenticated user for migration");
      return;
    }

    isMigrating = true;
    migrationResult = null;

    try {
      // Set user ID for sync service
      syncService.setUserId(auth.clerkUserId);
      
      // Perform migration
      const result = await syncService.migrateAnonymousData();
      migrationResult = result;

      if (result.success) {
        // Refresh stores to reflect migrated data
        const { calendarsStore } = await import("$lib/stores/calendars");
        const { habits } = await import("$lib/stores/habits");
        const { completionsStore } = await import("$lib/stores/completions");
        
        await Promise.all([
          calendarsStore.refresh(),
          habits.refresh(),
          completionsStore.refresh()
        ]);

        // Auto-close dialog after successful migration
        setTimeout(() => {
          open = false;
          onComplete?.(true);
        }, 2000);
      }
    } catch (error) {
      migrationResult = {
        success: false,
        migratedCount: 0,
        error: error instanceof Error ? error.message : "Migration failed"
      };
    } finally {
      isMigrating = false;
    }
  }

  function handleSkip() {
    open = false;
    onComplete?.(false);
  }

  function handleUpgrade() {
    // Navigate to premium page
    window.location.href = "/premium";
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <Upload class="h-5 w-5" />
        Migrate Your Data
      </Dialog.Title>
      <Dialog.Description>
        We found local data that can be synced to your account.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4">
      {#if isChecking}
        <div class="flex items-center justify-center py-6">
          <Loader2 class="h-6 w-6 animate-spin" />
          <span class="ml-2">Checking for local data...</span>
        </div>
      {:else if !hasAnonymousData}
        <Alert.Root>
          <CheckCircle class="h-4 w-4" />
          <Alert.Title>No Data to Migrate</Alert.Title>
          <Alert.Description>
            All your data is already synced to your account.
          </Alert.Description>
        </Alert.Root>
      {:else}
        <div class="space-y-3">
          <p class="text-sm text-muted-foreground">
            Found <strong>{anonymousDataCount}</strong> items that can be synced to your account:
          </p>

          {#if exceedsLimits}
            <Alert.Root variant="destructive">
              <AlertTriangle class="h-4 w-4" />
              <Alert.Title>Free Plan Limit</Alert.Title>
              <Alert.Description class="space-y-2">
                <p>{limitWarning}</p>
                <p class="text-xs">Consider upgrading to Premium for unlimited calendars and habits.</p>
              </Alert.Description>
            </Alert.Root>
          {/if}

          {#if migrationResult}
            {#if migrationResult.success}
              <Alert.Root>
                <CheckCircle class="h-4 w-4" />
                <Alert.Title>Migration Successful!</Alert.Title>
                <Alert.Description>
                  Successfully migrated {migrationResult.migratedCount} items to your account.
                </Alert.Description>
              </Alert.Root>
            {:else}
              <Alert.Root variant="destructive">
                <AlertTriangle class="h-4 w-4" />
                <Alert.Title>Migration Failed</Alert.Title>
                <Alert.Description>
                  {migrationResult.error || "An error occurred during migration."}
                </Alert.Description>
              </Alert.Root>
            {/if}
          {/if}
        </div>
      {/if}
    </div>

    <Dialog.Footer class="flex gap-2">
      {#if isChecking}
        <!-- Show nothing while checking -->
      {:else if !hasAnonymousData}
        <Button onclick={handleSkip} class="w-full">
          Continue
        </Button>
      {:else if migrationResult?.success}
        <Button onclick={handleSkip} class="w-full">
          Continue
        </Button>
      {:else}
        <Button variant="outline" onclick={handleSkip} disabled={isMigrating}>
          Skip for Now
        </Button>
        
        {#if exceedsLimits}
          <Button onclick={handleUpgrade} disabled={isMigrating}>
            Upgrade Plan
          </Button>
        {:else}
          <Button onclick={handleMigrate} disabled={isMigrating}>
            {#if isMigrating}
              <Loader2 class="h-4 w-4 animate-spin mr-2" />
              Migrating...
            {:else}
              Migrate Data
            {/if}
          </Button>
        {/if}
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
