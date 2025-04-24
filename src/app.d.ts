/// <reference types="@sveltejs/kit" />
/// <reference types="svelte" />
/// <reference types="clerk-sveltekit/env" />

// Define $app/environment module
declare module "$app/environment" {
  export const browser: boolean;
  export const dev: boolean;
  export const building: boolean;
  export const version: string;
}

// Define $app/navigation module
declare module "$app/navigation" {
  export function goto(
    url: string | URL,
    opts?: {
      replaceState?: boolean;
      noScroll?: boolean;
      keepFocus?: boolean;
      invalidateAll?: boolean;
    }
  ): Promise<void>;
  export function invalidate(resource: string): Promise<void>;
  export function invalidateAll(): Promise<void>;
  export function preloadData(url: string | URL): Promise<boolean>;
  export function preloadCode(url: string | URL): Promise<boolean>;
  export function beforeNavigate(
    callback: (navigation: { from: URL; to: URL | null; cancel: () => void }) => void
  ): void;
  export function afterNavigate(
    callback: (navigation: { from: URL | null; to: URL }) => void
  ): void;
}

// Ensure import.meta.env is available in TypeScript
interface ImportMetaEnv {
  DEV?: boolean;
  PROD?: boolean;
}

interface ImportMeta {
  env?: ImportMetaEnv;
}

declare global {
  namespace App {
    interface Locals {
      auth: import("clerk-sveltekit/server").Auth;
    }
  }
}

// Tauri window type declarations
interface Window {
  __TAURI__?: {
    tauri?: {
      invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      // Additional Tauri API methods would be defined here
    };
  };
}

export {};
