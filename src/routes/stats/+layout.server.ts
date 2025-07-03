// This file opts out all routes under /stats from prerendering.
// Stats pages are dynamic and require a user session.
export const prerender = false;
