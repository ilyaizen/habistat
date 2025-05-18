# **✅ Habistat**

**Track Habits, Monitor Usage, Achieve Goals 🎯**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Habistat** is a gamified, privacy-focused, cross-platform productivity app designed to help you build positive habits, break bad ones, and gain insights into your daily app usage. It stands as an open-source alternative to popular applications like **Everyday**, **Habitify**, and **Habitica**, offering a powerful yet intuitive experience.

## **Website: [habistat.app](https://habistat.vercel.app)**

---

## 🗺️ Roadmap (Future Ideas)

- [ ] More gamification elements (badges, leaderboards for friends).
- [ ] Public API for integrations.
- [ ] More themes and customization options.
- [ ] ... and much more! Feel free to suggest features!

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

## 💰 Pricing

Habistat offers flexible options to suit your needs:

| Feature             | Free Tier | Premium                                |
| :------------------ | :-------- | :------------------------------------- |
| Custom Calendars    | Up to 3   | Unlimited                              |
| Habits per Calendar | Up to 3   | Unlimited                              |
| **Price**           | **$0**    | **$1.99/month** or **$14.99 lifetime** |

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
