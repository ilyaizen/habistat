import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { dev } from "$app/environment";
import { handleClerk } from "clerk-sveltekit/server";
import { CLERK_SECRET_KEY } from "$env/static/private";

// Create a base handle that always works
const baseHandle: Handle = async ({ event, resolve }) => {
  // Add any custom server-side logic here BEFORE Clerk handles it
  // e.g., checking for offline status based on headers if applicable

  return await resolve(event);
};

// Configure Clerk handle
const clerkHandle = handleClerk(CLERK_SECRET_KEY, {
  debug: dev,
  // Define paths Clerk should *not* protect or process auth for
  // Leave empty if Clerk should manage auth on all non-auth paths by default
  protectedPaths: [], // You can add paths like ['/dashboard'] later if needed
  signInUrl: "/sign-in" // Ensure this matches your sign-in route
});

// Add type declarations for locals
declare global {
  namespace App {
    interface Locals {
      auth: {
        userId: string | null;
        sessionId: string | null;
        getToken: () => Promise<string | null>;
      };
      isAuthenticated?: boolean; // Your custom flag
      isOffline?: boolean; // Your custom flag
    }
  }
}

// Sequence the handles: baseHandle runs first, then clerkHandle
// Clerk needs to run AFTER any base logic but BEFORE SvelteKit resolves the page
export const handle: Handle = sequence(baseHandle, clerkHandle); // Enable Clerk handle
