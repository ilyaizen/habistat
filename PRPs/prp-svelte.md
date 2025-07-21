name: "Svelte/Tauri PRP Template v1 - Habistat Edition"
description: |
Template optimized for AI agents to implement features in the Habistat Svelte/Tauri codebase, with sufficient context and self-validation capabilities to achieve working code through iterative refinement. Based on @guidebook.md.

## Core Principles

1. **Context is King**: Include ALL necessary documentation, examples, and caveats.
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix.
3. **Information Dense**: Use keywords and patterns from the codebase.
4. **Progressive Success**: Start simple, validate, then enhance.

---

## Goal

[What needs to be built - be specific about the end state and desires]

## Why

- [Business value and user impact]
- [Integration with existing features]
- [Problems this solves and for whom]

## What

[User-visible behavior and technical requirements]

### Success Criteria

- [ ] [Specific measurable outcomes]

## All Needed Context

### Documentation & References (list all context needed to implement the feature)

```yaml
# MUST READ - Include these in your context window
- url: [Official Svelte/SvelteKit/Tauri docs URL]
  why: [Specific sections/methods you'll need]

- file: [path/to/example.svelte]
  why: [Pattern to follow, gotchas to avoid]

- doc: [Library documentation URL]
  section: [Specific section about common pitfalls]
  critical: [Key insight that prevents common errors]

- docfile: [vibes/guidebook.md]
  why: [Core project conventions and architectural rules.]
```

### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase

```bash
# Example: tree -I 'node_modules|dist|.svelte-kit|target'
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
# Example:
# src/lib/components/
# └── my-new-feature.svelte   # Main component UI
# src/routes/my-new-feature/
# ├── +page.svelte            # Page view
# └── +page.ts                # Data loading for the page
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: Svelte 5 Runes ($effect, $state, etc.) are only valid inside .svelte files.
// CRITICAL: To prevent 'effect_update_depth_exceeded' errors, use $derived for computed state.
// CRITICAL: The project uses 'bun' exclusively for all package management and scripts.
// CRITICAL: Dynamic routes in SvelteKit require 'export const prerender = false;' for client-side routing in Tauri SPA.
// CRITICAL: Data layer uses better-sqlite3 on server/Tauri and sql.js in browser. Never import Node-only drivers in client code.
// CRITICAL: UI components should use shadcn-svelte and TailwindCSS utility classes.
// PATTERN: File names are kebab-case, components PascalCase, variables/functions camelCase.
```

## Implementation Blueprint

### Data models and structure

Create the core data models to ensure type safety and consistency.

```typescript
// Examples:
// - Zod schemas for validation
// - TypeScript interfaces/types for API responses or component props
// - Database schema types from Drizzle ORM
// - Svelte stores for reactive global state (see src/lib/stores)
```

### List of tasks to be completed to fulfill the PRP in the order they should be completed

```yaml
# Example:
Task 1:
  CREATE src/lib/components/my-new-feature.svelte:
    - DEFINE props using Svelte 5 $props
    - IMPLEMENT UI using shadcn-svelte components

Task 2:
  CREATE src/routes/my-feature/[id]/+page.ts:
    - DEFINE a `load` function to fetch data for the page.
    - VALIDATE `params` with Zod.
    - RETURN data or call SvelteKit's `error` helper.

Task 3:
  MODIFY src/routes/my-feature/[id]/+page.svelte:
    - IMPORT the new component.
    - RECEIVE data from the `load` function via `$props`.
    - RENDER the component with the fetched data.
```

### Per task pseudocode as needed added to each task

```typescript
// FILE: src/routes/my-feature/[id]/+page.ts
// Pseudocode with CRITICAL details. Don't write entire code.
import { error } from "@sveltejs/kit";
import { z } from "zod";
// PATTERN: Our data fetching functions are in /src/lib/services
import { getMyFeatureData } from "$lib/services/my-feature";
import type { PageLoad } from "./$types";

const ParamsSchema = z.object({
  id: z.string().uuid()
});

export const load: PageLoad = async ({ params }) => {
  // PATTERN: Always validate params first using Zod
  const validation = ParamsSchema.safeParse(params);
  if (!validation.success) {
    error(400, { message: "Invalid ID format." });
  }

  try {
    // PATTERN: Fetch data in load function. This runs on server and client.
    const data = await getMyFeatureData(validation.data.id);
    return {
      featureData: data
    };
  } catch (err) {
    // PATTERN: SvelteKit's error helper shows the nearest +error.svelte page.
    // Ensure you have a root `src/routes/+error.svelte` to handle this.
    console.error("Failed to load feature data:", err);
    error(500, "Could not load feature data.");
  }
};
```

