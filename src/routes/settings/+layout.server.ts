// This file opts out all routes under /settings from prerendering.
// Settings pages are dynamic and require a user session.
export const prerender = false;
