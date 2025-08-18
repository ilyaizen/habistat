<script lang="ts">
  import { WandSparkles } from "@lucide/svelte";
  import { SvelteDate, SvelteMap } from "svelte/reactivity";
  import { get } from "svelte/store";
  import { v4 as uuid } from "uuid";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as localData from "$lib/services/local-data";
  import { type Calendar, calendarsStore } from "$lib/stores/calendars";
  import { completionsStore } from "$lib/stores/completions";
  import { habits as habitsStore } from "$lib/stores/habits";
  import { normalizeCalendarColor } from "$lib/utils/colors";
  import { SAMPLE_DATA_CONFIG } from "$lib/utils/sample-data";
  import {
    generateFakeAppOpenHistory,
    sessionStore,
    updateSessionStartDate,
    getAssociatedUserId
  } from "$lib/utils/tracking";

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
   * Introduces per-habit intensity profiles, weekly patterns, and short
   * bursts to create more realistic variety. Some habits will have very
   * few completions while others will be frequent.
   */
  async function generateCompletionsHistory(
    habits: Array<{ id: string; name: string; type: string }>,
    days: number
  ) {
    // Helper: pick a random element using weights
    function weightedChoice<T>(choices: Array<{ value: T; weight: number }>): T {
      const total = choices.reduce((s, c) => s + c.weight, 0);
      let r = Math.random() * total;
      for (const c of choices) {
        if ((r -= c.weight) <= 0) return c.value;
      }
      return choices[choices.length - 1].value;
    }

    // Helper: sample from a Poisson distribution using Knuth's algorithm
    function samplePoisson(lambda: number): number {
      if (lambda <= 0) return 0;
      if (lambda > 6) {
        // For higher rates, approximate with normal to avoid long loops
        const sd = Math.sqrt(lambda);
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const n = Math.max(0, Math.round(lambda + sd * z));
        return n;
      }
      let L = Math.exp(-lambda);
      let k = 0;
      let p = 1;
      while (p > L) {
        p *= Math.random();
        k++;
      }
      return k - 1;
    }

    // Helper: pick a realistic hour bucket and return [hour, minute]
    function sampleTime(): [number, number] {
      const bucket = weightedChoice([
        { value: "morning", weight: 3 },
        { value: "midday", weight: 2 },
        { value: "evening", weight: 4 },
        { value: "late", weight: 1 }
      ] as const);
      let start = 6;
      let end = 9;
      if (bucket === "midday") {
        start = 11;
        end = 14;
      } else if (bucket === "evening") {
        start = 17;
        end = 21;
      } else if (bucket === "late") {
        start = 21;
        end = 23;
      }
      const hour = start + Math.floor(Math.random() * (end - start + 1));
      const minute = Math.floor(Math.random() * 60);
      return [hour, minute];
    }

    // Assign a behavior profile to each habit so variety persists across days
    type HabitProfile = {
      baseMean: number; // baseline completions/day
      weekendMultiplier: number; // weekend adjustment factor
      skipDayProbability: number; // chance to skip an entire day for this habit
      burst?: { startOffset: number; length: number; multiplier: number };
    };
    const habitProfiles = new SvelteMap<string, HabitProfile>();
    for (const habit of habits) {
      // Randomly pick an intensity tier; bias toward medium/low to produce
      // more sparse data for many habits.
      const tier = weightedChoice([
        { value: "high", weight: 2 },
        { value: "medium", weight: 4 },
        { value: "low", weight: 3 },
        { value: "rare", weight: 2 }
      ] as const);

      let baseMean = 1.0;
      let skipDayProbability = 0.1;
      if (tier === "high") {
        baseMean = 2 + Math.random(); // 2.0 - 3.0
        skipDayProbability = 0.05;
      } else if (tier === "medium") {
        baseMean = 1 + Math.random() * 0.8; // 1.0 - 1.8
        skipDayProbability = 0.15;
      } else if (tier === "low") {
        baseMean = 0.2 + Math.random() * 0.6; // 0.2 - 0.8
        skipDayProbability = 0.35;
      } else {
        baseMean = 0.05 + Math.random() * 0.15; // 0.05 - 0.2
        skipDayProbability = 0.6;
      }

      // Weekends can be a dip or boost per habit
      const weekendMultiplier = 0.6 + Math.random() * 0.8; // 0.6 - 1.4

      // Some habits have a short "burst" window of higher activity
      let burst: HabitProfile["burst"] | undefined = undefined;
      if (Math.random() < 0.4 && days >= 4) {
        const length = 2 + Math.floor(Math.random() * 3); // 2-4 days
        const startOffset = Math.max(0, Math.floor(Math.random() * Math.max(1, days - length)));
        const multiplier = 2 + Math.random(); // 2.0 - 3.0
        burst = { startOffset, length, multiplier };
      }

      habitProfiles.set(habit.id, {
        baseMean,
        weekendMultiplier,
        skipDayProbability,
        burst
      });
    }

    const today = new SvelteDate();
    // Use Clerk user ID if authenticated, null if anonymous
    const currentUserId = getAssociatedUserId();
    for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
      const date = new SvelteDate(today);
      date.setDate(today.getDate() - dayOffset);
      for (const habit of habits) {
        // Pull the profile and determine today's expected completions
        const profile = habitProfiles.get(habit.id)!;
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        // Occasionally skip an entire day for this habit
        if (Math.random() < profile.skipDayProbability) continue;

        // Apply weekend and possible burst multipliers
        let mean = profile.baseMean * (isWeekend ? profile.weekendMultiplier : 1);
        if (profile.burst) {
          const inBurst =
            dayOffset >= days - profile.burst.startOffset - profile.burst.length &&
            dayOffset < days - profile.burst.startOffset;
          if (inBurst) mean *= profile.burst.multiplier;
        }

        // Sample the number of completions for the day with a safe cap
        const numCompletions = Math.min(samplePoisson(mean), 6);
        if (numCompletions <= 0) continue;

        // Generate distinct timestamps within the day to avoid exact dupes
        const usedSlots = new Set<string>();
        for (let i = 0; i < numCompletions; i++) {
          let hour = 12;
          let minute = 0;
          // Try a few times to find an unused slot
          for (let attempts = 0; attempts < 4; attempts++) {
            const t = sampleTime();
            hour = t[0];
            minute = t[1];
            const key = `${hour}:${minute}`;
            if (!usedSlots.has(key)) {
              usedSlots.add(key);
              break;
            }
          }

          const completionTime = new SvelteDate(date);
          completionTime.setHours(hour, minute, 0, 0);
          await localData.createCompletion({
            id: uuid(),
            habitId: habit.id,
            completedAt: completionTime.getTime(),
            // Use the completion's timestamp for initial clientUpdatedAt so
            // historical samples keep stable LWW ordering during sync.
            clientUpdatedAt: completionTime.getTime(),
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
      const createdCalendars: string[] = [];
      for (const calendarConfig of SAMPLE_DATA_CONFIG.calendars) {
        // Persist allowed color NAME; UI will map to hex for display.
        const colorTheme = normalizeCalendarColor(calendarConfig.colorTheme);
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
      const calendarIdMap = new SvelteMap<string, string>();
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
      const createdHabits: Array<{ id: string; name: string; type: string }> = [];
      for (const habitConfig of SAMPLE_DATA_CONFIG.habits) {
        const calendarId = calendarIdMap.get(habitConfig.calendarName);
        if (!calendarId) {
          console.warn(`Calendar not found: ${habitConfig.calendarName}`);
          continue;
        }
        const habitId = uuid();
        const hasTimer = !!habitConfig.timerEnabled;
        const durationSeconds =
          hasTimer && habitConfig.targetDurationMinutes
            ? habitConfig.targetDurationMinutes * 60
            : null;
        await habitsStore.add({
          name: habitConfig.name,
          description: habitConfig.description,
          type: habitConfig.type,
          timerEnabled: hasTimer ? 1 : 0,
          targetDurationSeconds: durationSeconds,
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

      // If online and authenticated, proactively trigger a sync so the cloud reflects
      // generated sample data immediately. This also avoids leaving partial local-only state
      // when starting fresh on dev/prod.
      try {
        const { syncStore } = await import("$lib/stores/sync-stores");
        const state = get(syncStore);
        if (state.isOnline) {
          await syncStore.triggerFullSync();
        }
      } catch {
        // Non-fatal; user can manually sync from settings
      }
      // Refresh activity monitor if ref provided
      activityMonitorRef?.refresh?.();
      console.log("Sample data generated successfully!");

      // Show success toast
      const { toast } = await import("svelte-sonner");
      toast.success("🎉 Sample Data Generated!", {
        description: `Successfully created ${numDays} days of sample calendars, habits, completions, and activity history.`,
        duration: 4000
      });

      ondatagenerated?.();
    } catch (error) {
      console.error("Error generating sample data:", error);

      // Show error toast
      const { toast } = await import("svelte-sonner");
      toast.error("Sample Data Generation Failed", {
        description: `Failed to generate sample data: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration: 5000
      });
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
