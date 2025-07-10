import { browser } from "$app/environment";

/**
 * Context menu utility functions for browser actions.
 */

/**
 * Refreshes the current page.
 */
export function handleRefresh() {
  if (!browser) return;

  console.log("Refreshing...");
  window.location.reload();
}

/**
 * Reloads the current page (alias for handleRefresh).
 */
export function reloadPage() {
  if (!browser) return;

  window.location.reload();
}

/**
 * Triggers the browser's save dialog (uses print as fallback).
 */
export function savePageAs() {
  if (!browser) return;

  // Simulate Ctrl+S (browser default), or show a message
  // Optionally, trigger print dialog as a placeholder
  window.print();
}

/**
 * Shows instructions for opening developer tools.
 */
export function openDevTools() {
  if (!browser) return;

  // In Tauri, you could use the Tauri API to open devtools
  // In browser, show a message (cannot programmatically open devtools)
  alert("Press Ctrl+Shift+I to open Developer Tools");
}
