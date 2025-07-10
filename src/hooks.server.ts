import type { Handle } from "@sveltejs/kit";
import { CLERK_SECRET_KEY } from "$env/static/private";

/**
 * Server-side handle hook to process Clerk authentication.
 * This runs on every request and populates locals.session with user auth state.
 */
export const handle: Handle = async ({ event, resolve }) => {
  // Initialize session as null
  event.locals.session = null;

  try {
    // Get the session token from cookies
    const sessionToken =
      event.cookies.get("__session") ||
      event.cookies.get("__clerk_db_jwt") ||
      event.cookies.get("__Secure-clerk-db-jwt") ||
      event.cookies.get("__Host-clerk-db-jwt");

    if (sessionToken && CLERK_SECRET_KEY) {
      // TODO: Verify the JWT token with Clerk
      // For now, we'll just populate a basic session structure
      // In a full implementation, you'd validate the JWT here
      event.locals.session = {
        claims: {
          sub: "user-from-jwt" // This would be extracted from the actual JWT
        }
      } as any;
    }
  } catch (error) {
    console.error("[hooks.server] Error processing session:", error);
  }

  return resolve(event);
};
