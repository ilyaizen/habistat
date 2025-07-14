import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * API endpoint to provide Clerk JWT token for Convex authentication.
 * This endpoint is called by the Convex client to authenticate API requests.
 */
export const GET: RequestHandler = async ({ cookies, request, locals }) => {
  try {
    // First check if we have session from server-side (via hooks.server.ts)
    const serverSession = locals.session;

    // Get the Clerk session token from cookies
    // Clerk typically stores the session token in a cookie named '__session'
    const sessionToken =
      cookies.get("__session") ||
      cookies.get("__clerk_db_jwt") ||
      cookies.get("__Secure-clerk-db-jwt") ||
      cookies.get("__Host-clerk-db-jwt");

    if (!sessionToken && !serverSession) {
      // No session token found - user is not authenticated
      console.log("[API] No session token or server session found");
      return new Response(null, { status: 401 });
    }

    // Log for debugging
    // console.log("[API] Session token found:", !!sessionToken);
    // console.log("[API] Server session found:", !!serverSession);

    // Debug: Log token format (first 50 chars to avoid logging full token)
    // if (sessionToken) {
    //   console.log("[API] Token preview:", sessionToken.substring(0, 50) + "...");
    //   console.log("[API] Token length:", sessionToken.length);
    // }

    // Return the session token as plain text (Convex expects this format)
    return new Response(sessionToken || "", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0"
      }
    });
  } catch (error) {
    console.error("[API] Error retrieving auth token:", error);
    return new Response(null, { status: 500 });
  }
};

/**
 * Handle POST requests for token refresh (if needed)
 */
export const POST: RequestHandler = async ({ cookies }) => {
  try {
    // For POST, we also return the current session token
    // This can be used for token refresh scenarios
    const sessionToken =
      cookies.get("__session") ||
      cookies.get("__clerk_db_jwt") ||
      cookies.get("__Secure-clerk-db-jwt") ||
      cookies.get("__Host-clerk-db-jwt");

    if (!sessionToken) {
      return json({ error: "No session token" }, { status: 401 });
    }

    return json({ token: sessionToken });
  } catch (error) {
    console.error("[API] Error in POST auth token:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
};
