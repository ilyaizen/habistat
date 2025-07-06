# ✅ **Habistat**

> **Build habits. Track progress. Achieve goals.**

🌐 **Open-Source** | 🔄 **Cross-Platform** | 🎯 **Semi-Gamified**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Habistat** is a free and open-source **habit tracker** focused on privacy and simplicity. It helps you build good habits, break bad ones, and track daily activity, with your data fully under your control. Features include time-based habit tracking and optional gamification: streaks, points, and a virtual garden that grows – ideally, like you. 🌱

An alternative to apps like **[Everyday](https://everyday.app/)**, **[Habitify](https://www.habitify.me/)**, and **[Habitica](https://habitica.com/)**, it is built with the lightweight **[Tauri](https://v2.tauri.app/)** framework and runs smoothly on Android, iOS, Windows, macOS, and in any modern browser.

## [https://habistat.vercel.app](https://habistat.vercel.app)

---

## Why Habistat?

Tired of bloated apps and shaky privacy policies? Habistat keeps it simple. Inspired by "Don't Break the Chain," it turns habit tracking into a daily checkmark ritual. Each completed habit advances your streak, grows a virtual plant, and earns points.

---

## Features

- **✅ Positive & 🚫 Negative Habits**: Keep track of what to do and what to avoid. Earn points for fun and remember, your progress is ultimately judged by you.
- **📊 Dashboard & 🎉 Visuals**: View your trends and progress with sleek charts and an activity grid.
- **📅 Custom Calendars & 🏆 Gamification**: Group habits by themes, earn rewards, and grow your virtual garden.
- **🛜 Offline-First with 🔄 Optional Sync**: Fully functional offline and sync across devices only if you choose.
- **🔒 Full Data Portability**: Easily import or export your habit history anytime, no restrictions.
- **📱 Clean, Adaptive UI**: Enjoy light/dark modes, multilingual support, and a stylish design built with SvelteKit, Tailwind CSS, and shadcn-svelte.

---

## Getting Started

1. **Create a Calendar:** Name it (e.g., _Hobbies_, _Fitness_, _Negative_) and pick a color.
2. **Add Habits:** Label them, choose positive or negative, set timers (optional), and assign point values.
3. **Track & Grow:** Check off daily. Watch your streaks, points, and garden grow. Preferably in that order.

---

## Tech Stack

Habistat is built with a modern and robust technology stack:

- **Package Manager:** [pnpm](https://pnpm.io/)
- **Core Framework:** [Tauri v2](https://v2.tauri.app/) (Rust backend, web frontend)
- **Frontend:** [SvelteKit](https://svelte.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components:** [shadcn-svelte](https://next.shadcn-svelte.com/)
- **Icons** [@lucide/svelte](https://github.com/lucide-icons/lucide)
- **Local Database:** [SQLite](https://www.sqlite.org/) via [Drizzle ORM](https://orm.drizzle.team/)
- **Cloud Sync & Backend:** [Convex](https://convex.dev/)
- **Authentication:** [Clerk](https://clerk.com/) (OAuth with Google, etc.) via [svelte-clerk](https://svelte-clerk.netlify.app)
- **Internationalization:** [svelte-i18n](https://github.com/kaisermann/svelte-i18n)
- **Utilities:**
  - [uuid](https://github.com/uuidjs/uuid) (Unique Identifiers)
  - [date-fns](https://date-fns.org/) (Date Manipulation and Formatting)
  - [@number-flow/svelte](https://github.com/barvian/number-flow) (Animated Number Transitions)

---

## Project Structure

```txt
habistat/
├── src/                          # Main SvelteKit application
│   ├── convex/                   # Convex backend functions & schema
│   ├── i18n/                     # Internationalization files
│   ├── lib/
│   │   ├── components/           # Svelte UI components
│   │   ├── db/                   # Database client & schema
│   │   ├── hooks/                # Custom Svelte hooks
│   │   ├── services/             # Business logic & data services
│   │   ├── stores/               # Svelte stores for state management
│   │   └── utils/                # Utility functions
│   ├── params/                   # SvelteKit parameter matchers
│   ├── routes/                   # SvelteKit pages & API routes
│   │   ├── dashboard/            # Main dashboard pages
│   │   ├── settings/             # Settings page
│   │   ├── stats/                # Statistics page
│   │   └── premium/              # Premium features page
│   ├── app.html                  # Main HTML template
│   └── hooks.{client,server}.ts  # SvelteKit hooks
├── src-tauri/                    # Tauri Rust backend
│   ├── src/                      # Rust source code
│   ├── capabilities/             # Tauri capabilities configuration
│   └── Cargo.toml                # Rust dependencies
├── static/                       # Static assets (icons, images, etc.)
├── migrations/                   # SQLite database migrations
├── scripts/                      # Build and utility scripts
└── vibes/                        # Documentation & development guides
```

### Key Directories

- **`/src/lib/components/`** - Reusable Svelte components including UI elements, forms, and feature-specific components.
- **`/src/lib/stores/`** - Svelte stores managing application state (habits, calendars, sync, settings, etc.).
- **`/src/lib/services/`** - Business logic for local data management, sync operations, and database migrations.
- **`/src/convex/`** - Cloud backend functions for data synchronization and user management.
- **`/src/routes/`** - SvelteKit file-based routing with pages for dashboard, settings, and API endpoints.
- **`/src-tauri/`** - Rust backend providing native desktop capabilities and system integration.

For more information, see full [file-structure.txt](file-structure.txt).

---

## Useful Links

- **Website:** [https://habistat.vercel.app](https://habistat.vercel.app)
- **Creator:** [Ilya Aizenberg](https://github.com/ilyaizen)
- **Issue Tracker:** [https://github.com/ilyaizen/habistat/issues](https://github.com/ilyaizen/habistat/issues)

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

Happy tracking! 😎
