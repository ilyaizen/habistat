/**
 * Subscription tier limits and utility functions for the Habistat SaaS model
 */

export const FREE_TIER_LIMITS = {
  maxCalendars: 3,
  maxHabitsPerCalendar: 7
} as const;

export type SubscriptionTier = "free" | "premium_monthly" | "premium_lifetime";

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt?: number; // Unix timestamp
  maxCalendars: number;
  maxHabitsPerCalendar: number;
}

/**
 * Check if a subscription tier is premium (not free)
 */
export function isPremiumTier(tier: SubscriptionTier): boolean {
  return tier !== "free";
}

/**
 * Get limits for a specific subscription tier
 */
export function getLimitsForTier(tier: SubscriptionTier): {
  maxCalendars: number;
  maxHabitsPerCalendar: number;
} {
  if (isPremiumTier(tier)) {
    return {
      maxCalendars: Infinity,
      maxHabitsPerCalendar: Infinity
    };
  }

  return {
    maxCalendars: FREE_TIER_LIMITS.maxCalendars,
    maxHabitsPerCalendar: FREE_TIER_LIMITS.maxHabitsPerCalendar
  };
}

/**
 * Generate contextual upgrade messages for limit scenarios
 */
export function getUpgradeMessage(type: "calendars" | "habits"): string {
  if (type === "calendars") {
    return `You've reached the free tier limit of ${FREE_TIER_LIMITS.maxCalendars} calendars. Upgrade to Premium for unlimited calendars and advanced features.`;
  } else {
    return `You've reached the free tier limit of ${FREE_TIER_LIMITS.maxHabitsPerCalendar} habits per calendar. Upgrade to Premium for unlimited habits and advanced features.`;
  }
}

/**
 * Check if a subscription is currently active (not expired)
 */
export function isSubscriptionActive(tier: SubscriptionTier, expiresAt?: number): boolean {
  if (tier === "free") return true; // Free tier never expires
  if (tier === "premium_lifetime") return true; // Lifetime never expires

  if (!expiresAt) return false; // Monthly needs expiration date
  return expiresAt > Date.now();
}

/**
 * Format subscription status for display
 */
export function formatSubscriptionStatus(status: SubscriptionStatus): string {
  if (status.tier === "free") {
    return "Free";
  } else if (status.tier === "premium_lifetime") {
    return "Premium (Lifetime)";
  } else {
    const isActive = status.isActive;
    return `Premium (Monthly)${isActive ? "" : " - Expired"}`;
  }
}
