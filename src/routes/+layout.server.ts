import type { LayoutServerLoad } from "./$types";
// import { dev } from "$app/environment";

// This function runs on the server for every page load.
// It accesses the session data populated by hooks.server.ts
// and makes it available to the client-side layout.
export const load: LayoutServerLoad = async ({ locals }) => {
  // Extract relevant user info from the Clerk session object
  const userId = locals.session?.claims?.sub;

  // if (dev) {
  //   console.log("[+layout.server.ts] Current path:", url.pathname);
  //   console.log("[+layout.server.ts] Auth state:", {
  //     hasLocals: !!locals,
  //     hasSession: !!locals.session,
  //     userId,
  //     claims: locals.session?.claims
  //   });
  // }

  return {
    // Pass only necessary, serializable data to the client
    user: userId ? { id: userId } : null
  };
};
