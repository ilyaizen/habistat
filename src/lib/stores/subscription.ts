/**
 * Subscription store for managing user subscription status and tier limits
 */

import { writable, get } from "svelte/store";
import { getConvexClient } from "$lib/utils/convex";
import { api } from "../../convex/_generated/api";
import { calendarsStore } from "./calendars";
import { habits } from "./habits";
import {
  FREE_TIER_LIMITS,
  type SubscriptionStatus,
  type SubscriptionTier,
  getLimitsForTier,
  getUpgradeMessage,
  isSubscriptionActive
} from "$lib/utils/subscription-limits";

export interface SubscriptionStore {
  subscribe: (callback: (value: SubscriptionStatus | null) => void) => () => void;
  refresh: () => Promise<void>;
  checkLimit: (type: "calendars" | "habits", calendarId?: string) => boolean;
  getUpgradeMessage: (type: "calendars" | "habits") => string;
  isLoading: () => boolean;
}

function createSubscriptionStore(): SubscriptionStore {
  const { subscribe, set, update } = writable<SubscriptionStatus | null>(null);
  const { subscribe: subscribeLoading, set: setLoading } = writable(false);

  let currentStatus: SubscriptionStatus | null = null;

  // Track current status for synchronous access
  subscribe((status) => {
    currentStatus = status;
  });

  return {
    subscribe,

    async refresh() {
      const convex = getConvexClient();
      if (!convex) {
        console.warn("Convex client not available for subscription refresh");
        return;
      }

      setLoading(true);
      try {
        // Use existing getCurrentUser query from convex/users.ts
        const userData = await convex.query(api.users.getCurrentUser, {});

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
          console.log("Subscription status refreshed:", status);
        } else {
          // User not found, default to free tier
          set({
            tier: "free",
            isActive: true,
            maxCalendars: FREE_TIER_LIMITS.maxCalendars,
            maxHabitsPerCalendar: FREE_TIER_LIMITS.maxHabitsPerCalendar
          });
        }
      } catch (error) {
        console.error("Failed to refresh subscription status:", error);
        // Default to free tier on error
        set({
          tier: "free",
          isActive: true,
          maxCalendars: FREE_TIER_LIMITS.maxCalendars,
          maxHabitsPerCalendar: FREE_TIER_LIMITS.maxHabitsPerCalendar
        });
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

// Note: Auto-refresh will be handled by components using the subscription store
// by calling subscriptionStore.refresh() when user state changes
