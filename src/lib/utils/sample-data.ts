/**
 * Sample data configuration for generating demo content in the app.
 * This includes sample calendars and sample habits.
 */

// Sample data configuration - easily editable for demo purposes
export const SAMPLE_DATA_CONFIG = {
  calendars: [
    {
      name: "🏋️ Fitness & Mindfulness",
      colorTheme: "Green",
      position: 0
    },
    {
      name: "🧠 Mind & Productivity",
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
    // Fitness & Mindfulness habits
    {
      calendarName: "🏋️ Fitness & Mindfulness",
      name: "🤸 Workout/Stretch",
      description: "Start the day with light exercise and stretching.",
      type: "positive" as const,
      timerEnabled: true,
      targetDurationMinutes: 15,
      pointsValue: 15,
      position: 0
    },
    {
      calendarName: "🏋️ Fitness & Mindfulness",
      name: "🚶 Steps ≥ 8,000",
      description: "Daily step goal for maintaining activity levels.",
      type: "positive" as const,
      timerEnabled: false,
      targetDurationMinutes: null,
      pointsValue: 30,
      position: 1
    },
    {
      calendarName: "🏋️ Fitness & Mindfulness",
      name: "🛌 Sleep ≥ 6H",
      description: "Sleep at least 6 hours in the past 24 hours.",
      type: "positive" as const,
      timerEnabled: false,
      targetDurationMinutes: null,
      pointsValue: 10,
      position: 2
    },
    // Mind & Productivity habits
    {
      calendarName: "🧠 Mind & Productivity",
      name: "📖 Read",
      description: "Daily reading for knowledge and mental stimulation.",
      type: "positive" as const,
      timerEnabled: true,
      targetDurationMinutes: 15,
      pointsValue: 5,
      position: 0
    },
    {
      calendarName: "🧠 Mind & Productivity",
      name: "📝 Write",
      description: "Write a focused 3-item to-do list for the day.",
      type: "positive" as const,
      timerEnabled: false,
      targetDurationMinutes: null,
      pointsValue: 3,
      position: 1
    },
    {
      calendarName: "🧠 Mind & Productivity",
      name: "🎯 Code",
      description: "Practice coding skills.",
      type: "positive" as const,
      timerEnabled: true,
      targetDurationMinutes: 20,
      pointsValue: 8,
      position: 2
    },
    // Bad Habits (negative habits)
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
export type SampleDataConfig = typeof SAMPLE_DATA_CONFIG;
export type SampleCalendar = (typeof SAMPLE_DATA_CONFIG.calendars)[0];
export type SampleHabit = (typeof SAMPLE_DATA_CONFIG.habits)[0];
