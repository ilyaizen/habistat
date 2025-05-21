# **✅ Habistat**

**Build Habits. Track Progress. Achieve Goals. 🎯**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Habistat** is a gamified, privacy-focused, cross-platform productivity app designed to help you build positive habits, break bad ones, and gain insights into your daily app usage. It stands as an open-source alternative to popular applications like **Everyday**, **Habitify**, and **Habitica**, offering a powerful yet intuitive experience.

## **Website: [habistat.app](https://habistat.vercel.app)**

---

## ✨ Key Features

Habistat comes packed with features to empower your productivity journey:

- **📊 Usage Monitor:** Visually track your application uptime on a comprehensive dashboard, offering a 60-day overview of your digital activity.
- **✅ Positive Habit Tracking:** Cultivate good habits with daily check-ins. Watch your streaks grow and visualize your progress.
- **🚫 Negative Habit Tracking ("Don't Do"):** Effectively break bad habits by monitoring days you successfully avoid them. Gain points for your discipline!
- **📅 Customizable Calendars:** Organize your habits across multiple, distinct calendars. Assign a unique color theme to each for enhanced visual organization and quick identification.
- **🏆 Gamification & Points:** Earn points for completing habits, maintaining streaks, and avoiding negative habits, making self-improvement engaging.
- **💾 Offline-First Design:** Access and manage all your data locally. Habistat is fully functional without an internet connection, ensuring your data is always available to you.
- **👤 Optional Sign-Up & OAuth:** Use Habistat anonymously indefinitely. For enhanced features, optionally sign up effortlessly using email or social providers (e.g., Google) via Clerk-powered OAuth.
- **🔄 Real-Time Cloud Sync:** (Requires sign-up) Seamlessly synchronize your data across multiple devices using Convex cloud whenever you're online.
- **🌙 Automatic Dark & Light Modes:** Enjoy a visually comfortable experience. Choose between dark and light themes manually, or let Habistat switch automatically based on your system settings.
- **🌐 Multi-Language Support:** Habistat is available in various languages, thanks to comprehensive internationalization (i18n) support.
- **🎨 Clean & Customizable Interface:** A modern and intuitive UI built with SvelteKit and Tailwind CSS, enhanced with shadcn-svelte components.

---

## 🗺️ Roadmap (Future Ideas)

- [ ] More gamification elements (badges, leaderboards for friends).
- [ ] Public API for integrations.
- [ ] More themes and customization options.
- [ ] ... and much more! Feel free to suggest features!

---

## 🚀 How It Works: A Quick Guide

Getting started with Habistat is simple:

1. **Create a Calendar:**

   - Upon starting, press the **Add New Calendar** button.
   - Give your calendar a name (e.g., "Fitness", "Work", "Mindfulness").
   - Choose a unique color theme for easy identification.

2. **Add Your First Habit:**

   - Within your newly created calendar, press the accompanying **Add New Habit** button.
   - **Habit Name:** Define what you want to track (e.g., "Exercise", "Meditate", "Stop Snacking After 8 PM").
   - **Habit Mode:**
     - **Positive:** For habits you want to build (e.g., "Read for 30 minutes").
     - **Negative:** For habits you want to break (e.g., "No Social Media After 10 PM").
   - **Timer Duration (Optional):** Set a duration for time-based habits (e.g., `15m`, `1h`).
   - **Habit Points:** Assign points to the habit (e.g., `1`, `5`, `10`) to gamify your progress.

3. **Track & Monitor:**
   - Check off completed habits daily.
   - Monitor your app usage on the dashboard.
   - Watch your streaks grow and your points accumulate!

---

## 🛠️ Tech Stack

Habistat is built with a modern and robust technology stack:

