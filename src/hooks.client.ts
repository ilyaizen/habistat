import type { HandleClientError } from "@sveltejs/kit";
// import { browser } from "$app/environment";
import "./i18n"; // Import to ensure i18n is initialized

// Add error handling function
export const handleError: HandleClientError = async ({ error, event }) => {
  console.error("SvelteKit client error:", error, event);
};

export function init() {
  // This function can be used for client-side initialization
  // if (browser) {
  // }
}
