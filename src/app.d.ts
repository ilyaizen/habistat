/// <reference types="@sveltejs/kit" />
/// <reference types="svelte" />

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
  export function pushState(url: string | URL, state: Record<string, unknown>): void;
  export function replaceState(url: string | URL, state: Record<string, unknown>): void;
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
// interface ImportMetaEnv {
//   DEV?: boolean;
//   PROD?: boolean;
// }

// interface ImportMeta {
//   env?: ImportMetaEnv;
// }

import type { AuthObject } from "svelte-clerk/server";

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    interface Error {}
    interface Locals {
      auth: AuthObject;
    }
    interface PageData {}
    interface Platform {}
  }
}

/// <reference types="svelte-clerk/env" />
