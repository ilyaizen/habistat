import type { LayoutLoad } from "./$types";

// This file opts out all dynamic calendar routes from prerendering.
// In an SPA setup with adapter-static and a fallback page,
// the client-side router is responsible for handling these routes.
export const prerender = false;
export const ssr = false;

export const load: LayoutLoad = async ({ params }) => {
  return {
    calendarId: params.calendarId
  };
};
