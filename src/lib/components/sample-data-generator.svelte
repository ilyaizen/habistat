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

  // Configurable number of days for sample data generation
  let numDays = $state(7); // Default to 7 days

  // Reference to activity monitor for refresh
  let activityMonitorRef: { refresh?: () => void } | null = null;

  /**
   * Generates fake app usage history for the past numDays.
   * This simulates that the user has been opening the app daily.
   */
  async function generateFakeUsageHistory(days: number) {
    await generateFakeAppOpenHistory(days);
    updateSessionStartDate(days - 1);
  }

  /**
   * Generates numDays of completion data for all habits.
   * Each habit gets 0-3 random completions per day.
   */
  async function generateCompletionsHistory(
    habits: Array<{ id: string; name: string; type: string }>,
    days: number
  ) {
    const today = new Date();
    const currentUserId = get(sessionStore)?.id;
    for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
      const date = new Date(today);
      date.setDate(today.getDate() - dayOffset);
      for (const habit of habits) {
        // Only positive habits, 0-3 completions per day
        const numCompletions = Math.floor(Math.random() * 4);
        for (let i = 0; i < numCompletions; i++) {
          const randomHour = Math.floor(Math.random() * 16) + 6;
          const randomMinute = Math.floor(Math.random() * 60);
          const completionTime = new Date(date);
          completionTime.setHours(randomHour, randomMinute, 0, 0);
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
   * Uses the configurable numDays value.
   */
  async function generateSampleData() {
    isGenerating = true;
    showDialog = false;
    try {
      sessionStore.ensure();
      await generateFakeUsageHistory(numDays);
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
      await Promise.all([
        calendarsStore.refresh(),
        new Promise((resolve) => setTimeout(resolve, 100))
      ]);
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
      // Create habits (assume all are positive)
      const createdHabits = [];
      for (const habitConfig of SAMPLE_DATA_CONFIG.habits) {
        const calendarId = calendarIdMap.get(habitConfig.calendarName);
        if (!calendarId) {
          console.warn(`Calendar not found: ${habitConfig.calendarName}`);
          continue;
        }
        const habitId = uuid();
        await habitsStore.add({
          name: habitConfig.name,
          description: habitConfig.description,
          type: habitConfig.type,
          timerEnabled: 0,
          targetDurationSeconds: null,
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
      await habitsStore.refresh();
      const allHabits = get(habitsStore);
      const actualCreatedHabits = SAMPLE_DATA_CONFIG.habits
        .map((habitConfig) => {
          const actualHabit = allHabits.find((h) => h.name === habitConfig.name);
          return {
            id: actualHabit?.id || "",
            name: habitConfig.name,
            type: habitConfig.type
          };
        })
        .filter((h) => h.id);
      await generateCompletionsHistory(actualCreatedHabits, numDays);
      await Promise.all([
        calendarsStore.refresh(),
        habitsStore.refresh(),
        completionsStore.refresh()
      ]);
      // Refresh activity monitor if ref provided
      activityMonitorRef?.refresh?.();
      console.log("Sample data generated successfully!");
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
        This will create sample calendars, habits, and {numDays} days of completion history to help you
        explore the app. It will also simulate {numDays} days of app usage history.
        <br /><br />
        <strong>Note:</strong> This action will add data to your current workspace and cannot be easily
        undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <div class="my-4 flex flex-col gap-2">
      <label for="days-slider" class="text-sm font-medium">Days of history: {numDays}</label>
      <input
        id="days-slider"
        type="range"
        min="1"
        max="30"
        bind:value={numDays}
        class="accent-primary w-full"
        disabled={isGenerating}
      />
    </div>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={generateSampleData}>Generate Sample Data</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
