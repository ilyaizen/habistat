import type { PageServerLoad } from "./$types";
// import { redirect } from "@sveltejs/kit"; // No longer needed for redirection

// Server-side load function to protect the dashboard route
export const load: PageServerLoad = async ({ locals, url }) => {
  // If no session or no userId, redirect to sign-in
  // if (!locals.session || !locals.session.userId) {
  //   throw redirect(302, `/sign-in?redirectTo=${encodeURIComponent(url.pathname)}`);
  // }
  // Optionally, pass user info to the page if needed
  return {};
};