```svelte
<!-- FILE: src/routes/my-feature/[id]/+page.svelte -->
<!-- Pseudocode with CRITICAL details. Don't write entire code. -->
<script lang="ts">
  import type { PageData } from "./$types";
  import MyNewFeature from "$lib/components/my-new-feature.svelte";

  // PATTERN: Use Svelte 5 runes for props. The `data` object from the load function
  // is automatically passed and available to the component.
  let { data }: PageData = $props();
</script>

<h1>My Feature</h1>

<!-- PATTERN: Pass reactive data down to display components -->
<MyNewFeature feature={data.featureData} />
```

### Integration Points

```yaml
DATABASE:
  - migration: "Add table 'feature_data' with proper indexes to a new .sql file in /migrations"
  - client: "src/lib/db/client.ts for browser (sql.js), src/lib/db/server.server.ts for server-side (better-sqlite3)"
  - pattern: "Use conditional imports for DB drivers based on browser/server environment."

CONFIG:
  - add to: .env
  - pattern: "Use `import { env } from '$env/dynamic/private'` for server-only variables."
  - pattern: "Use `import { env } from '$env/dynamic/public'` for client-side variables (prefixed with PUBLIC_)."

ROUTES:
  - file structure: src/routes/feature-name/+page.svelte
  - api routes: src/routes/api/feature-name/+server.ts
  - dynamic routes: src/routes/feature-name/[id]/+page.svelte
```

## Validation Loop

### Level 1: Syntax & Style

```bash
# Run these FIRST - fix any errors before proceeding
bun lint                    # ESLint checks
bunx tsc --noEmit           # TypeScript type checking
bun format                  # Prettier formatting

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Unit Tests

```typescript
// CREATE tests/my-new-feature.test.ts with these test cases:
import { render, screen } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import MyNewFeature from "$lib/components/my-new-feature.svelte";

describe("MyNewFeature", () => {
  it("renders without crashing", () => {
    const { container } = render(MyNewFeature, { props: { feature: { name: "Test" } } });
    expect(container).toBeInTheDocument();
  });

  it("displays the feature name", () => {
    render(MyNewFeature, { props: { feature: { name: "My Awesome Feature" } } });
    expect(screen.getByText("My Awesome Feature")).toBeInTheDocument();
  });
});
```

```bash
# Run and iterate until passing:
bun test tests/my-new-feature.test.ts
# If failing: Read error, understand root cause, fix code, re-run.
```

### Level 3: Integration Test

```bash
# Start the dev server
bun dev

# Test the page loads
curl http://localhost:5173/my-feature/some-valid-id
# Expected: HTML response with feature content

# Test the API endpoint
curl -X POST http://localhost:5173/api/feature \
  -H "Content-Type: application/json" \
  -d '{"param": "test_value"}'

# Expected: {"status": "success", "data": {...}}
# If error: Check browser console and SvelteKit terminal for error messages.
```

### Level 4: Deployment & Creative Validation

```bash
# Production build check
bun build
bun tauri build

# Expected: Successful build with no errors
# Common issues:
# - "Module not found" -> Check import paths and aliases in tsconfig.json.
# - "500 Internal Error" on a prerendered page -> A `load` function failed.
# - Type errors -> Run `bunx tsc --noEmit` to identify.

# Test production build
bun preview

# Creative validation methods:
# - E2E testing with Playwright/Cypress
# - Performance testing with Lighthouse
# - Accessibility testing with axe
# - Bundle size analysis
# - SEO validation
```

## Final validation Checklist

- [ ] All tests pass: `bun test`
- [ ] No linting errors: `bun lint`
- [ ] No type errors: `bunx tsc --noEmit`
- [ ] Manual test successful: [specific curl/command or user flow]
- [ ] Error cases handled gracefully (e.g., invalid ID)
- [ ] Logs are informative but not verbose
- [ ] Documentation updated if needed (`guidebook.md`, etc.)

---

## Anti-Patterns to Avoid

- ❌ Don't create new patterns when existing ones work.
- ❌ Don't skip validation because "it should work."
- ❌ Don't ignore failing tests - fix them.
- ❌ Don't create chains of `$effect`s that write to signals read by other effects; use `$derived`.
- ❌ Don't hardcode values that should be config/environment variables.
- ❌ Don't import server-only packages (like `better-sqlite3`) into client-side code.
- ❌ Don't commit secrets or API keys. Use `.env` and environment variables.
