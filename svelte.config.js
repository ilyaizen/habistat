import adapter from "@sveltejs/adapter-static";

// Check if the build is running on Vercel

import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: [vitePreprocess({})],

  kit: {
    adapter: adapter({
      // Default options for static deployment
      pages: 'build',
      assets: 'build',
      fallback: 'index.html', // Essential for SPA routing in Tauri
      precompress: false
    }),

    // App-wide settings
    appDir: "app",

    // Aliases for cleaner imports
    alias: {
      $lib: "src/lib",
      "$lib/*": "src/lib/*",
      $components: "src/lib/components",
      "$components/*": "src/lib/components/*",
      $stores: "src/lib/stores",
      "$stores/*": "src/lib/stores/*",
      $utils: "src/lib/utils",
      "$utils/*": "src/lib/utils/*"
    }
  },

  // Compiler options for Svelte
  compilerOptions: {
    // Enable runes mode for Svelte 5
    runes: true
  }
};

export default config;
