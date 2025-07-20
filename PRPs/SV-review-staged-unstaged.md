# Svelte/Tauri Staged/Unstaged Code Review

List and review any files in the staging area, both staged and unstaged.
Ensure you look at both new files and modified files.

Check the diff of each file to see what has changed.

Previous review report: $ARGUMENTS

May or may not be added; ignore the previous review if not specified.

## Review Focus Areas

1. **TypeScript Code Quality**
   - Strict TypeScript usage with explicit types.
   - No `any` types - use `unknown` if type is truly unknown.
   - Proper type imports with `import type { }` syntax.
   - Component props interfaces defined using `$props`.
   - Proper use of SvelteKit's generated types (`./$types`).
   - Following TypeScript strict mode compliance.

2. **Svelte-Specific Patterns**
   - Proper Svelte 5 rune usage (`$state`, `$effect`, `$derived`).
   - Client-side routing with `goto()` instead of `window.location`.
   - Svelte components for UI, not just for logic.
   - Proper use of `+page.ts` and `+layout.ts` for data loading.
   - Store usage for managing global state.

3. **Performance & Bundle Optimization**
   - No unnecessary client-side JavaScript.
   - Efficient use of reactivity to avoid performance issues.
   - Image optimization with assets in `static/`.
   - Bundle size considerations.
   - No large components rendered inside `#each` loops.

4. **Security & Validation**
   - Input validation with Zod schemas.
   - Environment variables properly typed and used (`$env/dynamic/public`, `$env/dynamic/private`).
   - Tauri capabilities correctly scoped.
   - No hardcoded secrets in client-side code.
   - API route validation with proper error handling.

5. **Data Management**
   - Correct database driver usage (sql.js for browser, better-sqlite3 for server).
   - Conditional imports for platform-specific code.
   - Type-safe queries with Drizzle ORM.

6. **Package Management**
   - Using `bun` (not `npm` or `yarn`).
   - Proper dependency management.
   - No unused dependencies.
   - Correct dev vs. runtime dependencies.

7. **Code Structure & Architecture**
   - Components kept concise and focused.
   - Functions with a single responsibility.
   - Proper separation of concerns (UI, state, data fetching).
   - Feature-based organization.

8. **Testing & Quality Assurance**
   - Vitest configuration and tests.
   - 80%+ test coverage maintained.
   - Component tests for UI and logic.
   - `load` function tests.
   - Proper mocking of external dependencies.

9. **Build & Development**
   - `bunx tsc --noEmit` passes with zero errors.
   - `bun lint` compliance with zero warnings.
   - `bun format` applied.
   - Production build (`bun build`, `bun tauri build`) succeeds.

10. **Documentation & Maintenance**

- Clear component interfaces with JSDoc.
- Proper prop descriptions.
- `vibes/guidebook.md` updates for new patterns/dependencies.
- `README.md` updates if needed.

## Review Output

Create a concise review report with:

```markdown
# Svelte/Tauri Code Review #[number]

## Summary

[2-3 sentence overview focusing on Svelte-specific patterns and TypeScript quality]

## Issues Found

### 🔴 Critical (Must Fix)

- [Issue with file:line and suggested fix - focus on type safety, reactivity, security]

### 🟡 Important (Should Fix)

- [Issue with file:line and suggested fix - focus on performance, patterns]

### 🟢 Minor (Consider)

- [Improvement suggestions for optimization, maintainability]

## Good Practices

- [What was done well - highlight proper Svelte patterns, TypeScript usage]

## Svelte-Specific Findings

- [Reactivity strategy assessment]
- [Bundle size impact]
- [Data loading usage]
- [Performance optimizations]

## TypeScript Quality

- [Type safety assessment]
- [Strict mode compliance]
- [Interface definitions]

## Test Coverage

Current: X% | Required: 80%
Missing tests: [list with focus on component and `load` function tests]

## Build Validation

- [ ] `bunx tsc --noEmit` passes
- [ ] `bun lint` passes
- [ ] `bun build` and `bun tauri build` succeed
- [ ] `bun test` passes with 80%+ coverage
```

Save report to `PRPs/code_reviews/review[#].md` (check existing files first).
