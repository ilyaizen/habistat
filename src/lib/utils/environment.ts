/**
 * Utility functions for environment detection
 * Identifies whether the app is running in a browser, desktop (Windows/Mac/Linux),
 * or mobile (Android/iOS) environment
 */

import { browser } from "$app/environment";
// import { invoke } from "@tauri-apps/api/core";

// Import the OS plugin API
import * as os from "@tauri-apps/plugin-os";

// Define the possible environments the app can run in
export enum Environment {
  Windows = "Windows",
  Mac = "macOS",
  Linux = "Linux",
  Android = "Android",
  iOS = "iOS",
  Browser = "Browser",
  Unknown = "Unknown"
}

/**
 * Gets the platform name where the app is running
 * @returns A string representing the platform (Browser, Windows, macOS, Linux, Android, iOS)
 */
export async function getPlatformName(): Promise<string> {
  // If not in browser (SSR), return early
  if (!browser) return "Server";

  // Remove the window.__TAURI__ check
  // const runningInTauri = !!(window as any).__TAURI__;
  // console.log("Checking environment:", { browser, runningInTauri });

  // Try using the Tauri OS plugin API first
  try {
    // Use os.platform() which returns 'linux', 'macos', 'ios', 'android', 'windows'
    const platform = await os.platform();
    console.log("Detected platform via Tauri OS plugin:", platform); // Debug log

    // Map platform names to our desired display names
    switch (platform) {
      case "windows":
        return "Windows";
      case "macos":
        return "macOS";
      case "linux":
        return "Linux";
      case "android":
        return "Android";
      case "ios":
        return "iOS";
      default:
        console.warn("Unknown platform from Tauri OS plugin:", platform);
        return `Unknown (${platform})`; // Fallback for unknown Tauri platform
    }
  } catch (error) {
    console.error("Failed to get platform name:", error);
    // If the os.platform() call fails, we are likely not in a Tauri environment
    // console.log("Tauri OS plugin call failed (likely not in Tauri), identified as Browser.", error);
    return "Browser";
  }

  /* // Keep the old invoke method commented out for reference or if OS plugin is not used
  if (runningInTauri) {
    try {
      // Invoke the Rust command to get the OS name
      const osName = await invoke<string>("get_os");
      console.log("Detected OS via Tauri command:", osName); // Debug log

      // Map Rust OS names to our display names
      switch (osName.toLowerCase()) {
        case "windows":
          return "Windows";
        case "macos":
          return "macOS";
        case "linux":
          return "Linux";
        case "android":
          return "Android";
        case "ios":
          return "iOS";
        default:
          console.warn("Unknown OS from Tauri command:", osName);
          return "Unknown Desktop"; // Fallback for unknown Tauri OS
      }
    } catch (error) {
      console.error("Failed to invoke get_os command:", error);
      return "Desktop App"; // Fallback if command fails
    }
  } else {
    // If not in Tauri, it's a standard browser environment
    console.log("Not running in Tauri, identified as Browser.");
    return "Browser";
  }
  */
}

/**
 * Gets the environment enum based on the detected platform.
 * Note: This might need adjustment depending on how you want to map platforms to enums.
 */
export async function getEnvironment(): Promise<Environment> {
  const platform = await getPlatformName();

  switch (platform) {
    case "Windows":
      return Environment.Windows;
    case "macOS":
      return Environment.Mac;
    case "Linux":
      return Environment.Linux;
    case "Android":
      return Environment.Android;
    case "iOS":
      return Environment.iOS;
    case "Browser":
      return Environment.Browser;
    // Add cases for "Desktop App", "Server", "Unknown Desktop" if needed
    default:
      return Environment.Unknown;
  }
}
