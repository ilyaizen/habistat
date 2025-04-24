# Habistat Guidelines

**Version:** 0.0.0
**Last Updated:** 2025-04-20

---

## 🚀 Commands

```bash
# Development
pnpm dev               # Run SvelteKit in dev mode
pnpm build             # Build static frontend
pnpm preview           # Preview production build
pnpm tauri dev         # Tauri development build
pnpm tauri build       # Build Tauri production app
pnpm tauri android dev  # Tauri Android development build

# Quality Checks
pnpm lint              # ESLint
pnpm format            # Prettier
```

## 🎨 Code Style

- **Formatting**: 2 spaces, max 100 chars per line, semicolons, double quotes.
- **TypeScript**: Strict mode; no unused vars/params.
- **Naming**:
  - Components: `PascalCase`
  - Vars/Funcs: `camelCase`
  - Files: `kebab-case`
- **Components**: Favor functional patterns and hooks.
- **Error Handling**: Wrap async calls in `try/catch`, bubble meaningful messages.
- **Comments**: Explain **why**, not **what**; document non‑obvious logic.

## 🛠️ Project Structure

```txt
/src-tauri      # Rust + Tauri setup
/src            # SvelteKit + shared utils
  /routes       # Pages & endpoints
  /components   # UI components
  /hooks        # Custom Svelte hooks
  /i18n         # Localization config
```

## 🧱 Architecture Overview

- **Frontend**: SvelteKit 5 with `adapter-static`. All routes prerendered; no Node server.
- **Backend**: Rust-native Tauri commands exposed via secure IPC.
- **UI Shell**: Delivered through OS WebView (WebKit/WebView2).

## 🌐 Connectivity & Sync

- **Offline-First**:
  - SQLite (Drizzle ORM) is the local source of truth.
  - Core features operate offline, including auth token fallback.
- **Cloud Sync (optional)**:
  - Convex for real-time updates.
  - Timestamp-based merge: "last-write-wins".
  - Sync queue drained on reconnect.

## 🔐 Authentication & Security

- **OAuth**: Clerk via popup/deep-link; cached tokens for offline access.
- **IPC Whitelisting**: All Tauri commands explicitly defined in `src-tauri/tauri.conf.json`.
- **Token Handling**: Tokens never passed to backend unless required.

## 🧰 Tech Stack

- **Core**:
  - Rust · Tauri v2 · SvelteKit 5 · TypeScript · Tailwind CSS v4 · shadcn-svelte
- **Data Layer**:
  - SQLite · Drizzle ORM · Convex (opt-in)
- **Auth**:
  - Clerk · svelte-clerk
- **Utilities**:
  - uuid · date-fns · svelte-i18n

## ⚙️ Development Workflow

1. **Plan**: Draft pseudocode or architecture sketches.
2. **Implement**: Create files via `pnpm` scripts; write minimal code first.
3. **Test**: Unit tests for business logic; manual QA for UI.
4. **Review**: Peer review; lint & format before PR.
5. **Release**: Bump version; update `CHANGELOG.md`; build & distribute.

## 🤝 Contribution & Review

- Fork & branch from `main`.
- Write clear commit messages: `feat|fix(scope): description`.
- Include tests for new logic.
- Address review comments promptly.

## 📌 Notes

- PWA features enabled only for asset caching; not a browser PWA.
- Cloud dependencies optional; app must run fully air‑gapped.
- Always use `pnpm`.

## 👤 Process & Interaction

- Plan First: Describe your plan (detailed pseudo-code), confirm it, _then_ write code.
- Directness: Give answers/code _immediately_. Explain afterward if necessary. Be terse and casual. Treat me as an expert.
- Specificity: Provide _actual code or detailed explanations_, not high-level summaries like "Here's how you can...".
- Proactive: Anticipate needs and suggest relevant solutions. Consider new/contrarian ideas.
- Honesty: Admit if you don't know or if there's no single correct answer. Flag speculation.
- No Fluff: No moralizing, AI disclaimers, or knowledge cutoffs. Discuss safety only if crucial and non-obvious.
- Content Policy: If blocked, provide the closest acceptable response and explain the policy issue.
- Code Changes: When modifying existing code, show only the relevant changed lines with brief context (a few lines before/after).
- Sources: Cite sources at the end if applicable.
- Long Responses: Split into multiple messages if needed.
- Suggest alternatives when solution propositions don't make reasonable sense or are incompatible.

## 🗃️ Project Context

- Consult `@file-structure.txt` for current file structure.
- Read `@README.md` and understand the project better.
- Read `@tech-stack.md` for tool documentation links.
- Read `@implementation-plan.md` and understand the required tasks.
- Use `@llms-convex.txt`, `@llms-drizzle.txt`, `@llms-mcp-full.txt`, `@llms-small-svelte.txt` to clarify latest tool best-practices.
- Apply `@add-comments.mdc` to code when possible.
- Use the available MCP functionality (such as: `browser-tools`) freely.
