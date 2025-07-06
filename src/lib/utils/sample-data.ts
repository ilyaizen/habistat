/**
 * Sample data configuration for generating demo content in the app.
 * This includes sample calendars and sample habits.
 */

// Sample data configuration - easily editable for demo purposes
export const SAMPLE_DATA_CONFIG = {
  calendars: [
    {
      name: "🏋️ Fitness",
      colorTheme: "Green",
      position: 0
    },
    {
      name: "🧠 Productivity",
      colorTheme: "Blue",
      position: 1
    },
    {
      name: "🚫 Bad Habits",
      colorTheme: "Red",
      position: 2
    }
  ],
  habits: [
    // Fitness habits
    {
      calendarName: "🏋️ Fitness",
      name: "🛌 Sleep ≥ 6H",
      description: "Sleep at least 6 hours in the past 24 hours.",
      type: "positive" as const,
      timerEnabled: false,
      targetDurationMinutes: null,
      pointsValue: 10,
      position: 0
    },
    {
      calendarName: "🏋️ Fitness",
      name: "🤸 Workout",
      description: "Start the day with light exercise and stretching.",
      type: "positive" as const,
      timerEnabled: true,
      targetDurationMinutes: 15,
      pointsValue: 15,
      position: 1
    },
    {
      calendarName: "🏋️ Fitness",
      name: "🚶 Steps ≥ 8,000",
      description: "Daily step goal for maintaining activity levels.",
      type: "positive" as const,
      timerEnabled: false,
      targetDurationMinutes: null,
      pointsValue: 30,
      position: 2
    },

    // Productivity habits

    {
      calendarName: "🧠 Productivity",
      name: "🎯 Code",
      description: "Practice coding skills.",
      type: "positive" as const,
      timerEnabled: true,
      targetDurationMinutes: 25,
      pointsValue: 8,
      position: 0
    },
    {
      calendarName: "🧠 Productivity",
      name: "📝 Write",
      description: "Write a focused 3-item to-do list for the day.",
      type: "positive" as const,
      timerEnabled: true,
      targetDurationMinutes: 25,
      pointsValue: 3,
      position: 1
    },
    {
      calendarName: "🧠 Productivity",
      name: "📖 Read",
      description: "Daily reading for knowledge and mental stimulation.",
      type: "positive" as const,
      timerEnabled: true,
      targetDurationMinutes: 25,
      pointsValue: 5,
      position: 2
    }, // Bad Habits (negative habits)
    {
      calendarName: "🚫 Bad Habits",
      name: "🌽 Corn",
      description: "Avoid eating corn.",
      type: "negative" as const,
      timerEnabled: false,
      targetDurationMinutes: null,
      pointsValue: 15,
      position: 0
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
export type SampleCalendar = (typeof SAMPLE_DATA_CONFIG.calendars)[0];

/**
 * Represents a single sample habit object within the `habits` array.
 * This type is inferred from the first element of the `habits` array.
 */
export type SampleHabit = (typeof SAMPLE_DATA_CONFIG.habits)[0];
