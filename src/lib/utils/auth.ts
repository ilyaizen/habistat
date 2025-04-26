import { sessionStore } from "$lib/utils/tracking";
import { goto } from "$app/navigation";
import { browser } from "$app/environment";
import { getContext } from "svelte";
import type { Clerk } from "@clerk/clerk-js";

/**
 * Handles user logout/session reset with proper cleanup.
 * This utility function:
 * 1. Signs the user out of Clerk.
 * 2. Deletes the user's local session data.
 * 3. Navigates to the home page.
 *
 * @returns A promise that resolves when the logout process is complete
 */
export async function handleLogout(): Promise<void> {
  if (!browser) return;

  const clerk = getContext<Clerk | null>("clerk");

  try {
    if (clerk) {
      await clerk.signOut();
    } else {
      console.warn("Clerk instance not found in context during logout.");
    }

    sessionStore.clear();

    goto("/");
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}
