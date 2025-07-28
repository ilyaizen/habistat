// Tauri doesn't have a Node.js server to do proper SSR
// so we will use adapter-static to prerender the app (SSG)
// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info

// For Tauri static builds, we need to prerender routes
// This ensures all HTML files exist in the build output
export const prerender = true;
export const ssr = false; // Disable SSR for static builds
export const csr = true; // Enable client-side rendering

import "../app.css";
// import { browser } from "$app/environment";

// import { dev } from "$app/environment";
// import { inject } from "@vercel/analytics";

import { waitLocale } from "svelte-i18n";
// import { logAppOpenIfNeeded } from "$lib/utils/tracking";
// import { runDiagnostics } from "$lib/utils/tauri-debug";
import type { LayoutLoad } from "./$types";
import "../i18n"; // Import to ensure i18n is initialized

// inject({ mode: dev ? "development" : "production" });

export const load: LayoutLoad = async () => {
  // Wait for locale to be loaded
  await waitLocale();

  // For static builds, authentication is handled entirely on the client side
  // The server-side data will be empty, so we initialize auth state on the client
  console.log("Root layout load function is running (static build version).");

  return {
    isAuthenticated: false, // Will be updated by client-side Clerk
    user: null, // Will be updated by client-side Clerk
    dbError: null,
    fallbackMode: false
  };
};
