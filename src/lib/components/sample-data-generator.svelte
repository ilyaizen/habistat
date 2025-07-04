<script lang="ts">
  import { calendarsStore, type Calendar } from "$lib/stores/calendars";
  import { habits as habitsStore } from "$lib/stores/habits";
  import Button from "$lib/components/ui/button/button.svelte";
  import { WandSparkles } from "@lucide/svelte";
  import { get } from "svelte/store";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  let isGenerating = $state(false);

  // Color palette for consistent styling
  const COLOR_PALETTE = [
    { name: "Lime", value: "#84cc16" },
    { name: "Green", value: "#22c55e" },
    { name: "Emerald", value: "#10b981" },
    { name: "Teal", value: "#14b8a6" },
    { name: "Cyan", value: "#06b6d4" },
    { name: "Sky", value: "#0ea5e9" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Indigo", value: "#6366f1" },
    { name: "Violet", value: "#8b5cf6" },
    { name: "Purple", value: "#a21caf" },
    { name: "Fuchsia", value: "#d946ef" },
    { name: "Pink", value: "#ec4899" },
    { name: "Rose", value: "#f43f5e" },
    { name: "Red", value: "#ef4444" },
    { name: "Orange", value: "#f97316" },
    { name: "Amber", value: "#f59e42" },
    { name: "Yellow", value: "#eab308" }
  ];

  // Sample data configuration - easily editable
  const SAMPLE_DATA_CONFIG = {
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
  };

  /**
   * Generates sample calendars and habits to populate the dashboard
   * with meaningful examples for users to explore the application.
   */
  async function generateSampleData() {
    isGenerating = true;
    try {
      // Create calendars first
      const createdCalendars = [];
      for (const calendarConfig of SAMPLE_DATA_CONFIG.calendars) {
        const colorTheme =
          COLOR_PALETTE.find((c) => c.name === calendarConfig.colorTheme)?.value || "#3b82f6";
        await calendarsStore.add({
          name: calendarConfig.name,
          colorTheme,
          position: calendarConfig.position
        });
        createdCalendars.push(calendarConfig.name);
      }

      // Wait for calendars to be created and store to update
      await Promise.all([
        calendarsStore.refresh(),
        new Promise((resolve) => setTimeout(resolve, 100)) // Small delay to ensure calendars are persisted
      ]);

      // Get the created calendar IDs
      await calendarsStore.refresh();
      const calendars = get(calendarsStore);
      const calendarIdMap = new Map<string, string>();

      for (const calendarName of createdCalendars) {
        const calendarId = calendars.find((c: Calendar) => c.name === calendarName)?.id;
        if (calendarId) {
          calendarIdMap.set(calendarName, calendarId);
        }
      }

      if (calendarIdMap.size !== createdCalendars.length) {
        throw new Error("Failed to create all calendars");
      }

      // Create habits based on configuration
      for (const habitConfig of SAMPLE_DATA_CONFIG.habits) {
        const calendarId = calendarIdMap.get(habitConfig.calendarName);
        if (!calendarId) {
          console.warn(`Calendar not found: ${habitConfig.calendarName}`);
          continue;
        }

        await habitsStore.add({
          name: habitConfig.name,
          description: habitConfig.description,
          type: habitConfig.type,
          timerEnabled: habitConfig.timerEnabled ? 1 : 0,
          targetDurationSeconds: habitConfig.targetDurationMinutes
            ? habitConfig.targetDurationMinutes * 60
            : null,
          pointsValue: habitConfig.pointsValue,
          calendarId,
          position: habitConfig.position,
          isEnabled: 1
        });
      }

      // Refresh all stores to ensure UI updates
      await Promise.all([calendarsStore.refresh(), habitsStore.refresh()]);

      console.log("Sample data generated successfully!");

      // Dispatch event to notify parent component
      dispatch("dataGenerated");
    } catch (error) {
      console.error("Error generating sample data:", error);
    } finally {
      isGenerating = false;
    }
  }
</script>

<Button
  size="sm"
  variant="outline"
  onclick={generateSampleData}
  disabled={isGenerating}
  class="text-muted-foreground hover:text-foreground"
>
  <WandSparkles class="mr-2 h-4 w-4" />
  {isGenerating ? "Generating..." : "Generate Sample Data"}
</Button>
