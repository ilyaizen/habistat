import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * API endpoint to provide Clerk JWT token for Convex authentication.
 * This endpoint is called by the Convex client to authenticate API requests.
 */
export const GET: RequestHandler = async ({ locals }) => {
  console.log("[API] Token endpoint called");

  const { auth } = locals;

  // Type guard to check if auth object has required authenticated properties
  if (!auth || !("userId" in auth) || !auth.userId) {
    console.error("[API] ❌ No valid authentication - user not signed in");
    return new Response("Authentication required: Not signed in.", {
      status: 401
    });
  }

  // Type guard to check if getToken method is available
  if (!("getToken" in auth) || typeof auth.getToken !== "function") {
    console.error("[API] ❌ getToken method not available on auth object");
    return new Response("Authentication required: Token method not available.", {
      status: 401
    });
  }

  try {
    const token = await auth.getToken({ template: "convex" });

    if (!token) {
      console.error("[API] ❌ Failed to retrieve token from Clerk");
      return new Response("Failed to retrieve token.", {
        status: 500
      });
    }

    console.log("[API] ✅ Token retrieved successfully for user:", auth.userId);
    return new Response(token, { status: 200 });
  } catch (error) {
    console.error("[API] ❌ Error retrieving token:", error);
    return new Response("Authentication error.", {
      status: 500
    });
  }
};

/**
 * Handle POST requests for token refresh (if needed)
 */
export const POST: RequestHandler = async ({ locals }) => {
  console.log("[API] Token POST endpoint called");

  const { auth } = locals;

  // Type guard to check if auth object has required authenticated properties
  if (!auth || !("userId" in auth) || !auth.userId) {
    console.error("[API] ❌ No valid authentication - user not signed in");
    return json({ error: "Not authenticated" }, { status: 401 });
  }

  // Type guard to check if getToken method is available
  if (!("getToken" in auth) || typeof auth.getToken !== "function") {
    console.error("[API] ❌ getToken method not available on auth object");
    return json({ error: "Token method not available" }, { status: 401 });
  }

  try {
    const token = await auth.getToken({ template: "convex" });

    if (!token) {
      console.error("[API] ❌ Failed to retrieve token from Clerk");
      return json({ error: "Failed to refresh token" }, { status: 500 });
    }

    console.log("[API] ✅ Token refreshed successfully for user:", auth.userId);
    return json({ token });
  } catch (error) {
    console.error("[API] ❌ Error in POST auth token:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
};
