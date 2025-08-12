/*
 * Timed Sync Scheduler
 * - Runs a periodic check (default: 5 minutes)
 * - Triggers full sync only when local changes exist
 * - Respects auth readiness and existing concurrency guards
 * - Shows a toast on successful scheduled sync
 */

import { get } from "svelte/store";
import { toast } from "svelte-sonner";
import { authState } from "../stores/auth-state";
import { syncStore } from "../stores/sync-stores";
import { ensureFirstAppOpenTimestamp } from "../utils/convex-operations";
import { hasLocalChanges } from "./local-data";

// 5 minutes in milliseconds
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

let intervalId: number | null = null;
let running = false;
let initialized = false;
let ensuredFirstOpen = false; // ensure we set firstAppOpenAt once per session

/**
 * Wait until the current sync (triggered by us) completes or times out.
 * This observes the central sync store; avoids overlapping syncs.
 */
async function waitForSyncCompletion(timeoutMs = 60000): Promise<"synced" | "error" | "timeout"> {
  const start = Date.now();

  return new Promise((resolve) => {
    let lastStatus = get(syncStore).status;
    const unsub = syncStore.subscribe((state) => {
      // Resolve when sync reaches a terminal state
      if (state.status === "synced") {
        unsub();
        resolve("synced");
        return;
      }
      if (state.status === "error" || state.status === "offline") {
        unsub();
        resolve("error");
        return;
      }
      lastStatus = state.status;

      // Timeout guard
      if (Date.now() - start > timeoutMs) {
        unsub();
        resolve("timeout");
      }
    });
  });
}

/**
 * Single scheduler tick:
 * - Verify auth ready
 * - Ensure firstAppOpenAt (server) is set once
 * - If local changes exist and not currently syncing, trigger a full sync
 */
async function tick(): Promise<void> {
  const { clerkReady, clerkUserId } = get(authState);
  if (!clerkReady || !clerkUserId) return;

  // Best-effort: set firstAppOpenAt on the server once per session
  if (!ensuredFirstOpen) {
    ensuredFirstOpen = true;
    ensureFirstAppOpenTimestamp().catch(() => {
      // Non-fatal; proceed with scheduler even if this fails
      ensuredFirstOpen = true;
    });
  }

  // Avoid overlapping with an ongoing sync
  const current = get(syncStore);
  if (current.status === "syncing") return;

  // Only sync if there are local changes since last sync
  const pending = await hasLocalChanges();
  if (!pending) return;

  // Trigger full sync via central store (has its own guards)
  try {
    await syncStore.triggerFullSync();
    const result = await waitForSyncCompletion();
    if (result === "synced") {
      toast.success("Synced successfully");
    }
  } catch (error) {
    // Errors are handled in the store; keep scheduler quiet
  }
}

/**
 * Start the timed sync scheduler. Idempotent.
 */
export function startTimedSyncScheduler(intervalMs: number = DEFAULT_INTERVAL_MS): void {
  if (initialized) return;
  initialized = true;
  running = true;
  
  // NOTE:
  // We intentionally DO NOT run an immediate tick here. Previously, calling
  // tick() on start caused a sync attempt right after every page refresh
  // (root layout mounts -> scheduler starts -> immediate tick). That behavior
  // made sync feel like it auto-triggered on refresh, which is not desired.
  //
  // With this change, the first tick happens after the configured interval
  // (default 5 minutes). This ensures sync only runs on the timer or when
  // explicitly triggered elsewhere.

  // Periodic ticks only; first tick occurs after intervalMs
  intervalId = setInterval(() => {
    tick().catch(() => {});
  }, intervalMs) as unknown as number;
}

/** Stop the scheduler and clear timers. */
export function stopTimedSyncScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  running = false;
}

/** Whether the scheduler is currently active. */
export function isTimedSyncSchedulerRunning(): boolean {
  return running;
}
