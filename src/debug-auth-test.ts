/**
 * Authentication debugging utility
 * Use this to test the complete auth flow and diagnose race conditions
 */

import { get } from "svelte/store";
import { authState } from "$lib/stores/auth-state";
import { isAuthReady, refreshConvexToken } from "$lib/utils/convex";

/**
 * Debug the complete authentication flow
 * Run this in the browser console to test auth state
 */
export async function debugAuthFlow(): Promise<void> {
  console.log("🔍 Starting authentication flow debug...");
  console.log("==========================================");

  // 1. Check Clerk loading status
  console.log("1. Checking Clerk status...");
  const clerkLoaded = typeof window !== "undefined" && window.Clerk !== undefined;
  console.log(`   ✅ Clerk loaded: ${clerkLoaded}`);

  if (clerkLoaded && window.Clerk) {
    console.log(`   ✅ Clerk user: ${window.Clerk.user ? "Signed in" : "Not signed in"}`);
    if (window.Clerk.user) {
      console.log(`   ✅ User ID: ${window.Clerk.user.id}`);
      console.log(
        `   ✅ User email: ${window.Clerk.user.emailAddresses[0]?.emailAddress || "No email"}`
      );
    }
  }

  // 2. Check auth state store
  console.log("\n2. Checking auth state store...");
  const authStateData = get(authState);
  console.log(`   ✅ Clerk ready: ${authStateData.clerkReady}`);
  console.log(`   ✅ Clerk user ID: ${authStateData.clerkUserId || "None"}`);
  console.log(`   ✅ Convex auth status: ${authStateData.convexAuthStatus}`);
  console.log(`   ✅ Auth error: ${authStateData.error || "None"}`);

  // 3. Check Convex authentication readiness
  console.log("\n3. Checking Convex authentication...");
  const convexAuthReady = isAuthReady();
  console.log(`   ✅ Convex auth ready: ${convexAuthReady}`);

  // 4. Test token retrieval
  console.log("\n4. Testing token retrieval...");
  try {
    const token = await refreshConvexToken();
    if (token) {
      console.log("   ✅ Token retrieval: SUCCESS");

      // Parse and display token info (safe parts only)
      try {
        const tokenParts = token.split(".");
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log("   ✅ Token claims:");
          console.log(`      - Issuer (iss): ${payload.iss}`);
          console.log(`      - Audience (aud): ${payload.aud}`);
          console.log(`      - Subject (sub): ${payload.sub || payload.user_id || "missing"}`);
          console.log(
            `      - Expires: ${payload.exp ? new Date(payload.exp * 1000).toISOString() : "unknown"}`
          );
          console.log(
            `      - Issued at: ${payload.iat ? new Date(payload.iat * 1000).toISOString() : "unknown"}`
          );
        }
      } catch (parseError) {
        console.warn("   ⚠️ Could not parse token for debug info");
      }
    } else {
      console.log("   ❌ Token retrieval: FAILED");
    }
  } catch (error) {
    console.error("   ❌ Token retrieval error:", error);
  }

  // 5. Test a simple query (if available)
  console.log("\n5. Testing query execution...");
  try {
    // Import the convex client
    const { convex } = await import("$lib/utils/convex");
    if (convex && window.location.pathname.includes("dashboard")) {
      // Only test if we're in dashboard context where API is available
      console.log("   ℹ️ Dashboard context detected, skipping query test to avoid errors");
    } else {
      console.log("   ℹ️ Not in dashboard context, query test skipped");
    }
  } catch (error) {
    console.log("   ℹ️ Query test skipped due to context");
  }

  // 6. Summary
  console.log("\n6. Summary:");
  console.log("==========================================");

  const allGood =
    clerkLoaded && authStateData.clerkReady && authStateData.clerkUserId && convexAuthReady;

  if (allGood) {
    console.log("✅ ALL SYSTEMS GO! Authentication is fully ready.");
    console.log("✅ You should be able to sync and make queries without issues.");
  } else {
    console.log("❌ ISSUES DETECTED:");
    if (!clerkLoaded) console.log("   - Clerk not loaded");
    if (!authStateData.clerkReady) console.log("   - Clerk not ready in auth state");
    if (!authStateData.clerkUserId) console.log("   - No Clerk user ID");
    if (!convexAuthReady) console.log("   - Convex authentication not ready");
    console.log("\n💡 Try refreshing the page or signing out and back in.");
  }

  console.log("==========================================");
  console.log("🔍 Authentication debug complete!");
}

// Make it available globally for easy console access
if (typeof window !== "undefined") {
  (window as any).debugAuthFlow = debugAuthFlow;
  console.log("💡 You can now run debugAuthFlow() in the browser console to test authentication");
}
