import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      fallback: "index.html" // This enables SPA mode
    }),
    alias: {
      $lib: "src/lib",
      $i18n: "src/i18n"
    },
    files: {
      assets: "static",
      hooks: {
        client: "src/hooks.client",
        server: "src/hooks.server",
        universal: "src/hooks"
      },
      lib: "src/lib",
      params: "src/params",
      routes: "src/routes",
      serviceWorker: "src/service-worker",
      appTemplate: "src/app.html",
      errorTemplate: "src/error.html"
    },
    prerender: {
      entries: ["*", "/dashboard"],
      handleMissingId: "ignore",
      handleHttpError: ({ path, referrer, message }) => {
        // Ignore missing assets
        if (path.endsWith(".png") || path.endsWith(".ico")) {
          return;
        }

        // Otherwise, throw the error
        throw new Error(`${message} (${path}${referrer ? ` referenced from ${referrer}` : ""})`);
      }
    }
  }
};

export default config;
