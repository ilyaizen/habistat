<script lang="ts">
  import { calendarsStore, type Calendar } from "$lib/stores/calendars";
  import { habits as habitsStore } from "$lib/stores/habits";
  import { completionsStore } from "$lib/stores/completions";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { WandSparkles } from "@lucide/svelte";
  import { get } from "svelte/store";
  import * as localData from "$lib/services/local-data";
  import {
    sessionStore,
    generateFakeAppOpenHistory,
    updateSessionStartDate
  } from "$lib/utils/tracking";
  import { COLOR_PALETTE } from "$lib/utils/colors";
  import { SAMPLE_DATA_CONFIG } from "$lib/utils/sample-data";
  import { v4 as uuid } from "uuid";

  // Callback prop for when data generation completes
  interface Props {
    ondatagenerated?: () => void;
  }
  let { ondatagenerated }: Props = $props();

  let isGenerating = $state(false);
  let showDialog = $state(false);

  /**
   * Generates fake app usage history for the past 28 days.
   * This simulates that the user has been opening the app daily.
   */
  async function generateFakeUsageHistory() {
    // Generate 28 days of fake app open history
    await generateFakeAppOpenHistory(28);

    // Update session start date to 28 days ago (6 days before today)
    updateSessionStartDate(27);
  }

  /**
   * Generates 28 days of completion data for all habits.
   * Each positive habit gets 0-3 random completions per day, while negative habits
   * get significantly fewer to simulate successful avoidance.
   */
  async function generateCompletionsHistory(
    habits: Array<{ id: string; name: string; type: string }>
  ) {
    const today = new Date();
    const currentUserId = get(sessionStore)?.id;

    // Generate completions for the past 28 days
    for (let dayOffset = 27; dayOffset >= 0; dayOffset--) {
      const date = new Date(today);
      date.setDate(today.getDate() - dayOffset);

      for (const habit of habits) {
        // For negative habits, generate at least 3 times fewer completions on average
        // to simulate success in avoiding them. Positive habits get 0-3 completions,
        // while negative habits get 0-1, making them appear ~3x less often.
        const maxCompletions = habit.type === "negative" ? 2 : 4;
        const numCompletions = Math.floor(Math.random() * maxCompletions);

        for (let i = 0; i < numCompletions; i++) {
          // Random time throughout the day
          const randomHour = Math.floor(Math.random() * 16) + 6; // Between 6 AM and 10 PM
          const randomMinute = Math.floor(Math.random() * 60);
          const completionTime = new Date(date);
          completionTime.setHours(randomHour, randomMinute, 0, 0);

          // Create completion record directly in the database
          await localData.createCompletion({
            id: uuid(),
            habitId: habit.id,
            completedAt: completionTime.getTime(),
            userId: currentUserId
          });
        }
      }
    }
  }

  /**
   * Generates sample calendars, habits, completions, and usage history
   * to populate the dashboard with meaningful examples for users to explore.
   */
  async function generateSampleData() {
    isGenerating = true;
    showDialog = false;

    try {
      // Ensure we have a session before starting
      sessionStore.ensure();

      // Generate fake usage history first
      await generateFakeUsageHistory();

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
      const createdHabits = [];
      for (const habitConfig of SAMPLE_DATA_CONFIG.habits) {
        const calendarId = calendarIdMap.get(habitConfig.calendarName);
        if (!calendarId) {
          console.warn(`Calendar not found: ${habitConfig.calendarName}`);
          continue;
        }

        // Generate a unique ID for the habit
        const habitId = uuid();

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

        createdHabits.push({
          id: habitId,
          name: habitConfig.name,
          type: habitConfig.type
        });
      }

      // Wait for habits to be created and get the actual IDs
      await habitsStore.refresh();
      const allHabits = get(habitsStore);

      // Update the createdHabits array with actual IDs from the store
      const actualCreatedHabits = SAMPLE_DATA_CONFIG.habits
        .map((habitConfig) => {
          const actualHabit = allHabits.find((h) => h.name === habitConfig.name);
          return {
            id: actualHabit?.id || "",
            name: habitConfig.name,
            type: habitConfig.type
          };
        })
        .filter((h) => h.id); // Filter out any habits that weren't found

      // Generate 28 days of completion history
      await generateCompletionsHistory(actualCreatedHabits);

      // Refresh all stores to ensure UI updates
      await Promise.all([
        calendarsStore.refresh(),
        habitsStore.refresh(),
        completionsStore.refresh()
      ]);

      console.log("Sample data with 28-day history generated successfully!");

      // Call callback to notify parent component
      ondatagenerated?.();
    } catch (error) {
      console.error("Error generating sample data:", error);
    } finally {
      isGenerating = false;
    }
  }

  function openDialog() {
    showDialog = true;
  }
</script>

<AlertDialog.Root bind:open={showDialog}>
  <AlertDialog.Trigger>
    <Button
      size="sm"
      variant="outline"
      onclick={openDialog}
      disabled={isGenerating}
      class="text-muted-foreground hover:text-foreground"
    >
      <WandSparkles class="mr-2 h-4 w-4" />
      {isGenerating ? "Generating..." : "Generate Sample Data"}
    </Button>
  </AlertDialog.Trigger>

  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Generate Sample Data</AlertDialog.Title>
      <AlertDialog.Description>
        This will create sample calendars, habits, and 28 days of completion history to help you
        explore the app. It will also simulate 28 days of app usage history.
        <br /><br />
        <strong>Note:</strong> This action will add data to your current workspace and cannot be easily
        undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={generateSampleData}>Generate Sample Data</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
