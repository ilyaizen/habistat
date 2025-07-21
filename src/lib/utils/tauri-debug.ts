// Tauri Webview Debug Utilities
// These help identify issues specific to Tauri's webview that don't appear in regular browsers

import { browser } from "$app/environment";

/**
 * Detects if running in Tauri webview vs regular browser
 */
export function isTauriWebview(): boolean {
  if (!browser) return false;

  // Multiple detection methods for Tauri
  return (
    // @ts-expect-error - Tauri global exists in webview
    typeof window.__TAURI__ !== "undefined" ||
    // @ts-expect-error - Tauri IPC exists in webview
    typeof window.__TAURI_IPC__ !== "undefined" ||
    // User agent detection as fallback
    navigator.userAgent.includes("Tauri")
  );
}

/**
 * Comprehensive environment detection and logging
 */
export function logEnvironmentInfo(): void {
  if (!browser) return;
}

/**
 * Monitor for white screen conditions
 */
export function monitorWhiteScreen(): void {
  if (!browser) return;

  const checkInterval = 1000; // Check every second
  let checks = 0;
  const maxChecks = 30; // Check for 30 seconds

  const monitor = setInterval(() => {
    checks++;

    // const body = document.body;
    // const hasContent = body && body.children.length > 0;
    const appRoot = document.querySelector("[data-sveltekit-preload-data]");
    const appHasContent = appRoot && appRoot.children.length > 0;

    if (checks >= maxChecks) {
      clearInterval(monitor);
    } else if (appHasContent) {
      clearInterval(monitor);
    }
  }, checkInterval);
}

/**
 * Test sql.js loading specifically in Tauri webview
 */
export async function testSqlJsLoading(): Promise<void> {
  if (!browser) return;

  try {
    // Test WASM file accessibility without initializing sql.js
    // (the main db client handles proper initialization with SvelteKit fetch)
    const wasmUrl = import.meta.env.DEV
      ? "/node_modules/sql.js/dist/sql-wasm.wasm"
      : "/sql-wasm.wasm";

    const wasmResponse = await fetch(wasmUrl);
    if (!wasmResponse.ok) {
      console.error(`WASM file not accessible: ${wasmResponse.status} ${wasmResponse.statusText}`);
      return;
    }

    console.log("SQL.js WASM file is accessible");

    // Note: We don't initialize sql.js here to avoid duplicate initialization
    // The main database client in src/lib/db/client.ts handles proper initialization
    // with SvelteKit's fetch function to prevent warnings
  } catch (error: unknown) {
    console.error("SQL.js WASM accessibility test failed:", error);
  }
}

/**
 * Test all critical async operations that might cause white screen
 */
export async function runDiagnostics(): Promise<void> {
  if (!browser) return;

  logEnvironmentInfo();
  monitorWhiteScreen();

  // Test async operations that commonly cause issues
  try {
    await testSqlJsLoading();
  } catch (error: unknown) {
    console.error("SQL.js test failed:", error);
  }

  // Test i18n if it's used
  try {
    const { waitLocale } = await import("svelte-i18n");
    await waitLocale();
  } catch (error: unknown) {
    console.error("i18n loading failed:", error);
  }
}
