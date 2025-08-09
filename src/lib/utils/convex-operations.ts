import { get } from "svelte/store";
import { api } from "../../convex/_generated/api";
import { authState } from "../stores/auth-state";
import { getConvexClient } from "./convex";
import { safeMutation, safeQuery } from "./safe-query";

/**
 * Core types for sync operations
 */
export type SyncResult = {
  success: boolean;
  error?: string;
};

export type CompletionSyncData = {
  localUuid: string;
  habitId: string;
  completedAt: number;
};

/**
 * Wait for Convex authentication to be ready
 */
export async function waitForConvexAuth(maxWaitMs = 15000): Promise<boolean> {
  const { isAuthReady } = await import("./convex");

  if (isAuthReady()) return true;

  const startTime = Date.now();
  while (!isAuthReady() && Date.now() - startTime < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return isAuthReady();
}

/**
 * Ensure user's firstAppOpenAt is set on the server.
 * - No-op if unauthenticated or value already set.
 * - Returns true if the mutation performed an update.
 */
export async function ensureFirstAppOpenTimestamp(
  timestamp?: number
): Promise<{ success: boolean; updated: boolean; error?: string }> {
  try {
    const { clerkUserId, clerkReady } = get(authState);
    if (!clerkReady || !clerkUserId) {
      return { success: false, updated: false, error: "Auth not ready" };
    }

    // Wait for Convex client/auth to be ready (defensive)
    await waitForConvexAuth(10000);

    const updated = await convexMutation(api.users.setFirstAppOpenAtIfMissing, {
      timestamp
    });

    return { success: true, updated: Boolean(updated) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn("ensureFirstAppOpenTimestamp failed:", message);
    return { success: false, updated: false, error: message };
  }
}

/**
 * Get last sync timestamp from local storage
 */
export async function getLastSyncTimestamp(tableName: string): Promise<number> {
  const { getSyncMetadata } = await import("../services/local-data");
  const metadata = await getSyncMetadata(tableName);
  return metadata?.lastSyncTimestamp ?? 0;
}

/**
 * Update last sync timestamp in local storage
 */
export async function updateLastSyncTimestamp(tableName: string, timestamp: number): Promise<void> {
  const { setSyncMetadata } = await import("../services/local-data");
  await setSyncMetadata(tableName, timestamp);
}

/**
 * Get auth error message from store
 */
export function getAuthError(): string {
  return get(authState).error || "Authentication or network error";
}

/**
 * Map local habit ID to Convex habit ID by looking up the habit by localUuid
 */
export async function mapLocalHabitIdToConvexId(localHabitId: string): Promise<string | null> {
  try {
    // Query Convex to find the habit by localUuid
    const habit = (await safeQuery(
      api.habits.getHabitByLocalUuid,
      { localUuid: localHabitId },
      { retries: 2, logErrors: false }
    )) as { _id: string } | null;

    return habit?._id || null;
  } catch (error) {
    console.warn(`Failed to map habit ID ${localHabitId}:`, error);
    return null;
  }
}

/**
 * Map local habit IDs to Convex habit IDs for multiple completions
 */
export async function mapCompletionHabitIds(
  completions: CompletionSyncData[]
): Promise<CompletionSyncData[]> {
  /**
   * Reduce Convex calls by caching local->Convex habit ID mapping per unique habitId.
   * Before: O(N) Convex lookups for N completions (one per completion).
   * After:  O(U) lookups, where U = number of unique habit IDs in the batch.
   */
  const mapped: CompletionSyncData[] = [];
  const idCache = new Map<string, string | null>(); // localHabitId -> convexHabitId|null

  for (const completion of completions) {
    const localHabitId = completion.habitId;

    // Check cache first to avoid duplicate Convex queries for the same habit
    let convexHabitId = idCache.get(localHabitId) ?? null;
    if (!idCache.has(localHabitId)) {
      convexHabitId = await mapLocalHabitIdToConvexId(localHabitId);
      idCache.set(localHabitId, convexHabitId);
    }

    if (convexHabitId) {
      mapped.push({ ...completion, habitId: convexHabitId });
    } else {
      // We intentionally keep this as a warn to surface missing mappings during sync
      console.warn(
        `Skipping completion ${completion.localUuid} - habit not found in Convex:`,
        localHabitId
      );
    }
  }

  return mapped;
}

/**
 * Perform safe Convex operation with error handling
 */
export async function performSafeOperation<T>(
  operation: () => Promise<T>,
  errorContext: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `Unknown ${errorContext} error`;
    console.error(`❌ ${errorContext}:`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Wrapper for Convex queries with proper error handling
 * Used by stores for consistent query handling
 */
export async function convexQuery(query: any, args: any): Promise<any> {
  return safeQuery(query, args, { retries: 3 });
}

/**
 * Wrapper for Convex mutations with proper error handling
 * Used by stores for consistent mutation handling
 */
export async function convexMutation(mutation: any, args: any): Promise<any> {
  return safeMutation(mutation, args, { retries: 3 });
}

/**
 * Wrapper for Convex subscriptions with proper error handling
 * Used by stores for consistent subscription handling
 */
export function convexSubscription(
  query: any,
  args: any,
  callback: (data: any) => void | Promise<void>
): () => void {
  const client = getConvexClient();
  if (!client) {
    console.warn("Convex client not available for subscription");
    return () => {};
  }

  try {
    const unsubscribe = client.onUpdate(query, args, callback);
    return unsubscribe;
  } catch (error) {
    console.error("Failed to create Convex subscription:", error);
    return () => {};
  }
}

/**
 * Test function to verify habit ID mapping works correctly
 * This can be called from the browser console for debugging
 */
export async function testHabitIdMapping(): Promise<void> {
  try {
    // Get some local habits to test with
    const { getAllHabits } = await import("../services/local-data");
    const localHabits = await getAllHabits();

    if (localHabits.length === 0) {
      console.log("ℹ️ No local habits found to test mapping");
      return;
    }

    console.log(`🧪 Testing habit ID mapping for ${localHabits.length} habits...`);

    let mappedCount = 0;
    let unmappedCount = 0;

    for (const habit of localHabits.slice(0, 5)) {
      // Test first 5 habits
      const convexId = await mapLocalHabitIdToConvexId(habit.id);
      if (convexId) {
        console.log(`✅ Mapped: ${habit.name} (${habit.id}) -> ${convexId}`);
        mappedCount++;
      } else {
        console.log(`❌ Unmapped: ${habit.name} (${habit.id})`);
        unmappedCount++;
      }
    }

    console.log(`📊 Mapping results: ${mappedCount} mapped, ${unmappedCount} unmapped`);

    if (unmappedCount > 0) {
      console.warn("⚠️ Some habits are not synced to Convex. Run a full sync to resolve.");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}
