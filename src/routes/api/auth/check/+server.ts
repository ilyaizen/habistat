import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * Debug endpoint to check authentication status
 * Returns detailed information about the current auth state
 */

// Define proper types for the debug response
interface AuthDebugInfo {
  timestamp: string;
  hasAuth: boolean;
  authDetails: Record<string, any>;
  cookies: Record<string, string>;
  authStatus: string;
}

export const GET: RequestHandler = async ({ locals, cookies }) => {
  const debugInfo: AuthDebugInfo = {
    timestamp: new Date().toISOString(),
    hasAuth: !!locals.auth,
    authDetails: {},
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

  const { auth } = locals;

  if (auth) {
    try {
      // Type guard to check if auth object has required authenticated properties
      const isAuthenticated = "userId" in auth && auth.userId;
      const hasGetToken = "getToken" in auth && typeof auth.getToken === "function";

      debugInfo.authDetails = {
        isSignedIn: isAuthenticated,
        hasGetToken: hasGetToken,
        userId: isAuthenticated ? auth.userId : null,
        sessionId: "sessionId" in auth ? auth.sessionId : null
      };

      if (isAuthenticated) {
        debugInfo.authStatus = "signed_in";
      } else {
        debugInfo.authStatus = "not_signed_in";
      }
    } catch (authError) {
      debugInfo.authDetails = {
        error: (authError as Error).message
      };
      debugInfo.authStatus = "auth_error";
    }
  } else {
    debugInfo.authStatus = "no_auth";
  }

  console.log("[API] Auth check result:", debugInfo);

  return json(debugInfo);
};
