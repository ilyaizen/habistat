import { ConvexClient } from "convex/browser";
import { browser } from "$app/environment";

// Create a single convex client instance for the application
let convexClient: ConvexClient | null = null;

export function getConvexClient(): ConvexClient | null {
  if (!browser) {
    return null; // SSR safety
  }

  if (!convexClient) {
    const convexUrl = import.meta.env.VITE_CONVEX_URL;

    if (!convexUrl) {
      console.warn("VITE_CONVEX_URL environment variable is not set");
      return null;
    }

    convexClient = new ConvexClient(convexUrl);
  }

  return convexClient;
}

// Export the client instance for convenience
export const convex = getConvexClient();
