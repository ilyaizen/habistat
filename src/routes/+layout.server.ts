import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
  // TODO: 2025-04-14 - Implement actual logic to determine auth state and offline status
  const isAuthenticated = false; // Placeholder
  const isOffline = false; // Placeholder, consider checking network status if possible server-side

  return {
    isAuthenticated,
    isOffline
  };
};
