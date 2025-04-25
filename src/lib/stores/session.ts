import { writable } from "svelte/store";
import { browser } from "$app/environment";

// Create a store for tracking if session is claimed
const sessionClaimed = writable(false);

// Function to mark session as claimed
export function claimSession() {
  if (browser) {
    sessionClaimed.set(true);
    console.log("Session marked as claimed");
  }
}

// Function to check if session is claimed
export function isSessionClaimed() {
  let claimed = false;
  sessionClaimed.subscribe((value) => {
    claimed = value;
  })();
  return claimed;
}

// Export the store
export { sessionClaimed };
