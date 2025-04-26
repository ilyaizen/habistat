import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [
    sveltekit(),
    VitePWA({
      strategies: "generateSW",
      registerType: "prompt",
      injectRegister: "auto",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
        cleanupOutdatedCaches: true,
        sourcemap: true,
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 hour
              }
            }
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 Days
              }
            }
          },
          {
            urlPattern: /\.(js|css|woff2?)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-resources"
            }
          }
        ]
      },
      manifest: {
        name: "Habistat",
        short_name: "Habistat",
        description: "Habit tracking application that works offline",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        categories: ["productivity", "lifestyle", "utilities"],
        icons: [
          {
            src: "/app-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/app-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        screenshots: [
          {
            src: "/screenshots/screenshot-mobile.png",
            sizes: "540x720",
            type: "image/png",
            form_factor: "narrow",
            label: "Mobile Homescreen"
          },
          {
            src: "/screenshots/screenshot-desktop.png",
            sizes: "1280x800",
            type: "image/png",
            form_factor: "wide",
            label: "Desktop Dashboard"
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: "module"
      },
      includeAssets: ["app-192x192.png", "app-512x512.png", "maskable-icon-512x512.png"]
    })
  ],

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
    // 4. Allow serving files from the workspace root
    fs: {
      allow: ["."]
    }
  }
}));
