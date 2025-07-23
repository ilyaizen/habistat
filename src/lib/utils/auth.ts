// import { goto } from "$app/navigation";
// import { browser } from "$app/environment";
// import { getContext } from "svelte";
import type { LoadedClerk } from "@clerk/types";
import { sessionStore } from "$lib/utils/tracking";

/**
 * Handles user logout/session reset with proper cleanup.
 * Accepts a LoadedClerk instance (from Svelte getContext) as an argument.
 *
 * @param clerk The LoadedClerk instance or null
 * @returns A promise that resolves when the logout process is complete
 */
export async function handleLogout(clerk: LoadedClerk | null): Promise<void> {
  if (!clerk || typeof clerk.signOut !== "function") {
    console.warn("Clerk instance not available for logout.");
    return;
  }
  try {
    await clerk.signOut();
    // Clear the existing session
    sessionStore.clear();
    // Create a new anonymous session
    sessionStore.ensure();
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}
