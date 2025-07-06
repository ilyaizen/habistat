/**
 * Sample data configuration for generating demo content in the app.
 * This includes sample calendars and sample habits.
 */

import { COLOR_PALETTE } from "./colors";

// Sample data configuration - easily editable for demo purposes
export const SAMPLE_DATA_CONFIG = {
  calendars: [
    {
      name: "🏋️ Fitness & Hydration",
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
    // Fitness & Hydration habits
    {
      calendarName: "🏋️ Fitness & Hydration",
      name: "🤸 Morning stretch routine",
      description: "Start the day with light exercise and stretching",
      type: "positive" as const,
      timerEnabled: true,
      targetDurationMinutes: 10,
      pointsValue: 5,
      position: 0
    },
    {
      calendarName: "🏋️ Fitness & Hydration",
      name: "🚶 8,000 steps",
      description: "Daily step goal for maintaining activity levels",
      type: "positive" as const,
      timerEnabled: false,
      targetDurationMinutes: null,
      pointsValue: 10,
      position: 1
    },
    {
      calendarName: "🏋️ Fitness & Hydration",
      name: "💧 2L water",
      description: "Drink at least 2 liters of water",
      type: "positive" as const,
      timerEnabled: false,
      targetDurationMinutes: null,
      pointsValue: 5,
      position: 2
    },
    // Mind & Productivity habits
    {
      calendarName: "🧠 Mind & Productivity",
      name: "📖 Read 15 min",
      description: "Daily reading for knowledge and mental stimulation",
      type: "positive" as const,
      timerEnabled: true,
      targetDurationMinutes: 15,
      pointsValue: 5,
      position: 0
    },
    {
      calendarName: "🧠 Mind & Productivity",
      name: "📝 Write 3-item to-do",
      description: "Write a focused 3-item to-do list for the day",
      type: "positive" as const,
      timerEnabled: false,
      targetDurationMinutes: null,
      pointsValue: 3,
      position: 1
    },
    {
      calendarName: "🧠 Mind & Productivity",
      name: "🎯 Practice skill (💻/🗣️/🎸)",
      description: "Dedicated practice time for a skill (coding, speaking, or instrument)",
      type: "positive" as const,
      timerEnabled: true,
      targetDurationMinutes: 20,
      pointsValue: 8,
      position: 2
    },
    // Bad Habits (negative habits)
    {
      calendarName: "🚫 Bad Habits",
      name: "⏳ Social media ≤ 30 min",
      description: "Limit social media use to 30 minutes per day",
      type: "negative" as const,
      timerEnabled: false,
      targetDurationMinutes: null,
      pointsValue: 5,
      position: 0
    },
    {
      calendarName: "🚫 Bad Habits",
      name: "🍭 No sweets after 18:00",
      description: "Avoid sweets and sugary snacks after 6pm",
      type: "negative" as const,
      timerEnabled: false,
      targetDurationMinutes: null,
      pointsValue: 5,
      position: 1
    },
    {
      calendarName: "🚫 Bad Habits",
      name: "🌙 No screens before bed",
      description: "No screens (phone, TV, computer) 1 hour before bedtime",
      type: "negative" as const,
      timerEnabled: false,
      targetDurationMinutes: null,
      pointsValue: 5,
      position: 2
    }
  ]
} as const;

// Type definitions for sample data structure
export type SampleDataConfig = typeof SAMPLE_DATA_CONFIG;
export type SampleCalendar = (typeof SAMPLE_DATA_CONFIG.calendars)[0];
export type SampleHabit = (typeof SAMPLE_DATA_CONFIG.habits)[0];
