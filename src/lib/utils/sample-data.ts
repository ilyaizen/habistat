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
      name: "🧠 Mind Engagement",
      colorTheme: "Blue",
      position: 1
    },
    {
      name: "📈 Skill Development",
      colorTheme: "Indigo",
      position: 2
    },
    {
      name: "🏃 Physical Conditioning",
      colorTheme: "Green",
      position: 3
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
      calendarName: "🧠 Mind Engagement",
      name: "♟️ Chess",
      description: "Sharpen strategic thinking and focus with a game of chess.",
      type: "positive" as const,
      pointsValue: 20,
      position: 0
    },
    {
      calendarName: "🧠 Mind Engagement",
      name: "🧠 Brilliant",
      description:
        "Dedicate time for focused brainstorming, idea generation, or complex problem-solving.",
      type: "positive" as const,
      pointsValue: 25,
      position: 1
    },
    {
      calendarName: "🧠 Mind Engagement",
      name: "✍️ Journal",
      description: "Reflect on your thoughts, goals, and feelings to improve mental clarity.",
      type: "positive" as const,
      pointsValue: 15,
      position: 2
    },
    {
      calendarName: "📈 Skill Development",
      name: "🎓 Watch Lecture",
      description: "Learn something new by watching an educational video, lecture, or documentary.",
      type: "positive" as const,
      pointsValue: 30,
      position: 0
    },
    {
      calendarName: "📈 Skill Development",
      name: "📚 Read Non-Fiction",
      description: "Actively read from a non-fiction book to acquire deep knowledge.",
      type: "positive" as const,
      pointsValue: 25,
      position: 1
    },
    {
      calendarName: "📈 Skill Development",
      name: "🗣️ Practice a Skill",
      description:
        "Engage in deliberate practice of a chosen skill (e.g., coding, language, instrument).",
      type: "positive" as const,
      pointsValue: 35,
      position: 2
    },
    {
      calendarName: "🏃 Physical Conditioning",
      name: "🤸 Morning Stretch",
      description: "Increase blood flow and flexibility to energize your body for the day.",
      type: "positive" as const,
      pointsValue: 15,
      position: 0
    },
    {
      calendarName: "🏃 Physical Conditioning",
      name: "🚶 Daily Walk",
      description: "Go for a brisk walk to improve cardiovascular health and clear your mind.",
      type: "positive" as const,
      pointsValue: 25,
      position: 1
    },
    {
      calendarName: "🏃 Physical Conditioning",
      name: "💪 Strength Session",
      description:
        "Perform a short, focused workout (e.g., push-ups, squats, planks) to build muscle.",
      type: "positive" as const,
      pointsValue: 40,
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
