# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Habistat is a free, open-source habit tracker built with Tauri v2, SvelteKit v2 (Svelte 5), and focused on privacy and offline-first functionality. It supports cross-platform deployment (Windows, macOS, Android, iOS, web) with optional cloud sync via Convex.

**Key Features:**
- Offline-first with SQLite (local source of truth)
- Optional cloud sync via Convex
- Authentication via Clerk (supports offline access)
- Data portability (import/export)
- Multi-language support (i18next/svelte-i18n)

## Development Commands

### Core Commands
```bash
# Development (web)
bun run dev                    # Start dev server on port 3001

# Tauri (desktop)
bun run tauri dev             # Run Tauri desktop app in dev mode
bun run tauri build           # Build production desktop app

# Build & Quality
bun run build                 # Build for production (web)
bun run preview               # Preview production build
bun run check                 # Run type checking
bun run check:watch           # Watch mode for type checking
bun run lint                  # Run Biome linter
bun run format                # Format code (Biome + Prettier)
bun run format:check          # Check formatting

# Database
bun run db:generate           # Generate Drizzle migrations
bun run db:migrate            # Run migrations
bun run db:push               # Push schema to DB (no migrations)
bun run db:studio             # Open Drizzle Studio
bun run db:reset              # Reset database (destructive)
bun run db:setup              # Generate and run migrations
bun run generate:sample-data  # Generate sample habit data

# Versioning
bun run bump:patch            # Bump patch version (0.0.x)
bun run bump:minor            # Bump minor version (0.x.0)
bun run bump:major            # Bump major version (x.0.0)
```

**Package Manager:** Use `bun` exclusively (not npm/yarn/pnpm)

## Architecture

### Tech Stack
- **Frontend:** SvelteKit 2 (Svelte 5 with runes mode)
- **Styling:** Tailwind CSS v4, shadcn-svelte components
- **Backend:** Tauri v2 (Rust), Convex (cloud sync)
- **Local Database:** SQLite via Drizzle ORM
- **Authentication:** Clerk (OAuth with Google, etc.)
- **State Management:** Svelte stores (reactive)

### Project Structure

```
src/
├── lib/
│   ├── components/        # Svelte UI components
│   ├── db/                # SQLite schema & client (Drizzle)
│   │   ├── client.ts      # Database initialization
│   │   └── schema.ts      # Drizzle schema definitions
│   ├── hooks/             # Custom Svelte hooks
│   ├── services/          # Business logic layer
│   │   ├── local-data.ts  # CRUD operations for local SQLite
│   │   └── sync-service.ts # Bidirectional sync with Convex
│   ├── stores/            # Svelte stores (state management)
│   │   ├── calendars.ts   # Calendar store
│   │   ├── habits.ts      # Habits store
│   │   ├── completions.ts # Completions store
│   │   └── auth-state.ts  # Authentication state
│   └── utils/             # Utility functions
├── routes/                # SvelteKit pages & API routes
│   ├── dashboard/         # Main dashboard
│   ├── settings/          # Settings page
│   ├── stats/             # Statistics page
│   └── premium/           # Premium features
├── convex/                # Convex backend functions & schema
│   ├── schema.ts          # Convex database schema
│   ├── calendars.ts       # Calendar mutations/queries
│   ├── habits.ts          # Habit mutations/queries
│   ├── completions.ts     # Completion mutations/queries
│   ├── users.ts           # User management
│   └── http.ts            # HTTP endpoints (webhooks)
└── i18n/                  # Internationalization files

src-tauri/
├── src/                   # Rust source code
├── capabilities/          # Tauri capability configs
└── Cargo.toml             # Rust dependencies
```

### Key Architectural Patterns

#### 1. Data Flow & Sync Architecture

**Local-First with Optional Sync:**
- SQLite is the source of truth (all reads/writes go through `local-data.ts`)
- Convex provides optional cloud backup and cross-device sync
- Sync is bidirectional with Last-Write-Wins (LWW) conflict resolution

**Sync Strategy (sync-service.ts):**
- **Pull-first on initial sync:** Server acts as seed when signing in on new device
- **Parallel pull/push after initial sync:** Minimize latency while tolerating failures
- **Anonymous-to-authenticated migration:** Merge local anonymous data when user signs in
- **Timestamp-based conflict resolution:** Uses `clientUpdatedAt` (completions) or `updatedAt` (calendars/habits)

**Identity Mapping:**
- Local: Uses UUIDs (`id`, `localUuid` fields)
- Convex: Uses Convex IDs (`_id`)
- Mapping: `localUuid` correlates local records with server records
- Completions use `id` as both local primary key and sync correlation UUID

#### 2. Database Schema Design

**Local Schema (src/lib/db/schema.ts):**
- `calendars`: Organizational containers for habits
- `habits`: Core habit definitions with timer support
- `completions`: Minimal completion tracking (habitId, completedAt, clientUpdatedAt)
- `activeTimers`: Running habit timers
- `userProfile`: Global user settings & first app open timestamp
- `activityHistory`: Daily app usage tracking (one row per day)
- `syncMetadata`: Per-table sync timestamps

**Convex Schema (src/convex/schema.ts):**
- Mirrors local schema with Convex-specific fields (`userId` from Clerk, `_id`, `_creationTime`)
- Uses `localUuid` to map back to local records
- Comprehensive indexing for sync performance

