# Habistat Technical Stack

## Core Technologies

- **Package Manager**: Bun v1.2+
- **Core Framework**: Tauri v2 (Rust backend, web frontend)
- **Frontend**: SvelteKit v2 with Svelte v5
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn-svelte
- **Icons**: @lucide/svelte
- **Local Database**: SQLite via Drizzle ORM
- **Cloud Sync & Backend**: Convex
- **Authentication**: Clerk (OAuth) via svelte-clerk
- **Internationalization**: svelte-i18n

## Key Development Commands

```bash
# Development
bun dev                # Run SvelteKit in dev mode
bun tauri dev          # Tauri development build
bun tauri android dev  # Tauri Android development build

# Building
bun build              # Build static frontend
bun tauri build        # Build Tauri production app
bun prepare-dist       # Prepare distribution files

# Quality & Maintenance
bun lint               # Run Biome linting
bun format             # Run Biome formatting
bun check              # Run svelte-check
bun bump               # Bump version (patch)
bun bump:patch         # Bump patch version
bun bump:minor         # Bump minor version
bun bump:major         # Bump major version

# Database
bun db:generate        # Generate Drizzle migrations

# Testing & Preview
bun preview            # Preview production build
bun generate:sample-data # Generate sample data for testing
```

## Code Style Guidelines

- **Formatting**: 2 spaces, max 100 chars per line, semicolons, double quotes
- **TypeScript**: Strict mode enabled
- **Svelte**: Use Svelte 5 syntax with runes
  - Runes (`$effect`, `$state`, etc.) only valid in `.svelte` files
  - Use `$derived` for computing new state from existing signals
  - Avoid chains of `$effect`s that write to signals read by other effects
- **Performance**: Avoid rendering many complex components inside loops

## Cross-Platform Considerations

- The project uses `better-sqlite3` in Node.js/Tauri environments and `sql.js` in the browser
- Never import Node-only drivers like `better-sqlite3` in browser-facing code
- Use environment detection to conditionally import the right driver

## Offline-First Architecture

- SQLite (Drizzle ORM) is the local source of truth
- Convex is used for optional cloud sync with "last-write-wins" merge strategy
- Authentication works offline with cached tokens
