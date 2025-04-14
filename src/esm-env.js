// Shim for esm-env module
export const BROWSER = typeof window !== "undefined";
// Safe access to vite env variables
export const DEV = typeof import.meta.env !== "undefined" ? import.meta.env.DEV : false;
export const PROD = typeof import.meta.env !== "undefined" ? import.meta.env.PROD : true;
export const SSR = !BROWSER;
