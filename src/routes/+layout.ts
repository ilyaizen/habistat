// Tauri doesn't have a Node.js server to do proper SSR
// so we will use adapter-static to prerender the app (SSG)
// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info

// For Tauri static builds, we need to prerender routes
// This ensures all HTML files exist in the build output
export const prerender = true;
export const ssr = false; // Disable SSR for static builds
export const csr = true; // Enable client-side rendering

import "../app.css";
import { browser } from "$app/environment";

// import { dev } from "$app/environment";
// import { inject } from "@vercel/analytics";

import { waitLocale } from "svelte-i18n";
import { logAppOpenIfNeeded } from "$lib/utils/tracking";
// import { runDiagnostics } from "$lib/utils/tauri-debug";
import type { LayoutLoad } from "./$types";
import "../i18n"; // Import to ensure i18n is initialized
import { getDb } from "$lib/db/client";

// inject({ mode: dev ? "development" : "production" });

export const load: LayoutLoad = async ({ data }) => {
  if (browser) {
    // Initialize the database as early as possible
    getDb().catch((err: unknown) => {
      console.error("Database initialization failed:", err);
    });

    // Run Tauri diagnostics first in development
    // if (dev) {
    //   runDiagnostics().catch(console.error);
    // }

    await logAppOpenIfNeeded();

    // Wait for i18n to be ready before rendering the app with timeout
    try {
      await Promise.race([
        waitLocale(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("waitLocale timeout")), 5000))
      ]);
    } catch (error) {
      console.error("waitLocale failed or timed out:", error);
      // Continue without waiting for i18n
    }
  }

  // Pass auth state to the layout
  return {
    isAuthenticated: !!data?.user
  };
};
