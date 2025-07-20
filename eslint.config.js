import globals from "globals";
import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import prettier from "eslint-plugin-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs["flat/recommended"],
  {
    plugins: {
      prettier
    },
    rules: {
      "prettier/prettier": "error"
    }
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser
      }
    }
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  {
    ignores: [
      ".svelte-kit/",
      "build/",
      "dist/",
      ".DS_Store",
      "src-tauri/target/",
      "src/convex/_generated/"
    ]
  }
);
