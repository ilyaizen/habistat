# **✅ Habistat**

> **Build habits. Track progress. Achieve goals.**

🌐 **Open-Source** | 🔄 **Cross-Platform** | 🎯 **Semi-Gamified**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Habistat** is a free and open-source **habit tracker** focused on privacy and simplicity. It helps you build good habits, break bad ones, and track daily activity, with your data fully under your control. Features include time-based habit tracking and optional gamification: streaks, points, and a virtual garden that grows – ideally, like you. 🌱

An alternative to apps like **[Everyday](https://everyday.app/)**, **[Habitify](https://www.habitify.me/)**, and **[Habitica](https://habitica.com/)**, it is built with the lightweight **[Tauri](https://v2.tauri.app/)** framework and runs smoothly on Android, iOS, Windows, macOS, and in any modern browser.

**Start Tracking:**
👉 [**habistat.app**](https://habistat.vercel.app)

---

## 💾 Prompts

I want to create a habit tracking web application called Habistat. The webapp should be responsive and have a beautiful and modern UI, which is minimalistic and has proper components, a proper color palette, and so on.

I already essentially finished implementing the following:

The basic frontpage with a visible-on-scroll 'More info' drawer button that has the app information copy from the README.md. The layout has a header and footer.

Here's what I want to implement:

1. Dashboard:
   - I want to display a summary of the user's habits and progress.
   - Include a GitHub-style activity grid to show habit completion over time.
   - Show charts and visualizations of the user's trends and progress.

2. Habit Management:
   - Allow users to create, edit, and delete habits.
   - Each habit should have a name, type (positive or negative), optional timer, and point value.
   - Implement a calendar view for habit tracking.

3. Calendar System:
   - Enable users to create multiple calendars with custom names and colors. (for categories)
   - Allow users to assign habits within these calendars.

4. Habit Tracking:
   - Provide a daily check-off system for habit completion. (call the action 'Complete')
   - Implement appropriate counters for each habit for the habit details page.
   - The Dashboard should display the activities, including the virtual garden on the side.
   - Calculate and display points earned for completed habits.

5. Gamification:
   - Create a virtual garden that grows based on habit completion.
   - Implement a reward system tied to points and streaks.

6. User Preferences:
   - Add a page header and footer
   - Include light and dark mode options.
   - Implement multi-language support.

7. Data Management:
   - Allow users to import and export their habit data.
   - Implement an offline-first approach for data storage.

8. Optional Sync:
   - Provide an option for users to sync their data across devices.

Implementation Phases:

Phase 1: Core Functionality
- Implement the basic dashboard layout.
- Create the habit management system (CRUD operations).
- Develop the daily habit tracking mechanism.

Phase 2: Visual Enhancements
- Add the GitHub-style activity grid to the dashboard.
- Implement charts and visualizations for progress tracking.
- Design and integrate the virtual garden feature.

Phase 3: Advanced Features
- Develop the calendar system for organizing habits.
- Implement the gamification elements (points, rewards).
- Add user preferences (theme switching, language options).

Phase 4: Data Handling
- Create import/export functionality for habit data.
- Implement offline data storage.
- Develop optional sync feature for cross-device usage.

Each phase should be implemented iteratively, with visible outputs after each iteration. The focus should be on creating a functional and visually appealing frontend without concern for backend implementation details.

---

## ⛩️ Why Habistat?

Tired of bloated apps and shaky privacy policies? Habistat keeps it simple. Inspired by "Don't Break the Chain," it turns habit tracking into a daily checkmark ritual. Each completed habit advances your streak, grows a virtual plant, and earns points.

---

## ✨ Features

- **✅ Positive & 🚫 Negative Habits**: Keep track of what to do and what to avoid. Earn points for fun and remember, your progress is ultimately judged by you.
- **📊 Dashboard & 🎉 Visuals**: View your trends and progress with sleek charts and a GitHub-style activity grid.
- **📅 Custom Calendars & 🏆 Gamification**: Group habits by themes, earn rewards, and grow your virtual garden.
- **🛜 Offline-First with 🔄 Optional Sync**: Fully functional offline and sync across devices only if you choose.
- **🔒 Full Data Portability**: Easily import or export your habit history anytime, no restrictions.
- **📱 Clean, Adaptive UI**: Enjoy light/dark modes, multilingual support, and a stylish design built with SvelteKit, Tailwind CSS, and shadcn-svelte.

---

## 🚀 Getting Started

1. **Create a Calendar:** Name it (e.g., _Hobbies_, _Fitness_, _Negative_) and pick a color.
2. **Add Habits:** Label them, choose positive or negative, set timers (optional), and assign point values.
3. **Track & Grow:** Check off daily. Watch your streaks, points, and garden grow. Preferably in that order.

---

## 🗺️ Roadmap (Future Ideas)

- [ ] More gamification elements (badges, leaderboards for friends).
- [ ] Public API for integrations.
- [ ] More themes and customization options.
- [ ] Health app integrations
- [ ] ... and much more! Feel free to suggest features!

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

Happy tracking! 😎
