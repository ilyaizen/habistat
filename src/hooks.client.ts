import type { HandleClientError } from "@sveltejs/kit";
import { browser } from "$app/environment";
import "./i18n"; // Import to ensure i18n is initialized

// Add error handling function
export const handleError: HandleClientError = ({ error, event }) => {
  console.error("An error occurred:", error);
  return {
    message: "An unexpected error occurred."
  };
};
