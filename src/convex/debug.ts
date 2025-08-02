import { query } from "./_generated/server";

/**
 * Debug query to test authentication and see what getUserIdentity returns
 */
export const testAuth = query({
  args: {},
  handler: async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      console.log("[DEBUG] getUserIdentity result:", identity);
      
      if (!identity) {
        console.log("[DEBUG] No identity found - user not authenticated");
        return { success: false, message: "No identity found", identity: null };
      }
      
      return { 
        success: true, 
        message: "Authentication successful", 
        identity: {
          subject: identity.subject,
          issuer: identity.issuer,
          // Don't log the full token for security
          tokenId: typeof identity.tokenId === 'string' ? identity.tokenId.substring(0, 10) + "..." : identity.tokenId,
        }
      };
    } catch (error) {
      console.log("[DEBUG] Auth error:", error);
      return { success: false, message: `Auth error: ${error}`, identity: null };
    }
  },
});
