/**
 * Utility functions for testing the authentication flow
 *
 * This file contains functions to test and validate the authentication flow
 * in development environments. It simulates the interaction with Clerk and
 * provides debug information about the current session state.
 */

import {
  anonymousSession,
  getSessionState,
  markSessionAuthInitiated,
  markSessionClaimed,
  migrateSession,
  isSessionMigrated,
  getMigrationDetails
} from "./tracking";
import { get } from "svelte/store";

/**
 * Simulates the authentication flow for testing purposes
 * @param clerkUserId The simulated Clerk user ID
 */
export async function simulateAuthFlow(clerkUserId: string = "clerk_test_user"): Promise<void> {
  console.group("🔐 Simulating Auth Flow");

  // Step 1: Get current state
  const initialState = getSessionState();
  const sessionData = get(anonymousSession);

  console.log("Initial session state:", initialState);
  console.log("Anonymous session data:", sessionData);

  // Step 2: Initiate auth
  console.log("Initiating auth...");
  markSessionAuthInitiated();
  console.log("New session state:", getSessionState());

  // Step 3: Simulate Clerk authentication
  console.log("Simulating Clerk auth completion...");
  markSessionClaimed();
  console.log("New session state after claim:", getSessionState());

  // Step 4: Migrate session
  console.log("Migrating session data...");
  const migrationResult = await migrateSession(clerkUserId, async () => {
    // Simulate data migration processing
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("Performed data migration tasks");
  });

  console.log("Migration successful:", migrationResult);
  console.log("Session migrated?", isSessionMigrated());
  console.log("Migration details:", getMigrationDetails());

  console.groupEnd();
}

/**
 * Reset the authentication state for testing
 */
export function resetAuthState(): void {
  console.group("🧹 Resetting Auth State");

  // Clear localStorage entries for auth
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_initiated");
    localStorage.removeItem("auth_claimed");
    localStorage.removeItem("migrated_session");

    // Don't clear the anonymous session itself to preserve data
    console.log("Auth state reset. Anonymous session preserved.");
  }

  console.groupEnd();
}

/**
 * Log current auth state for debugging
 */
export function logAuthState(): void {
  console.group("📊 Current Auth State");

  console.log("Session state:", getSessionState());
  console.log("Anonymous session:", get(anonymousSession));
  console.log("Session migrated?", isSessionMigrated());
  console.log("Migration details:", getMigrationDetails());

  console.groupEnd();
}
