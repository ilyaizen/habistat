<script lang="ts">
  import type { UserResource } from "@clerk/types";
  import { getContext } from "svelte";
  import type { Readable } from "svelte/store";
  import SessionInfo from "$lib/components/session-info.svelte";
  import SubscriptionBadge from "$lib/components/subscription-badge.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { subscriptionStore } from "$lib/stores/subscription";

  // Get user from context
  const clerkUserStore = getContext<Readable<UserResource | null> | undefined>("clerkUser");

  // Derived reactive values
  const subscription = $derived.by(() => $subscriptionStore);
  const currentUser = $derived.by(() => (clerkUserStore ? $clerkUserStore : null));

  // Refresh subscription when user is available
  $effect(() => {
    if (currentUser) {
      subscriptionStore.refresh();
    }
  });

  function handleUpgrade() {
    // Navigate to premium/pricing page (will be implemented in Phase 5)
    window.location.href = "/premium";
  }

  function handleManageSubscription() {
    // Navigate to Stripe billing portal (will be implemented in Phase 5)
    alert("Manage subscription functionality will be implemented in Phase 5");
  }
</script>

<!-- Account Information Section -->
<Card class="mb-6">
  <CardContent>
    <!-- Displays user session and authentication status -->
    <SessionInfo />
  </CardContent>
</Card>

<!-- Subscription Information Section -->
{#if currentUser}
  <Card class="mb-6">
    <CardHeader>
      <CardTitle class="flex items-center justify-between">
        Subscription
        <SubscriptionBadge showDetails={true} />
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      {#if subscription}
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-muted-foreground text-sm">Plan:</span>
            <span class="text-sm font-medium"
              >{subscription.tier === "free" ? "Free" : "Premium"}</span
            >
          </div>

          <div class="flex justify-between">
            <span class="text-muted-foreground text-sm">Calendars:</span>
            <span class="text-sm font-medium">
              {subscription.maxCalendars === Infinity
                ? "Unlimited"
                : `${subscription.maxCalendars} max`}
            </span>
          </div>

          <div class="flex justify-between">
            <span class="text-muted-foreground text-sm">Habits per Calendar:</span>
            <span class="text-sm font-medium">
              {subscription.maxHabitsPerCalendar === Infinity
                ? "Unlimited"
                : `${subscription.maxHabitsPerCalendar} max`}
            </span>
          </div>

          {#if subscription.tier === "premium_monthly" && subscription.expiresAt}
            <div class="flex justify-between">
              <span class="text-muted-foreground text-sm">Expires:</span>
              <span class="text-sm font-medium">
                {new Date(subscription.expiresAt).toLocaleDateString()}
              </span>
            </div>
          {/if}
        </div>

        <div class="flex gap-2 pt-4">
          {#if subscription.tier === "free"}
            <Button onclick={handleUpgrade} class="flex-1">Upgrade to Premium</Button>
          {:else}
            <Button variant="outline" onclick={handleManageSubscription} class="flex-1">
              Manage Subscription
            </Button>
          {/if}
          <Button variant="outline" onclick={() => (window.location.href = "/premium")}>
            Learn More
          </Button>
        </div>
      {:else}
        <div class="text-muted-foreground text-center text-sm">
          Loading subscription information...
        </div>
      {/if}
    </CardContent>
  </Card>
{/if}
