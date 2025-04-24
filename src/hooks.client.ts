import type { HandleClientError } from "@sveltejs/kit";
import { browser } from "$app/environment";
import "./i18n"; // Import to ensure i18n is initialized
import { type } from "@tauri-apps/plugin-os";

// Initialize Tauri plugins
if (browser && (window as any).__TAURI__) {
  try {
    const osType = type();
    console.log("OS Type:", osType);
  } catch (error) {
    console.error("Failed to get OS type:", error);
  }
}

// Add error handling function
export const handleError: HandleClientError = ({ error, event }) => {
  console.error("An error occurred:", error);
  return {
    message: "An unexpected error occurred."
  };
};
