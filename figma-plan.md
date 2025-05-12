# Habistat Main Page Design Plan

## Design Inspiration

- Inspired by the attached image: soft, friendly, playful, and motivating.
- Semi-gamified: XP, streaks, progress bars, and visual rewards (healthy garden, motivation badges).
- Calm, readable, and inviting. No dark patterns, no stress.
- Mobile-first, but scales to desktop.

![[o4-ui-inspiration-1.jpg]]
![[o4-ui-inspiration-2.png]]

## Layout Overview

- **Header:**

  - App icon (flat-design checkmark logo svg) and "Habistat" title. (left-side)
  - Main navigation: Today, All Habits, Stats, Preferences. (center)
  - XP counter, streak indicator, and quick access to profile settings via User Button dropdown. (right-side)

- **Main Content (3-column layout on desktop, stacked on mobile):**

  1. **Spotlight/Focus Panel**
     - Shows today's most important habits ("Spotlight").
     - ~~Quick start focus mode (timer, mood/energy selector, start button).~~
     - ~~Swap focus: easily switch to another habit.~~
     - Add new habit shortcut.
  2. **Calendars & Habits List**
     - Categorized by Calendar properties.
     - Each item: checkbox, XP/points, optional streak indicator.
     - Add new habit/habit button (with XP reward preview).
     - Completed items animate out or move to a "done" section.
  3. **Progress & Gamification Panel**
     - Visual progress garden (or similar): grows as you earn XP/streaks.
     - Next level/goal preview (e.g., "Garden Enthusiast: 82/100 XP").
     - Streak tracker (e.g., "7-day streak! Bonus unlocked!").
     - Button to view detailed stats/garden/achievements.

- **Footer:**
  - Motivational message (e.g., "Tiny steps make big blooms.")
  - Mascot/illustration (e.g., bunny, plant, etc.)

## Visual & Interaction Style

- Soft, rounded cards and buttons; gentle color palette (light/dark mode support).
- Playful icons and illustrations (plants, animals, weather, etc.).
- Subtle animations for progress, streaks, and habit completion.
- XP, streaks, and progress bars are always visible and rewarding.
- Mood/energy selector for focus sessions (optional, for self-reflection).
- All actions are 1-2 taps/clicks away; no deep nesting.

## Gamification Elements

- XP for completing habits/habits; bonus XP for streaks and focus sessions.
- Visual progress (garden, tree, or similar) that grows as you progress.
- Streaks tracked and celebrated (with gentle, non-addictive feedback).
- Levels, badges, or unlockables for milestones (optional, not overwhelming).
- All gamification is opt-in and positive—never punishing.

## Feature Integration

- **Usage Monitor:**
  - Accessible from main nav or as a dashboard card.
  - Visualizes app usage (calendar or graph, 60-day view).
- **Customizable Calendars:**
  - Habits/habits can be grouped and color-coded.
  - Easy to switch between calendars/views.
- **Privacy & Offline-First:**
  - Subtle indicators: "Your data stays on this device."
  - Sync/sign-up options are available but not intrusive.
- **Multi-Language & Accessibility:**
  - All text is i18n-ready.
  - High-contrast, keyboard navigable, screen reader friendly.

## Summary

This design plan creates a main page that is motivating, semi-gamified, and friendly—making habit tracking and productivity feel rewarding and low-pressure. The UI is inspired by the attached image, with a focus on clarity, positive feedback, and playful visuals, while supporting all core Habistat features.
