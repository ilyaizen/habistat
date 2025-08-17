/**
 * Sample data configuration for generating demo content in the app.
 * This includes sample calendars and sample habits.
 *
 * ⚠️ THIS FILE IS AUTO-GENERATED. DO NOT EDIT.
 * To edit sample data, modify `Docs/sample-data.md` and run `bun run generate:sample-data`.
 */

// Sample data configuration - easily editable for demo purposes
export const SAMPLE_DATA_CONFIG = {
  calendars: [
  {
    "name": "✅ Basic Actions",
    "colorTheme": "Green",
    "position": 0
  },
  {
    "name": "🛠️ Practice Skills",
    "colorTheme": "Indigo",
    "position": 1
  },
  {
    "name": "📚 Study",
    "colorTheme": "Pink",
    "position": 2
  },
  {
    "name": "⛔ Bad Habits",
    "colorTheme": "Red",
    "position": 3
  }
],
  habits: [
  {
    "calendarName": "✅ Basic Actions",
    "name": "🪥 Self-care",
    "description": "Brush teeth, wash face, basic grooming. Small consistent wins preserve energy and public dignity.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 2,
    "pointsValue": 5,
    "position": 0
  },
  {
    "calendarName": "✅ Basic Actions",
    "name": "🏋🏽 Exercise",
    "description": "Quick workout to stay active and mobile. Keep intensity focused on mobility and compound moves; treat this as nonnegotiable.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 15,
    "pointsValue": 40,
    "position": 1
  },
  {
    "calendarName": "✅ Basic Actions",
    "name": "💊 Supplements",
    "description": "Take daily vitamins or health boosters. Always with a meal for proper absorption and consistency.",
    "type": "positive" as const,
    "timerEnabled": false,
    "targetDurationMinutes": null,
    "pointsValue": 5,
    "position": 2
  },
  {
    "calendarName": "✅ Basic Actions",
    "name": "☕ Coffee Ritual",
    "description": "Brew and enjoy mindfully, no rush. No screens; use as a deliberate focus anchor, not a dopamine hit.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 20,
    "pointsValue": 5,
    "position": 3
  },
  {
    "calendarName": "🛠️ Practice Skills",
    "name": "💻 Code",
    "description": "Build projects, debug, or explore new tech stacks. One focused deep work block with a small deliverable each time.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 60,
    "pointsValue": 50,
    "position": 0
  },
  {
    "calendarName": "🛠️ Practice Skills",
    "name": "♟️ Chess",
    "description": "Play or solve puzzles to sharpen strategy skills. Always review one mistake after each session.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 15,
    "pointsValue": 15,
    "position": 1
  },
  {
    "calendarName": "🛠️ Practice Skills",
    "name": "🎸 Guitar",
    "description": "Practice chords, riffs, or new songs. Use a metronome and define one clear goal per practice.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 20,
    "pointsValue": 30,
    "position": 2
  },
  {
    "calendarName": "🛠️ Practice Skills",
    "name": "🖌️ Design/Sketch",
    "description": "Visual creativity, analog or digital. Push for quick iterations and complete one thumbnail or study.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 15,
    "pointsValue": 50,
    "position": 3
  },
  {
    "calendarName": "📚 Study",
    "name": "🎓 Watch Lecture",
    "description": "View and absorb educational content. Capture one clear note and action to apply within 24 hours.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 30,
    "pointsValue": 40,
    "position": 0
  },
  {
    "calendarName": "📚 Study",
    "name": "➗ Learn ML / Math",
    "description": "Work through problems or theory. Alternate solving with short derivations; log errors and fixes.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 45,
    "pointsValue": 50,
    "position": 1
  },
  {
    "calendarName": "📚 Study",
    "name": "📚 Read Non-Fiction",
    "description": "Learn from books on real-world topics. Summarize one actionable takeaway per session.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 20,
    "pointsValue": 30,
    "position": 2
  },
  {
    "calendarName": "📚 Study",
    "name": "🃏 Flashcards",
    "description": "Active recall or spaced repetition. Stick to recall, not recognition, and follow the schedule.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 10,
    "pointsValue": 25,
    "position": 3
  },
  {
    "calendarName": "⛔ Bad Habits",
    "name": "🚬 Cravings",
    "description": "Smoking/weed. Treat lapses as data and log triggers immediately.",
    "type": "negative" as const,
    "timerEnabled": false,
    "targetDurationMinutes": null,
    "pointsValue": 5,
    "position": 0
  },
  {
    "calendarName": "⛔ Bad Habits",
    "name": "📱 Doomscroll",
    "description": "Mindless social media or news feed. Keep it to scheduled slots or 10 minutes max.",
    "type": "negative" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 30,
    "pointsValue": 10,
    "position": 1
  },
  {
    "calendarName": "⛔ Bad Habits",
    "name": "🍻 Overindulgence",
    "description": "Alcohol, excess caffeine, or binge snacking. Define thresholds and swap to healthier alternatives.",
    "type": "negative" as const,
    "timerEnabled": false,
    "targetDurationMinutes": null,
    "pointsValue": 30,
    "position": 2
  },
  {
    "calendarName": "⛔ Bad Habits",
    "name": "⏰ Procrastination",
    "description": "Avoiding tasks, drifting into distractions. Use a 10-minute timer and log the cause when you stall.",
    "type": "negative" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 30,
    "pointsValue": 30,
    "position": 3
  }
]
} as const;

// Type definitions for sample data structure

/**
 * Represents the entire structure of the sample data configuration.
 * Derived from the `SAMPLE_DATA_CONFIG` constant to ensure type safety.
 */
export type SampleDataConfig = typeof SAMPLE_DATA_CONFIG;

/**
 * Represents a single sample calendar object within the `calendars` array.
 * This type is inferred from the first element of the `calendars` array.
 */
export type SampleCalendar = (typeof SAMPLE_DATA_CONFIG.calendars)[number];

/**
 * Represents a single sample habit object within the `habits` array.
 * This type is inferred from the first element of the `habits` array.
 */
export type SampleHabit = (typeof SAMPLE_DATA_CONFIG.habits)[number];
