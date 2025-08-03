/**
 * Subscription store for managing user subscription status and tier limits
 */

import { get, writable } from "svelte/store";
import { convexQuery } from "$lib/utils/convex-operations";
import {
  FREE_TIER_LIMITS,
  getLimitsForTier,
  getUpgradeMessage,
  isSubscriptionActive,
  type SubscriptionStatus,
  type SubscriptionTier
} from "$lib/utils/subscription-limits";
import { api } from "../../convex/_generated/api";
import { authState } from "./auth-state";
import { calendarsStore } from "./calendars";
import { habits } from "./habits";

export interface SubscriptionStore {
  subscribe: (callback: (value: SubscriptionStatus | null) => void) => () => void;
  refresh: () => Promise<void>;
  checkLimit: (type: "calendars" | "habits", calendarId?: string) => boolean;
  getUpgradeMessage: (type: "calendars" | "habits") => string;
  isLoading: () => boolean;
}

function createSubscriptionStore(): SubscriptionStore {
  const { subscribe, set } = writable<SubscriptionStatus | null>(null);
  const { subscribe: subscribeLoading, set: setLoading } = writable(false);

  let currentStatus: SubscriptionStatus | null = null;

  // Track current status for synchronous access
  subscribe((status) => {
    currentStatus = status;
  });

  return {
    subscribe,

    async refresh() {
      setLoading(true);
      try {
        // Use existing getCurrentUser query from convex/users.ts
        const userData = await convexQuery(api.users.getCurrentUser, {});

        if (userData) {
          const tier: SubscriptionTier = userData.subscriptionTier || "free";
          const limits = getLimitsForTier(tier);
          const isActive = isSubscriptionActive(tier, userData.subscriptionExpiresAt);

          const status: SubscriptionStatus = {
            tier,
            isActive,
            expiresAt: userData.subscriptionExpiresAt,
            maxCalendars: limits.maxCalendars,
            maxHabitsPerCalendar: limits.maxHabitsPerCalendar
          };

          set(status);
          // Only log subscription changes, not all refreshes
          if (currentStatus?.tier !== status.tier || currentStatus?.isActive !== status.isActive) {
            console.log(
              `✅ Subscription: ${status.tier} (${status.isActive ? "active" : "inactive"})`
            );
          }
        } else {
          // User not found, default to free tier
          const defaultStatus = {
            tier: "free" as const,
            isActive: true,
            maxCalendars: FREE_TIER_LIMITS.maxCalendars,
            maxHabitsPerCalendar: FREE_TIER_LIMITS.maxHabitsPerCalendar
          };
          set(defaultStatus);
          if (!currentStatus) {
            console.log(`✅ Subscription: free (default)`);
          }
        }
      } catch (error) {
        console.error("Failed to refresh subscription status:", error);
        // Default to free tier on error
        const errorStatus = {
          tier: "free" as const,
          isActive: true,
          maxCalendars: FREE_TIER_LIMITS.maxCalendars,
          maxHabitsPerCalendar: FREE_TIER_LIMITS.maxHabitsPerCalendar
        };
        set(errorStatus);
        if (!currentStatus) {
          console.log(`⚠️ Subscription: free (error fallback)`);
        }
      } finally {
        setLoading(false);
      }
    },

    checkLimit(type: "calendars" | "habits", calendarId?: string): boolean {
      if (!currentStatus) {
        // Default to free tier limits if status not loaded
        if (type === "calendars") {
          const currentCalendars = get(calendarsStore);
          return (
            Array.isArray(currentCalendars) &&
            currentCalendars.length < FREE_TIER_LIMITS.maxCalendars
          );
        } else {
          if (!calendarId) return false; // Need calendar ID for habit limits
          const currentHabits = get(habits);
          const habitsInCalendar = Array.isArray(currentHabits)
            ? currentHabits.filter((h) => h.calendarId === calendarId)
            : [];
          return habitsInCalendar.length < FREE_TIER_LIMITS.maxHabitsPerCalendar;
        }
      }

      // Premium users have no limits
      if (currentStatus.tier !== "free" && currentStatus.isActive) {
        return true;
      }

      // Free tier or expired premium - check limits
      if (type === "calendars") {
        const currentCalendars = get(calendarsStore);
        return (
          Array.isArray(currentCalendars) && currentCalendars.length < currentStatus.maxCalendars
        );
      } else {
        if (!calendarId) return false; // Need calendar ID for habit limits
        const currentHabits = get(habits);
        const habitsInCalendar = Array.isArray(currentHabits)
          ? currentHabits.filter((h) => h.calendarId === calendarId)
          : [];
        return habitsInCalendar.length < currentStatus.maxHabitsPerCalendar;
      }
    },

    getUpgradeMessage(type: "calendars" | "habits"): string {
      return getUpgradeMessage(type);
    },

    isLoading(): boolean {
      return get({ subscribe: subscribeLoading });
    }
  };
}

export const subscriptionStore = createSubscriptionStore();

// Auto-refresh subscription when user authentication state changes
authState.subscribe((auth) => {
  if (auth.clerkReady && auth.clerkUserId && auth.convexAuthStatus === "authenticated") {
    // User is authenticated, refresh subscription status
    subscriptionStore.refresh();
  } else if (!auth.clerkUserId) {
    // User logged out, reset to default free tier
    const { subscribe, set } = writable<SubscriptionStatus | null>(null);
    // Get the current subscription store and reset it
    const defaultStatus: SubscriptionStatus = {
      tier: "free",
      isActive: true,
      maxCalendars: FREE_TIER_LIMITS.maxCalendars,
      maxHabitsPerCalendar: FREE_TIER_LIMITS.maxHabitsPerCalendar
    };
    // Note: This is a bit of a hack since we can't directly access the store's set method
    // The proper way would be to add a reset method to the store interface
    subscriptionStore.refresh(); // This will default to free tier in error case
  }
});
