# Habistat Guidebook

**Version:** 0.0.1
**Last Updated:** 2025-06-28

---

## Commands

```bash
# Development
bun dev                # Run SvelteKit in dev mode
bun build              # Build static frontend
bun preview            # Preview production build
bun tauri dev          # Tauri development build
bun tauri build        # Build Tauri production app
bun tauri android dev  # Tauri Android development build
bun bump               # Bump version

# Quality Checks
bun lint               # ESLint
bun format             # Prettier
```

## Code Style & Naming Conventions

- **Formatting**: 2 spaces, max 100 chars per line, semicolons, double quotes.
- **TypeScript**: Strict mode; no unused vars/params. Use `PascalCase` for types/interfaces.
- **Svelte**: Use Svelte 5 syntax. Components are `kebab-case.svelte`.
  - **Rune Scope**: Runes (`$effect`, `$state`, etc.) are only valid inside `.svelte` files. For reactive logic in stores, expose methods that can be called from a component's `$effect`.
- **File Names**: `kebab-case` (e.g., `user-profile.ts`).
- **Variables/Functions**: `camelCase` (e.g., `getUserData`).
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`).
- **Components**: Favor functional patterns and hooks over classes. Keep components focused and single-purpose.
- **Error Handling**: Wrap async calls in `try/catch`, bubble meaningful messages.
- **Comments**: Explain **why**, not **what**; document non‑obvious logic. Use JSDoc for public APIs.

## Project Structure

```txt
/src-tauri      # Rust + Tauri setup
/src            # SvelteKit + shared utils
  /convex       # Convex functions directory
  /routes       # Pages & endpoints
  /components   # UI components
  /hooks        # Custom Svelte hooks
  /i18n         # Localization config
```

## Architecture Overview

- **Frontend**: SvelteKit 2 (Svelte 5) with `adapter-static`. All routes prerendered; no Node server.
- **Backend**: Rust-native Tauri commands exposed via secure IPC.
- **UI Shell**: Delivered through OS WebView (WebKit/WebView2).
- **Tauri SPA Warning**: Dynamic routes must have prerendering explicitly disabled (`export const prerender = false;`) to allow client-side routing.

## Connectivity & Sync

- **Offline-First**: SQLite (Drizzle ORM) is the local source of truth.
- **Cloud Sync (optional)**: Convex for real-time updates. "Last-write-wins" merge strategy.

## Authentication & Security

- **OAuth**: Clerk via popup/deep-link; cached tokens for offline access.
- **IPC Whitelisting**: All Tauri commands explicitly defined in `src-tauri/tauri.conf.json`.
- **Offline-First Auth**: Anonymous session by default, migratable to an authenticated account.

## Tech Stack

- **Core**: Rust, Tauri v2, SvelteKit v2 (Svelte v5), TypeScript, Tailwind CSS v4, shadcn-svelte
- **Data Layer**: SQLite, Drizzle ORM, Convex (opt-in)
- **Auth**: Clerk, svelte-clerk
- **Utilities**: uuid, date-fns, svelte-i18n

See [tech-stack.md](tech-stack.md) or check the project's `package.json` for a fuller list.

**Cross-Platform Data Layer Warning**:
Never use Node-only SQLite drivers (like `better-sqlite3`) in code that might run in the browser. Use a cross-platform solution like `wa-sqlite` or `sql.js`.

## Testing Guidelines

- Write tests for business logic.
- Use descriptive test names (Arrange-Act-Assert).
- Mock external dependencies.
- Test edge cases and error scenarios.
