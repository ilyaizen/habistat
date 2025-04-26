import type { LayoutServerLoad } from "./$types";

// This function runs on the server for every page load.
// It accesses the session data populated by hooks.server.ts
// and makes it available to the client-side layout.
export const load: LayoutServerLoad = async ({ locals }) => {
  // Extract relevant user info from the Clerk session object
  // The structure depends on what authenticateRequest puts in locals.session
  // Assuming it follows Clerk's standard session claims structure.
  const userId = locals.session?.userId;
  // You might want to fetch email or other details if needed,
  // but userId is often sufficient for the initial association trigger.
  // const email = locals.session?. /* access email if available */;

  console.log("[+layout.server.ts] load: userId from locals:", userId);

  return {
    // Pass only necessary, serializable data to the client
    user: userId ? { id: userId /* , email: email */ } : null
  };
};
