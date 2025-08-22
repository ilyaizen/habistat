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
    "name": "🙅 Bad Habits",
    "colorTheme": "Red",
    "position": 0
  },
  {
    "name": "🌱 Common",
    "colorTheme": "Green",
    "position": 1
  },
  {
    "name": "🥷 Practice",
    "colorTheme": "Indigo",
    "position": 2
  },
  {
    "name": "🚀 Learn",
    "colorTheme": "Pink",
    "position": 3
  }
],
  habits: [
  {
    "calendarName": "🙅 Bad Habits",
    "name": "🚬 Cigarette",
    "description": "Engaging in smoking cigarettes. Focus on recording each lapse to understand and address triggers effectively.",
    "type": "negative" as const,
    "timerEnabled": false,
    "targetDurationMinutes": null,
    "pointsValue": 5,
    "position": 0,
    "frequency": 50
  },
  {
    "calendarName": "🙅 Bad Habits",
    "name": "🍁 Weed",
    "description": "Engaging in smoking weed. Monitor and log each occurrence to identify patterns and triggers.",
    "type": "negative" as const,
    "timerEnabled": false,
    "targetDurationMinutes": null,
    "pointsValue": 15,
    "position": 1,
    "frequency": 30
  },
  {
    "calendarName": "🙅 Bad Habits",
    "name": "🌽 Corn",
    "description": "Engaging in corn. Keep a detailed log of each lapse to analyze and mitigate triggers.",
    "type": "negative" as const,
    "timerEnabled": false,
    "targetDurationMinutes": null,
    "pointsValue": 40,
    "position": 2,
    "frequency": 5
  },
  {
    "calendarName": "🌱 Common",
    "name": "🪥 Hygiene",
    "description": "Maintain daily hygiene practices like brushing teeth and washing face. These small actions help maintain public dignity and personal well-being.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 5,
    "pointsValue": 5,
    "position": 0,
    "frequency": 40
  },
  {
    "calendarName": "🌱 Common",
    "name": "🏋🏽 Exercise",
    "description": "Engage in a quick workout to stay active and maintain mobility. Focus on consistent, non-negotiable physical activity.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 15,
    "pointsValue": 40,
    "position": 1,
    "frequency": 10
  },
  {
    "calendarName": "🌱 Common",
    "name": "🧘 Meditate",
    "description": "Take daily vitamins or health supplements. Ensure they are taken with meals for better absorption and consistency.",
    "type": "positive" as const,
    "timerEnabled": false,
    "targetDurationMinutes": null,
    "pointsValue": 10,
    "position": 2,
    "frequency": 30
  },
  {
    "calendarName": "🥷 Practice",
    "name": "💻 Code",
    "description": "Dedicate time to building projects, debugging, or exploring new tech stacks. Aim for focused deep work with a specific deliverable each session.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 45,
    "pointsValue": 50,
    "position": 0,
    "frequency": 50
  },
  {
    "calendarName": "🥷 Practice",
    "name": "🖌️ Design",
    "description": "Engage in visual creativity, whether analog or digital. Aim for quick iterations and complete at least one thumbnail or study per session.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 45,
    "pointsValue": 50,
    "position": 1,
    "frequency": 20
  },
  {
    "calendarName": "🥷 Practice",
    "name": "♟️ Chess",
    "description": "Play chess or solve puzzles to enhance strategic thinking. Review one mistake after each session for continuous improvement.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 15,
    "pointsValue": 15,
    "position": 2,
    "frequency": 15
  },
  {
    "calendarName": "🚀 Learn",
    "name": "🎓 Watch Lecture",
    "description": "Watch and absorb educational content. Capture key notes and identify one actionable item to apply within 24 hours.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 30,
    "pointsValue": 40,
    "position": 0,
    "frequency": 10
  },
  {
    "calendarName": "🚀 Learn",
    "name": "➗ Study Math",
    "description": "Work through math problems or theory. Alternate between solving problems and short derivations, logging errors and corrections as you go.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 45,
    "pointsValue": 50,
    "position": 1,
    "frequency": 20
  },
  {
    "calendarName": "🚀 Learn",
    "name": "📚 Read Non-Fiction",
    "description": "Read books on real-world topics and summarize one actionable takeaway from each session.",
    "type": "positive" as const,
    "timerEnabled": true,
    "targetDurationMinutes": 20,
    "pointsValue": 30,
    "position": 2,
    "frequency": 5
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
