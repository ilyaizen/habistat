import type { HandleClientError } from "@sveltejs/kit";
import { browser } from "$app/environment";
import "./i18n"; // Import to ensure i18n is initialized
import { type } from "@tauri-apps/plugin-os";
import { PUBLIC_CLERK_PUBLISHABLE_KEY } from "$env/static/public";

// Initialize Tauri plugins
if (browser && (window as any).__TAURI__) {
  try {
    const osType = type();
    console.log("OS Type:", osType);
  } catch (error) {
    console.error("Failed to get OS type:", error);
  }
}

// Clerk initialization is handled by ClerkProvider in layout, remove this block
// initializeClerk(PUBLIC_CLERK_PUBLISHABLE_KEY, {
//   afterSignInUrl: "/dashboard/",
//   afterSignUpUrl: "/dashboard/",
//   signInUrl: "/sign-in",
//   signUpUrl: "/sign-up"
// });

// Add error handling function
export const handleError: HandleClientError = async ({ error, event }) => {
  console.error(error, event);
};
