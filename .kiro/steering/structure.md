# Habistat Project Structure

## Key Directories

- **/Docs**: Documentation & development guides
  - **/PRPs**
- **/src**: Main SvelteKit application
  - **/convex**: Convex backend functions & schema
  - **/i18n**: Internationalization files
  - **/lib**: Core application code
    - **/components**: Svelte UI components
    - **/db**: Database client & schema
    - **/hooks**: Custom Svelte hooks
    - **/services**: Business logic & data services
    - **/stores**: Svelte stores for state management
    - **/utils**: Utility functions
  - **/params**: SvelteKit parameter matchers
  - **/routes**: SvelteKit pages & API routes
    - **/dashboard**: Main dashboard pages
    - **/settings**: Settings page
    - **/stats**: Statistics page
    - **/premium**: Premium features page

- **/src-tauri**: Tauri Rust backend
  - **/src**: Rust source code
  - **/capabilities**: Tauri capabilities configuration

- **/static**: Static assets (icons, images, etc.)
- **/migrations**: SQLite database migrations
- **/scripts**: Build and utility scripts

## File Naming Conventions

- **Components**: `kebab-case.svelte` (e.g., `habit-edit-dialog.svelte`)
- **TypeScript/JavaScript**: `kebab-case.ts` (e.g., `user-profile.ts`)
- **Routes**: SvelteKit convention with `+` prefix (e.g., `+page.svelte`, `+layout.ts`)

## Architecture Patterns

### Frontend Architecture

- **SvelteKit Routes**: Pages and layouts using SvelteKit's file-based routing
- **Components**: Reusable UI components in `/lib/components`
- **Stores**: State management using Svelte stores in `/lib/stores`
- **Hooks**: Custom Svelte hooks for reusable logic in `/lib/hooks`
- **Services**: Business logic and data access in `/lib/services`

### Data Flow

1. **Local Data**: SQLite database accessed via Drizzle ORM
2. **Stores**: Svelte stores manage application state
3. **Components**: UI components consume store data
4. **Sync**: Optional synchronization with Convex cloud

### Cross-Platform Strategy

- **Web**: SvelteKit with `adapter-static`
- **Desktop**: Tauri wrapping the web app with Rust backend
- **Mobile**: Tauri Mobile for Android/iOS

## Important Architectural Considerations

- **Offline-First**: All core functionality works without internet connection
- **Prerendering**: Routes are prerendered; dynamic routes need `export const prerender = false;`
- **Environment Detection**: Code conditionally imports appropriate dependencies based on platform
- **Authentication**: Clerk for OAuth with cached tokens for offline access
