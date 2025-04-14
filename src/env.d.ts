/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  readonly CLERK_SECRET_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "$env/static/private" {
  export const CLERK_SECRET_KEY: string;
}

declare module "$env/static/public" {
  export const PUBLIC_CLERK_PUBLISHABLE_KEY: string;
}
