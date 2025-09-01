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
      name: "👍 Good Habits",
      colorTheme: "Green",
      position: 0
    },
    {
      name: "👎 Bad Habits",
      colorTheme: "Red",
      position: 1
    }
  ],
  habits: [
    {
      calendarName: "👍 Good Habits",
      name: "🏋🏽 Exercise",
      description:
        "Engage in a quick workout to stay active and maintain mobility. Focus on consistent, non-negotiable physical activity.",
      type: "positive" as const,
      timerEnabled: true,
      targetDurationMinutes: 15,
      pointsValue: 40,
      position: 0,
      frequency: 10
    },
    {
      calendarName: "👍 Good Habits",
      name: "🧘 Meditate",
      description: "Practice daily meditation and mindfulness with focus and consistency.",
      type: "positive" as const,
      timerEnabled: true,
      targetDurationMinutes: 15,
      pointsValue: 50,
      position: 1,
      frequency: 30
    },
    {
      calendarName: "👎 Bad Habits",
      name: "🚬 Cigarettes",
      description:
        "Engaging in smoking cigarettes. Focus on recording each lapse to understand and address triggers effectively.",
      type: "negative" as const,
      timerEnabled: false,
      targetDurationMinutes: null,
      pointsValue: 5,
      position: 0,
      frequency: 50
    },
    {
      calendarName: "👎 Bad Habits",
      name: "🌽 Corn",
      description:
        "Engaging in corn. Keep a detailed log of each lapse to analyze and mitigate triggers.",
      type: "negative" as const,
      timerEnabled: false,
      targetDurationMinutes: null,
      pointsValue: 40,
      position: 1,
      frequency: 5
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
