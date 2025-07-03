/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  readonly CLERK_SECRET_KEY: string;
  readonly PUBLIC_CONVEX_URL: string;
  readonly VITE_CONVEX_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "$env/static/private" {
  export const CLERK_SECRET_KEY: string;
}

declare module "$env/static/public" {
  export const PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  export const PUBLIC_CONVEX_URL: string;
}
