# Habistat

"Habistat," a cross-platform, offline-first productivity app that features habit tracking on habit on multiple customizable calendars, an uptime monitoring ("Usage Monitor"), real-time synchronization (when online), optional sign-up, and OAuth capabilities, leveraging the specified modern tech stack, using pnpm, SvelteKit, and Tauri. The app will later be able to sync stuff to Convex, with OAuth capabilities using Clerk. The whole app is translated to many languages using i18n tooling, and is supposed to work on Tauri's (the system's) native webview, on the frontend with, from what I gather, needs to have minimal usage of SSR and not rely on Tauri's Rust backend.

2025-05-10: I built this app because: lack of habit trackers that also track usage of the app.
## Features

- **📊 Usage Monitor:** Visually track application uptime on your dashboard (60-day view).
- **✅ Positive Habit Tracking:** Build good habits with daily check-ins and visual streaks.
- **🚫 "Don't Do" Habits:** Break bad habits by tracking successful avoidance days.
- **📅 Customizable Calendars:** Organize habits into multiple calendars, each with a unique color theme.
- **💾 Offline-First Access:** Use the app fully offline; your data is always available locally.
- **👤 Optional & OAuth Sign-Up:** Use anonymously forever, or sign up easily (Email, Google, etc.) to enable cloud features.
- **🔄 Real-Time Cloud Sync:** Seamlessly sync data across devices when online (requires sign-up).
- **🌙 Dark & Light Modes:** Automatic or manual theme switching for comfortable viewing.
- **🌐 Multi-Language Support:** Available in multiple languages through internationalization.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Rust](https://www.rust-lang.org/) Programming Language
- [pnpm](https://pnpm.io/) Package Manager
- [Tauri v2](https://v2.tauri.app/) Backend Framework
- [SvelteKit](https://svelte.dev/) Frontend Framework
- [Tailwind CSS v4](https://tailwindcss.com/) Styling
- [Drizzle ORM](https://orm.drizzle.team/) Data (ORM)
- [SQLite](https://www.sqlite.org/) Data (Local)
- [Convex](https://convex.dev/) Cloud
- [Clerk](https://clerk.com/) OAuth
- [shadcn-svelte](https://next.shadcn-svelte.com/) UI Components
- [svelte-clerk](https://svelte-clerk.netlify.app) Authentication
- [svelte-i18n](https://github.com/kaisermann/svelte-i18n) Internationalization
- [uuid](https://github.com/uuidjs/uuid) Unique Identifiers
- [date-fns](https://date-fns.org/) Frontend Date Manipulation and Formatting

## Links

- Website: [https://habistat.vercel.app](https://habistat.vercel.app)
- Creator: [Ilya Aizenberg](https://github.com/ilyaizen)

## License

This project is licensed under the [MIT License](LICENSE).

---

Happy tracking! 🎯
