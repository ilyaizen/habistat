import { createClerkClient } from "@clerk/backend";
import type { Handle } from "@sveltejs/kit";
import { CLERK_SECRET_KEY } from "$env/static/private";
import { PUBLIC_CLERK_PUBLISHABLE_KEY } from "$env/static/public";

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

    if (sessionToken && CLERK_SECRET_KEY && PUBLIC_CLERK_PUBLISHABLE_KEY) {
      // Create Clerk client for server-side verification
      const clerkClient = createClerkClient({
        secretKey: CLERK_SECRET_KEY,
        publishableKey: PUBLIC_CLERK_PUBLISHABLE_KEY
      });

      try {
        // Verify the session token with Clerk
        const requestState = await clerkClient.authenticateRequest(event.request, {
          secretKey: CLERK_SECRET_KEY,
          publishableKey: PUBLIC_CLERK_PUBLISHABLE_KEY
        });

        if (requestState.isSignedIn) {
          const auth = requestState.toAuth();
          console.log("[hooks.server] User authenticated:", auth.userId);
          event.locals.session = requestState;
        } else {
          console.log("[hooks.server] User not signed in");
        }
      } catch (verifyError) {
        console.error("[hooks.server] Error verifying session:", verifyError);
        // Try fallback session creation for development
        if (sessionToken) {
          try {
            const session = await clerkClient.sessions.getSession(sessionToken);
            if (session) {
              console.log("[hooks.server] Created fallback session for user:", session.userId);
              // Create a minimal RequestState-like object
              event.locals.session = {
                userId: session.userId,
                sessionId: session.id,
                toAuth: () => ({
                  userId: session.userId,
                  sessionId: session.id,
                  getToken: async (options?: { template?: string }) => {
                    const token = await clerkClient.sessions.getToken(
                      session.id,
                      options?.template || "convex"
                    );
                    return String(token);
                  }
                })
              } satisfies {
                userId: string;
                sessionId: string;
                toAuth: () => {
                  userId: string;
                  sessionId: string;
                  getToken: (options?: { template?: string }) => Promise<string | null>;
                };
              };
            }
          } catch (fallbackError) {
            console.error("[hooks.server] Fallback session creation failed:", fallbackError);
          }
        }
      }
    } else {
      if (!CLERK_SECRET_KEY) {
        console.error("[hooks.server] CLERK_SECRET_KEY not configured");
      }
      if (!PUBLIC_CLERK_PUBLISHABLE_KEY) {
        console.error("[hooks.server] PUBLIC_CLERK_PUBLISHABLE_KEY not configured");
      }
    }
  } catch (error) {
    console.error("[hooks.server] Error processing session:", error);
  }

  return resolve(event);
};
