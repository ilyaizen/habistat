import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { dev } from "$app/environment";
import { handleClerk } from "clerk-sveltekit/server";
import { CLERK_SECRET_KEY } from "$env/static/private";

// Create a base handle that always works
const baseHandle: Handle = async ({ event, resolve }) => {
  // Check if we need to protect this path
  // const isProtectedPath = event.url.pathname.startsWith("/dashboard");
  // const isAuthPath = ["/sign-in", "/sign-up"].some((path) => event.url.pathname.startsWith(path));

  // if (isProtectedPath && !event.locals.auth?.userId && !event.locals.isOffline) {
  //   return new Response(null, {
  //     status: 302,
  //     headers: { Location: "/sign-in" }
  //   });
  // }

  return await resolve(event);
};

// Configure Clerk handle
const clerkHandle = handleClerk(CLERK_SECRET_KEY, {
  debug: dev,
  protectedPaths: [],
  signInUrl: "/sign-in"
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
      isAuthenticated?: boolean;
      isOffline?: boolean;
    }
  }
}

// Sequence the handles
export const handle: Handle = baseHandle; // Temporarily disable Clerk handle
