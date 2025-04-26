import { sessionStore } from "$lib/utils/tracking";
import { goto } from "$app/navigation";
import { browser } from "$app/environment";

/**
 * Handles user logout/session reset with proper cleanup.
 * This utility function:
 * 1. Deletes the user's session data (both anonymous and authenticated)
 * 2. Navigates to the home page
 * 3. Forces a page reload to ensure a clean state
 *
 * @returns A promise that resolves when the logout process is complete
 */
export async function handleLogout(): Promise<void> {
  if (!browser) return;

  try {
    // Clear session data using the store's clear method
    sessionStore.clear();

    // Navigate to home page
    goto("/");

    // Force reload to ensure clean state
    setTimeout(() => {
      window.location.reload();
    }, 100);
  } catch (error) {
    console.error("Logout error:", error);
    throw error; // Rethrow to allow component-specific error handling
  }
}