- **Core Framework:** [Tauri v2](https://v2.tauri.app/) (Rust backend, web frontend)
- **Frontend:** [SvelteKit](https://svelte.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components:** [shadcn-svelte](https://next.shadcn-svelte.com/)
- **Local Database:** [SQLite](https://www.sqlite.org/) via [Drizzle ORM](https://orm.drizzle.team/)
- **Cloud Sync & Backend:** [Convex](https://convex.dev/)
- **Authentication:** [Clerk](https://clerk.com/) (OAuth with Google, etc.) via [svelte-clerk](https://svelte-clerk.netlify.app)
- **Internationalization:** [svelte-i18n](https://github.com/kaisermann/svelte-i18n)
- **Utilities:**
  - [uuid](https://github.com/uuidjs/uuid) (Unique Identifiers)
  - [date-fns](https://date-fns.org/) (Date Manipulation and Formatting)
- **Package Manager:** [pnpm](https://pnpm.io/)

---

## 🔗 Useful Links

- **Website:** [https://habistat.vercel.app](https://habistat.vercel.app)
- **Creator:** [Ilya Aizenberg](https://github.com/ilyaizen)
- **Issue Tracker:** [https://github.com/ilyaizen/habistat/issues](https://github.com/ilyaizen/habistat/issues)

---

## 📜 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

Happy tracking and achieving your goals with Habistat! 🎉

---
## Design Plan

# **Build Habits. Track Progress. Achieve Goals.**

🌐 **Open-Source** | 🛡️ **Privacy-First** | 🔄 **Cross-Platform** | 🎯 **Semi-Gamified**

**Habistat** is a free, open-source, and privacy-focused companion for habit tracking and productivity. Built with lightweight **[Tauri](https://v2.tauri.app/)**, it offers a seamless experience across Web, Windows, and Android. Make self-improvement engaging with streaks, points, and a virtual garden that grows with your success.

[**Start Tracking Now - No Account Needed**] (Styled 2D button with transitions ✨)
_Free, private, and ready in seconds._

---

## **Why Habistat?**

Tired of complex trackers or apps that don't respect your privacy? Habistat offers a refreshing alternative to tools like **[Everyday](https://everyday.app/)**, **[Habitify](https://www.habitify.me/)**, and **[Habitica](https://habitica.com/)**. Built on the proven "Don't Break the Chain" principle, it reduces habit tracking to its purest form: a simple daily check-off.

With each habit you complete, your personal streak advances, your virtual garden flourishes and you earn self-assigned points. This immediate, visual feedback sustains engagement, while the entirely self-regulated points system empowers you to determine how-and to what end-you reward yourself.

Choose **Habistat** to reclaim control of your routine. Experience habit tracking as it was meant to be: straightforward, secure and inherently yours.

---

## ✨ **Features**

- **Positive & Negative Habit Tracking:** Mark daily "do" habits to build streaks or log "don't do" habits to curb unwanted behaviors, each action earns self-assigned points.

- **Usage Dashboard & Progress Visualization:** Review your app usage history, then watch your long-term journey unfold through intuitive charts and a GitHub-style activity grid.

- **Custom Calendars & Gamification:** Organize habits into color-coded calendars, earn points for completions and streaks, and nurture a virtual garden that reflects your consistency.

- **Offline-First & Cloud Sync:** All data lives locally and works without internet. Opt-in via email or social OAuth for real-time, cross-device synchronization.

- **Data Portability:** Export or import your full habit history at any time to back up, migrate, or restore progress seamlessly.

- **Adaptive Interface:** Enjoy automatic light/dark modes, multi-language support via i18n, and a clean, customizable UI built on SvelteKit, Tailwind CSS and shadcn-svelte.

---

## 🚀 **Getting Started**

Launch Habistat and begin your journey in minutes:

1. **Create Your First Calendar:**
   - Hit the **"Add New Calendar"** button.
   - Name it (e.g., "Fitness", "Work Goals", "Mindfulness").
   - Pick a color theme to make it your own.
2. **Add Your Habits:**
   - Inside your calendar, click **"Add New Habit"**.
   - **Name it:** e.g., "Morning Exercise", "Read 30 Mins", "No Social Media Before 8 PM".
   - **Choose Mode:**
     - **Positive:** For habits you want to build.
     - **Negative:** For habits you want to break.
   - **Set Timer (Optional):** For time-based goals (e.g., `15m`, `1h`).
   - **Assign Points:** Gamify with points (e.g., `1`, `5`, `10`).
3. **Track, Monitor & Grow:**
   - Check off habits daily to build your streak.
   - Monitor app usage on your dashboard.
   - Watch your points and virtual garden flourish!

---

## 🗺️ **Roadmap**

We're always working to make Habistat even better. Here's a sneak peek:

- [ ] Enhanced Gamification: Badges, levels, and friendly leaderboards.
- [ ] Public API for community integrations.
- [ ] Expanded theme and customization options.
- [ ] Deeper insights and reporting.
- [ ] ...and much more! We welcome your feature suggestions!

