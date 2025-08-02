<script lang="ts">
  import type { UserResource } from "@clerk/types";
  import { getContext } from "svelte";
  import type { Readable } from "svelte/store";
  import { Badge } from "$lib/components/ui/badge";
  import { subscriptionStore } from "$lib/stores/subscription";
  import { formatSubscriptionStatus } from "$lib/utils/subscription-limits";

  let {
    showDetails = false,
    variant = "outline"
  }: {
    showDetails?: boolean;
    variant?: "default" | "secondary" | "destructive" | "outline";
  } = $props();

  // Get user from context to trigger subscription refresh
  const clerkUserStore = getContext<Readable<UserResource | null> | undefined>("clerkUser");

  const subscription = $derived.by(() => $subscriptionStore);

  // Refresh subscription when user changes or component mounts
  $effect(() => {
    if (clerkUserStore && $clerkUserStore) {
      subscriptionStore.refresh();
    }
  });

  const badgeConfig = $derived.by(() => {
    if (!subscription) {
      return {
        text: "Loading...",
        variant: "secondary" as const,
        title: "Loading subscription status..."
      };
    }

    const formattedStatus = formatSubscriptionStatus(subscription);

    // Determine badge variant based on subscription status
    let badgeVariant: "default" | "secondary" | "destructive" | "outline" = variant;
    if (subscription.tier === "free") {
      badgeVariant = "outline";
    } else if (subscription.isActive) {
      badgeVariant = "default";
    } else {
      badgeVariant = "destructive"; // Expired premium
    }

    let title = formattedStatus;
    if (showDetails) {
      if (subscription.tier === "free") {
        title += ` • ${subscription.maxCalendars} calendars, ${subscription.maxHabitsPerCalendar} habits per calendar`;
      } else if (subscription.expiresAt && subscription.tier === "premium_monthly") {
        const expiryDate = new Date(subscription.expiresAt).toLocaleDateString();
        title += ` • ${subscription.isActive ? "Expires" : "Expired"} ${expiryDate}`;
      }
    }

    return {
      text: formattedStatus,
      variant: badgeVariant,
      title
    };
  });
</script>

<Badge variant={badgeConfig.variant} title={badgeConfig.title}>
  {badgeConfig.text}
</Badge>