#### 3. State Management

**Svelte Stores Pattern:**
- Use writable stores for reactive state
- Stores handle both local persistence and UI updates
- Key stores: `calendars`, `habits`, `completions`, `authState`
- Always call `persistBrowserDb()` in `local-data.ts` after mutations

**Authentication Flow:**
- Clerk provides auth state via `authState` store
- `SyncService.initialize()` subscribes to auth changes
- "Primed" subscription pattern avoids treating page reloads as new sign-ins
- Sign-in triggers: user sync → migrate anonymous data → full sync
- Sign-out triggers: clear all local data

#### 4. TypeScript Path Aliases

```typescript
$lib      → ./src/lib
$components → ./src/lib/components
$stores   → ./src/lib/stores
$utils    → ./src/lib/utils
```

Use these aliases consistently to avoid long relative import paths.

## Code Style & Conventions

### Formatting
- **Indentation:** 2 spaces
- **Line Length:** 100 characters max
- **Quotes:** Double quotes
- **Semicolons:** Always
- **Trailing Commas:** None (Biome config)

### Naming Conventions
- **Components:** PascalCase (`HabitCard.svelte`)
- **Files:** kebab-case (`local-data.ts`, `sync-service.ts`)
- **Variables/Functions:** camelCase (`getUserCompletions`, `syncService`)
- **Types/Interfaces:** PascalCase (`Calendar`, `Habit`, `SyncResult`)
- **Constants:** SCREAMING_SNAKE_CASE (`DEBUG_VERBOSE`)

### Svelte 5 Guidelines
- **Use runes mode:** `$state`, `$derived`, `$effect` (enabled in svelte.config.js)
- **Avoid deprecated APIs:** No `$:` reactive statements in new code (use `$derived`/`$effect`)
- **Props:** Use `let { prop } = $props()` syntax

### Error Handling
- Wrap async calls in `try/catch`
- Use `performSafeOperation` utility for sync operations
- Log meaningful error messages with context
- Surface errors to users via `toast` (svelte-sonner)

## Critical Development Notes

### 1. Sync Service Initialization
**Must call `syncService.initialize()` in root layout:**
- Initializes auth listeners
- Handles sign-in/sign-out events
- Triggers automatic sync on auth state changes
- Uses "primed" subscription to avoid redundant syncs on page reload

### 2. Database Persistence (Browser)
**Always call `persistBrowserDb()` after mutations in `local-data.ts`:**
```typescript
await db.insert(schema.habits).values(data);
await persistBrowserDb(); // Critical for browser storage
```

### 3. Prerendering
**Disable prerendering for dynamic routes:**
```typescript
export const prerender = false; // In +page.ts for auth-dependent pages
```

### 4. Habit ID Mapping in Sync
- Local uses UUIDs for `habitId` in completions
- Server uses Convex IDs
- Use `mapCompletionHabitIds()` utility when pushing completions
- Batch-resolve unknown Convex IDs via `mapLocalUuidsByConvexIds` when pulling

### 5. Conflict Resolution
- **Calendars/Habits:** Compare `updatedAt` timestamps (Last-Write-Wins)
- **Completions:** Compare `completedAt` timestamps
- **Activity History:** Upsert by `(userId, date)` key (one row per day)

### 6. Anonymous Data Migration
- When user signs in, migrate anonymous data:
  - Update `userId` field in local records
  - Push to server via sync
  - Handle UNIQUE constraint conflicts (activity history uses merge strategy)

## Testing Considerations

- **Unit tests:** Business logic in `local-data.ts`, `sync-service.ts`
- **Integration tests:** End-to-end sync flows
- **Manual QA:** UI interactions, cross-device sync
- Run `bun run check` before commits to catch type errors

## Common Pitfalls

1. **Forgetting `persistBrowserDb()`:** Changes won't persist in browser
2. **Not disabling prerender:** Auth-dependent pages will fail
3. **Mixing package managers:** Always use `bun`, never npm/yarn
4. **Ignoring sync conflicts:** Always implement LWW for bidirectional sync
5. **Not handling Clerk auth delays:** Use `waitForConvexAuth()` before sync operations
6. **Treating page reloads as sign-ins:** Ensure sync service is properly primed

## Convex Development

When working with Convex functions (src/convex/):
- Always define validators using `v` from `convex/values`
- Use new function syntax: `query({ args, returns, handler })`
- Export functions with `export const functionName = query/mutation/action(...)`
- Internal functions use `internalQuery/internalMutation/internalAction`
- Always include both `args` and `returns` validators
- Use `ctx.db` for queries/mutations, `ctx.runQuery/runMutation` for cross-function calls
- Index fields must match query order (define separate indexes for different orderings)

See `.cursor/rules/convex-rules.mdc` for comprehensive Convex guidelines.

## Deployment

- **Web:** Deploy to Vercel (adapter-static with fallback to index.html for SPA routing)
- **Desktop:** Build with `bun run tauri build` (Windows/macOS/Linux)
- **Mobile:** Android/iOS builds via Tauri (coming soon)

## Version Management

- Version is synchronized across `package.json` and `src-tauri/tauri.conf.json`
- Use bump scripts to update versions consistently
- Update `CHANGELOG.md` with notable changes before releases
