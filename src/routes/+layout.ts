// Tauri doesn't have a Node.js server to do proper SSR
// so we will use adapter-static to prerender the app (SSG)
// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
export const prerender = true;
export const ssr = false;

import "../app.css";
import { BROWSER } from "../esm-env.js";
import { initializeTracking } from "../lib/utils/tracking";
import type { LayoutLoad } from "./$types";
import { waitLocale } from "svelte-i18n";
import "../i18n"; // Import to ensure i18n is initialized

export const load: LayoutLoad = async ({ data }) => {
  if (BROWSER) {
    // Initialize tracking on app start
    await initializeTracking();
    // Wait for i18n to be ready before rendering the app
    await waitLocale();
  }

  // Pass auth state to the layout
  return {
    isAuthenticated: data?.isAuthenticated ?? false,
    isOffline: data?.isOffline ?? true
  };
};
