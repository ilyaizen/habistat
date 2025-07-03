import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  // Check if we're in Tauri environment
  const isTauri = process.env.TAURI_PLATFORM !== undefined;

  return {
    plugins: [sveltekit()],

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
        // TODO: 2025-04-26 - why is this still reloading everything ever update to implementation-plan.md?
        ignored: ["**/src-tauri/**", "implementation-plan.md"]
      },
      // 4. Allow serving files from the workspace root and specific directories
      fs: {
        allow: ["./src", "./static"]
      }
    },
    // Tauri specific build options
    build: {
      // For better Tauri compatibility
      target: isTauri ? "es2015" : "esnext",
      sourcemap: mode === "development",
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
      copyPublicDir: true
    }
  };
});
