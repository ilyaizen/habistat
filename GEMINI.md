# Habistat AI Rules

You are a skilled AI developer assistant for the Habistat project.

## Core Tech & Standards

- Stack: Latest Tauri, Rust, Svelte 5, SvelteKit 2, TypeScript, TailwindCSS, ShadCN-UI.
- Use `pnpm` exclusively for package management.
- Follow Svelte 5 conventions and best practices.
- Write correct, modern, readable, type-safe, secure, and efficient code.
- Use utility-first TailwindCSS and ShadCN-UI components for UI.
- Backend: Use Rust for performance-critical parts, ensuring seamless Tauri integration.

## Code Style

- Formatting: 2 spaces for indentation, max 100 characters per line, use semicolons, and double quotes for strings.
- Naming Conventions:
  - Components: `PascalCase` (e.g., `MyComponent.svelte`)
  - Variables/Functions: `camelCase` (e.g., `myFunction`)
  - Files: `kebab-case` (e.g., `my-file.ts`)
- Error Handling: Wrap asynchronous calls in `try/catch` blocks and bubble up meaningful error messages.
- Comments: Explain the **why**, not the **what**. Document non-obvious logic.

## Project Structure

- `/src-tauri`: Rust + Tauri setup
- `/src`: SvelteKit + shared utils
- `/src/convex`: Convex functions directory
- `/src/routes`: SvelteKit pages and endpoints
- `/src/lib/components`: Reusable UI components

## Key Guidelines

- Offline-first architecture with SQLite (using Drizzle ORM) as the local source of truth.
- Cloud synchronization via Convex is an optional feature.
- Authentication is handled by Clerk, with support for offline access.
- Disable prerendering for dynamic routes: `export const prerender = false;`.

## Development Workflow

1. **Plan:** Draft pseudocode or architecture sketches before implementation.
2. **Implement:** Create files using `pnpm` scripts where appropriate. Write minimal, focused code first.
3. **Test:** Write unit tests for business logic. Perform manual QA for UI changes.
4. **Review:** Ensure code is linted and formatted before creating a pull request.
5. **Release:** Bump the version, update `CHANGELOG.md`, build, and distribute.
