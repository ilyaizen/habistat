# Habistat

Track habits, monitor app usage, achieve goals. Private, offline-first, with optional AI.

Intro Line:
Build better habits, track your progress, and achieve your goals—all in a privacy-first, customizable app.

Info Line:
Your data stays on your device. Optional sync and sign-up available after you get started.

Okay, let's distill this down to its core appeal, playing on your unique "why."

Here are a few options, from ultra-minimal to slightly more descriptive:

**Key Principles Applied:**

- **Focus on the User Benefit:** What will _they_ get out of it?
- **Highlight the USP:** The habit tracking + usage monitoring combo is key.
- **Emphasize Privacy/Offline-First:** This is a strong selling point.
- **Be Direct & Clear:** No jargon where simple words suffice.
- **Create Intrigue:** Make them want to dive in.

---

**Option 1 (Ultra-Minimal & Direct):**

> **Habistat: Master Habits & App Time.**
> Finally, track habits _and_ app usage in one place.
> Achieve your goals – offline and private on your device.
>
> _(Optional: "Cloud sync & sign-up available after starting.")_

**Why it works:**

- Strong, benefit-driven headline.
- "Finally" addresses the gap you identified.
- Clearly states core functions and key benefits (goals, offline, private).

---

**Option 2 (Benefit-Focused):**

> **Habistat: Habits + Usage = Your Best Self.**
> Understand your patterns, build focus, and crush your goals.
> All your data stays private, offline-first on your device.
>
> _(Optional: "Seamless online sync & account options available.")_

**Why it works:**

- Intriguing "equation" headline.
- Focuses on the _outcome_ of using the app.
- Reassures about privacy clearly.

---

**Option 3 (Slightly More Evocative):**

> **Unlock Your Focus with Habistat.**
> Connect your habits to your app usage. Build momentum, achieve more.
> Your progress, your data – privately stored on this device.
>
> _(Optional: "Optional cloud sync when you're ready.")_

**Why it works:**

- "Unlock Your Focus" is an appealing call.
- "Connect your habits to your app usage" clearly states the unique link.
- "Build momentum" is an attractive benefit.

---

**Option 4 (Problem/Solution Angle):**

> **Tired of juggling habit trackers and usage monitors?** > **Habistat brings them together.**
> Track habits, see your app usage, and hit your goals.
> Offline-first, private by design.
>
> _(Optional: "Sign up later for optional cloud sync.")_

**Why it works:**

- Directly addresses the pain point you built the app to solve.
- "Private by design" is a strong statement.

---

**Regarding "semi-gamified" and "optionally-AI":**
These are good features, but for an _initial intro_, they can add complexity. I'd recommend introducing them _after_ the user understands the core value proposition, perhaps as part of an onboarding tour or a "What's New/Features" section. If you _must_ include them:

- "...all in one engaging, offline-first app. (Includes optional AI insights!)"
  This keeps "engaging" (for gamified) broad and makes AI a clear "bonus."

**Which to choose?**

- **Option 1** is probably the most balanced for clarity and brevity.
- **Option 2** is great if you want to emphasize personal growth.
- **Option 3** is slightly more sophisticated in its language.
- **Option 4** is excellent if you know your target audience feels this specific pain point acutely.

Consider A/B testing if possible!

---

Here’s a refined and concise copy for your app's introduction and info text, designed to be engaging and clear:

**Intro Line:**
Build habits, track usage, and crush goals with a fun, semi-gamified, offline-first app.

**Info Line:**
Your privacy matters—data stays on your device. Optional sync and sign-up available later.

This version focuses on the core benefits and privacy assurance, making it punchy and appealing to users while maintaining the essence of your original text. It avoids technical jargon and emphasizes user experience.

If you'd like to include a brief tagline or description for promotional purposes (e.g., app store or website), you could add:

**Tagline:**
Habistat: Your offline-first productivity companion for habits and goals.

Let me know if you'd like further tweaks or additional context!

---

I need to rethink the copy of the introduction text of my app.

I have this intro line:

Track habits, monitor usage, and accomplish goals – all in one semi-gamified, optionally-AI, offline-first app.

And info line:

Your data stays private—stored only on this device. Optional sync and sign-up will be available after starting.

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
