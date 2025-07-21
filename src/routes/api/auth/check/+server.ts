import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * Debug endpoint to check authentication status
 * Returns detailed information about the current auth state
 */

// Define proper types for the debug response
interface AuthDebugInfo {
  timestamp: string;
  hasSession: boolean;
  sessionDetails: Record<string, any>;
  cookies: Record<string, string>;
  authStatus: string;
}

export const GET: RequestHandler = async ({ locals, cookies }) => {
  const debugInfo: AuthDebugInfo = {
    timestamp: new Date().toISOString(),
    hasSession: !!locals.session,
    sessionDetails: {},
    cookies: {},
    authStatus: "unknown"
  };

  // Check for cookies
  debugInfo.cookies = {
    __session: cookies.get("__session") ? "true" : "false",
    __clerk_db_jwt: cookies.get("__clerk_db_jwt") ? "true" : "false",
    __secure_clerk_db_jwt: cookies.get("__Secure-clerk-db-jwt") ? "true" : "false",
    __host_clerk_db_jwt: cookies.get("__Host-clerk-db-jwt") ? "true" : "false"
  };

  if (locals.session) {
    try {
      debugInfo.sessionDetails = {
        isSignedIn: locals.session.isSignedIn,
        hasToAuth: typeof locals.session.toAuth === "function"
      };

      if (locals.session.isSignedIn) {
        debugInfo.authStatus = "signed_in";

        try {
          const auth = locals.session.toAuth();
          debugInfo.sessionDetails.userId = auth?.userId;
          debugInfo.sessionDetails.sessionId = auth?.sessionId;
          debugInfo.sessionDetails.hasGetToken = typeof auth?.getToken === "function";
        } catch (authError) {
          debugInfo.sessionDetails.authError = (authError as Error).message;
          debugInfo.authStatus = "auth_error";
        }
      } else {
        debugInfo.authStatus = "not_signed_in";
      }
    } catch (sessionError) {
      debugInfo.sessionDetails = {
        error: (sessionError as Error).message
      };
      debugInfo.authStatus = "session_error";
    }
  } else {
    debugInfo.authStatus = "no_session";
  }

  console.log("[API] Auth check result:", debugInfo);

  return json(debugInfo);
};

/**
 * Handle POST requests for more detailed token validation if needed
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    // Extract the token from the request body if sent as JSON
    const body = await request.json().catch(() => null);

    // Check Authorization header first
    const authHeader = request.headers.get("Authorization");
    let token = null;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "");
    } else if (body?.token) {
      token = body.token;
    }

    if (!token || token.trim() === "") {
      return json({ valid: false, error: "No token provided" }, { status: 401 });
    }

    // Basic validation - could be enhanced with actual token verification
    return json({
      valid: true,
      // Don't include the full token in the response for security
      tokenPreview: `${token.substring(0, 10)}...`
    });
  } catch (error) {
    console.error("[API] Error in POST auth validation:", error);
    return json(
      {
        valid: false,
        error: "Server error validating token"
      },
      { status: 500 }
    );
  }
};
