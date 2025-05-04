import type { Handle } from "@sveltejs/kit";
import { dev } from "$app/environment";
// Import the Clerk client factory
import { createClerkClient } from "@clerk/backend";
import { CLERK_SECRET_KEY } from "$env/static/private";
// Import the public key without VITE prefix for server-side
import { PUBLIC_CLERK_PUBLISHABLE_KEY } from "$env/static/public";

// Instantiate Clerk client, providing both keys
const clerkClient = createClerkClient({
  secretKey: CLERK_SECRET_KEY,
  publishableKey: PUBLIC_CLERK_PUBLISHABLE_KEY
});

// Simplified handle function for svelte-clerk
export const handle: Handle = async ({ event, resolve }) => {
  if (dev) {
    console.log("[hooks.server.ts] Incoming request path:", event.url.pathname);
    console.log("[hooks.server.ts] Request headers:", Object.fromEntries(event.request.headers));
  }

  try {
    // Get session using Clerk client
    const session = await clerkClient.authenticateRequest(event.request);

    if (dev) {
      const auth = session?.toAuth();
      console.log("[hooks.server.ts] Clerk session result:", {
        hasSession: !!session,
        status: session?.status,
        userId: auth?.sessionClaims?.sub
      });
    }

    const auth = session?.toAuth();
    event.locals.session = {
      ...session,
      userId: auth?.sessionClaims?.sub
    };
  } catch (error) {
    if (dev) {
      console.error("[hooks.server.ts] Auth error:", error);
    }
    // Don't throw the error, just set session to null
    event.locals.session = null;
  }

  // Resolve the request
  return resolve(event);
};

// Remove the previous baseHandle and clerkHandle logic
/*
// Create a base handle that always works
const baseHandle: Handle = async ({ event, resolve }) => {
  // Add any custom server-side logic here BEFORE Clerk handles it
  // e.g., checking for offline status based on headers if applicable

  return await resolve(event);
};

// Configure Clerk handle using the correct function name
const clerkHandle = handleClerk(CLERK_SECRET_KEY, {
  debug: dev,
  // Define paths Clerk should *not* protect or process auth for
  // Leave empty if Clerk should manage auth on all non-auth paths by default
  protectedPaths: ["/dashboard"], // Updated protected path
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
    }
  }
}

// Sequence the handles: baseHandle runs first, then clerkHandle
// Clerk needs to run AFTER any base logic but BEFORE SvelteKit resolves the page
export const handle: Handle = sequence(baseHandle, clerkHandle); // Enable Clerk handle
*/
