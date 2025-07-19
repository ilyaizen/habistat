import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import devtoolsJson from "vite-plugin-devtools-json";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  // Check if we're in Tauri environment
  const isTauri = process.env.TAURI_PLATFORM !== undefined;

  return {
    plugins: [sveltekit(), devtoolsJson()],

    // Development specific configurations
    define: {
      // Suppress Clerk-related warnings in development
      __DEV_SUPPRESS_CLERK_WARNINGS__: mode === "development"
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      port: 3001,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 3002
          }
        : undefined,
      watch: {
        // 3. tell vite to ignore watching `src-tauri` and `implementation-plan.md`
        ignored: ["**/src-tauri/**", "**/vibes/**"]
      },
      // 4. Allow serving files from the workspace root and specific directories
      fs: {
        allow: ["./src", "./static", "./migrations", "./node_modules"]
      }
    },
    // Tauri specific build options
    build: {
      // For better Tauri compatibility
      target: "esnext",
      sourcemap: true,
      minify: mode === "production" && !isTauri ? "esbuild" : false,
      rollupOptions: {
        output: {
          // Clean asset file naming without node_modules paths
          assetFileNames: "assets/[name]-[hash][extname]",
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js"
        }
      },
      // Copy public assets properly without node_modules
      copyPublicDir: true,
      // Ensure WASM files are treated as assets
      assetsInlineLimit: 0
    }
  };
});
