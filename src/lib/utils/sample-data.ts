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
      name: "🎯 Foundational Actions",
      colorTheme: "Yellow",
      position: 0
    },
    {
      name: "📈 Skill Development",
      colorTheme: "Indigo",
      position: 1
    }
  ],
  habits: [
    {
      calendarName: "🎯 Foundational Actions",
      name: "🛏️ Make Bed",
      description: "Establish a keystone habit to bring order to the start of your day.",
      type: "positive" as const,
      pointsValue: 5,
      position: 0
    },
    {
      calendarName: "🎯 Foundational Actions",
      name: "🪥 Teeth",
      description: "Maintain essential oral hygiene.",
      type: "positive" as const,
      pointsValue: 10,
      position: 1
    },
    {
      calendarName: "🎯 Foundational Actions",
      name: "💧 Hydrate",
      description: "Drink a full glass of water after waking up to start your metabolism.",
      type: "positive" as const,
      pointsValue: 10,
      position: 2
    },
    {
      calendarName: "📈 Skill Development",
      name: "🎓 Watch Lecture",
      description: "Learn something new by watching an educational video, lecture, or documentary.",
      type: "positive" as const,
      pointsValue: 20,
      position: 0
    },
    {
      calendarName: "📈 Skill Development",
      name: "📚 Read Non-Fiction",
      description: "Actively read from a non-fiction book to acquire deep knowledge.",
      type: "positive" as const,
      pointsValue: 20,
      position: 1
    },
    {
      calendarName: "📈 Skill Development",
      name: "🎸 Guitar Practice",
      description: "Engage in deliberate practice of a chosen skill (e.g., guitar).",
      type: "positive" as const,
      pointsValue: 20,
      position: 2
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
