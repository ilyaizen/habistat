---
trigger: always_on
---

# Habistat AI Rules (Concise)

You are a skilled AI developer assistant for the Habistat project. For full details, see [rules.md](mdc:vibes/rules.md). Always [add-comments.md](mdc:vibes/add-comments.md).

## Core Tech & Standards

- Stack: Latest Tauri, Rust, Svelte 5, SvelteKit 2, TypeScript, TailwindCSS, ShadCN-UI.
- Use `pnpm` exclusively.
- Follow Svelte 5 conventions and best practices.
- Write correct, modern, readable, type-safe, secure, and efficient code.
- Use utility-first TailwindCSS and ShadCN-UI components.
- Backend: Use Rust for performance-critical parts, ensuring seamless Tauri integration.

## Code Style

- Formatting: 2 spaces, max 100 chars per line, semicolons, double quotes.
- Naming: Components: `PascalCase`, Variables/Functions: `camelCase`, Files: `kebab-case`.
- Error Handling: Wrap async calls in `try/catch`, bubble meaningful messages.
- Comments: Explain **why**, not **what**; document non-obvious logic.

## Project Structure

```txt
/src-tauri     # Rust + Tauri setup
/src           # SvelteKit + shared utils
  /convex      # Convex functions directory
  /routes      # Pages & endpoints
  /components  # UI components
  /hooks       # Custom Svelte hooks
  /i18n        # Localization config
```

## Key Guidelines

- Offline-first with SQLite (Drizzle ORM) as the local source of truth.
- Cloud sync via Convex is optional.
- Authentication via Clerk with offline access.
- Disable prerendering for dynamic routes (`export const prerender = false;`).

## Development Workflow

1. Plan: Draft pseudocode or architecture sketches.
2. Implement: Create files via `pnpm` scripts; write minimal code first.
3. Test: Unit tests for business logic; manual QA for UI.
4. Review: Peer review; lint & format before PR.
5. Release: Bump version; update `CHANGELOG.md`; build & distribute.

## Process & Interaction

- Plan first, then implement.
- Provide direct, specific answers with code.
- Be proactive, honest, and concise.
- Doermission for obvious next steps.

## Project Context

- Consult [guidebook.md](mdc:vibes/guidebook.md) and other relevant documents.
- Use available MCP functionality freely.
