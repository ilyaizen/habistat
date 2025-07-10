/**
 * Sample data configuration for generating demo content in the app.
 * This includes sample calendars and sample habits.
 *
 * ⚠️ THIS FILE IS AUTO-GENERATED. DO NOT EDIT.
 * To edit sample data, modify `vibes/sample-data.md` and run `pnpm run generate:sample-data`.
 */

// Sample data configuration - easily editable for demo purposes
export const SAMPLE_DATA_CONFIG = {
  calendars: [
    {
      name: "🧘 Mind & Soul",
      colorTheme: "Purple",
      position: 0
    },
    {
      name: "🌿 Eco-Wellness",
      colorTheme: "Teal",
      position: 1
    }
  ],
  habits: [
    {
      calendarName: "🧘 Mind & Soul",
      name: "📵 Digital Detox",
      description: "Spend intentional time away from screens to reduce digital fatigue.",
      type: "positive" as const,
      pointsValue: 20,
      position: 0
    },
    {
      calendarName: "🧘 Mind & Soul",
      name: "✨ Gratitude Journaling",
      description: "Write down three things you are grateful for to foster a positive mindset.",
      type: "positive" as const,
      pointsValue: 10,
      position: 1
    },
    {
      calendarName: "🌿 Eco-Wellness",
      name: "♻️ Mindful Consumption",
      description:
        "Make a conscious choice to reduce waste, such as using a reusable bottle or avoiding single-use plastics.",
      type: "positive" as const,
      pointsValue: 15,
      position: 0
    },
    {
      calendarName: "🌿 Eco-Wellness",
      name: "🌳 Nature Bathing (Shinrin-yoku)",
      description:
        "Immerse yourself in nature for at least 15 minutes to de-stress and connect with the environment.",
      type: "positive" as const,
      pointsValue: 25,
      position: 1
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
