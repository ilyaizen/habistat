import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * API endpoint to provide Clerk JWT token for Convex authentication.
 * This endpoint is called by the Convex client to authenticate API requests.
 */

// Debug function to decode JWT without verification
function decodeJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to decode JWT", e);
    return null;
  }
}

export const GET: RequestHandler = async ({ locals }) => {
  try {
    // First check if we have session from server-side (via hooks.server.ts)
    const serverSession = locals.session;

    if (!serverSession) {
      console.log("[API] No server session found - user not authenticated");
      return new Response(null, { status: 401 });
    }

    // Check if this is a valid authenticated session
    if (!serverSession.isSignedIn) {
      console.log("[API] Session exists but user not signed in");
      return new Response(null, { status: 401 });
    }

    try {
      // Get auth context to access token methods
      const auth = serverSession.toAuth();

      if (!auth || !auth.userId) {
        console.log("[API] No auth context or user ID available");
        return new Response(null, { status: 401 });
      }

      console.log("[API] Getting token for user:", auth.userId);

      // Try to get a token with Convex template first
      let convexToken = null;
      try {
        if (auth.getToken) {
          convexToken = await auth.getToken({ template: "convex" });
        }
      } catch (templateError) {
        console.log("[API] Convex template not available:", templateError);
      }

      // If we got a Convex token, validate and return it
      if (convexToken) {
        const decodedToken = decodeJwt(convexToken);
        console.log("[API] ✅ Using Convex template token");
        console.log("[API] Token issuer:", decodedToken?.iss);
        console.log("[API] Token audience:", decodedToken?.aud);
        console.log("[API] Token subject:", decodedToken?.sub);

        // Validate the token has correct audience
        const hasConvexAudience =
          decodedToken?.aud &&
          (Array.isArray(decodedToken.aud)
            ? decodedToken.aud.includes("convex")
            : decodedToken.aud === "convex");

        if (!hasConvexAudience) {
          console.warn('[API] ⚠️ JWT token missing "convex" audience claim');
        }

        return new Response(convexToken, {
          status: 200,
          headers: {
            "Content-Type": "text/plain",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0"
          }
        });
      }

      // Fallback: try to get default token
      let defaultToken = null;
      try {
        if (auth.getToken) {
          defaultToken = await auth.getToken();
        }
      } catch (defaultError) {
        console.error("[API] Failed to get default token:", defaultError);
      }

      if (defaultToken) {
        const decodedToken = decodeJwt(defaultToken);
        console.log("[API] ⚠️ Using default token (may not work with Convex)");
        console.log("[API] Default token issuer:", decodedToken?.iss);
        console.log("[API] Default token audience:", decodedToken?.aud);

        return new Response(defaultToken, {
          status: 200,
          headers: {
            "Content-Type": "text/plain",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0"
          }
        });
      }

      console.error("[API] ❌ Failed to get any token from session");
      return new Response("Failed to get authentication token", { status: 401 });
    } catch (tokenError) {
      console.error("[API] Error getting token from session:", tokenError);
      return new Response("Token generation failed", { status: 500 });
    }
  } catch (error) {
    console.error("[API] ❌ Error retrieving auth token:", error);
    return new Response("Internal server error", { status: 500 });
  }
};

/**
 * Handle POST requests for token refresh (if needed)
 */
export const POST: RequestHandler = async ({ locals }) => {
  try {
    const serverSession = locals.session;

    if (!serverSession || !serverSession.isSignedIn) {
      return json({ error: "Not authenticated" }, { status: 401 });
    }

    const auth = serverSession.toAuth();
    if (!auth?.getToken) {
      return json({ error: "Token method not available" }, { status: 401 });
    }

    try {
      const token = await auth.getToken({ template: "convex" });
      return json({ token });
    } catch (error) {
      console.error("[API] Error in POST auth token:", error);
      return json({ error: "Failed to refresh token" }, { status: 500 });
    }
  } catch (error) {
    console.error("[API] Error in POST auth token:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
};
