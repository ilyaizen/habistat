import { writable } from "svelte/store";
import { browser } from "$app/environment";
// Import your Convex client and generated API
import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react"; // If using Convex React client, otherwise adjust

export type SubscriptionTier = "free" | "premium_monthly" | "premium_lifetime";

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  expiresAt?: number;
  isActive: boolean;
}

export const subscriptionStatus = writable<SubscriptionStatus>({
  tier: "free",
  expiresAt: undefined,
  isActive: true
});

// Example: fetch and update subscription status for the current user
export async function fetchSubscriptionStatus(clerkId: string) {
  if (!browser) return;
  // Use your Convex client to call the getCurrentUser query
  // This is a placeholder; replace with your actual Convex client call
  const response = await fetch("/api/convex/getCurrentUser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clerkId })
  });
  const user = await response.json();
  if (user) {
    const tier = user.subscriptionTier || "free";
    const expiresAt = user.subscriptionExpiresAt;
    const isActive = tier === "free" || (expiresAt ? Date.now() < expiresAt : false);
    subscriptionStatus.set({ tier, expiresAt, isActive });
  } else {
    subscriptionStatus.set({ tier: "free", expiresAt: undefined, isActive: true });
  }
}
