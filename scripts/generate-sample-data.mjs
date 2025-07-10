import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const markdownFile = "vibes/sample-data.md";
const tsFile = "src/lib/utils/sample-data.ts";

/**
 * Parses the timer string from the markdown file.
 * @param {string} timerString - The string representing the timer, e.g., "Enabled (15 minutes)".
 * @returns {{timerEnabled: boolean, targetDurationMinutes: number|null}}
 */
function parseTimer(timerString) {
  if (!timerString || timerString === "Disabled") {
    return { timerEnabled: false, targetDurationMinutes: null };
  }

  if (timerString.startsWith("Enabled")) {
    const match = timerString.match(/\((\d+)\s*minutes\)/);
    const duration = match ? parseInt(match[1], 10) : null;
    return { timerEnabled: true, targetDurationMinutes: duration };
  }

  return { timerEnabled: false, targetDurationMinutes: null };
}

/**
 * Parses a key-value pair line from markdown.
 * @param {string} line - The line to parse (e.g., "- **Color Theme**: Purple").
 * @returns {{key: string, value: string}|null}
 */
function parseKeyValuePair(line) {
  const match = line.match(/-\s*\*\*(.*?)\*\*:\s*(.*)/);
  if (match) {
    return { key: match[1].trim(), value: match[2].trim() };
  }
  return null;
}

/**
 * Parses the content of the sample data markdown file.
 * @param {string[]} lines - The content of the markdown file as an array of lines.
 * @returns {{calendars: any[], habits: any[]}}
 */
function parseMarkdown(lines) {
  const calendars = [];
  const habits = [];
  let section = "";
  let currentCalendarForHabits = "";
  let currentItem = null;
  console.log(`--- Parsing ${lines.length} lines ---`);

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    if (trimmedLine.startsWith("## ")) {
      section = trimmedLine.substring(3).trim();
      console.log(`Found section: '${section}'`);
      continue;
    }

    if (section === "Calendars") {
      if (trimmedLine.startsWith("### ")) {
        currentItem = { name: trimmedLine.substring(4).trim() };
        calendars.push(currentItem);
        console.log(`  - Found Calendar: ${currentItem.name}`);
      } else if (currentItem && trimmedLine.startsWith("- **")) {
        const pair = parseKeyValuePair(trimmedLine);
        if (pair) {
          if (pair.key === "Color Theme") currentItem.colorTheme = pair.value;
          if (pair.key === "Position") currentItem.position = parseInt(pair.value, 10);
        }
      }
    } else if (section === "Habits") {
      if (trimmedLine.startsWith("### ")) {
        currentCalendarForHabits = trimmedLine.substring(4).trim();
      } else if (trimmedLine.startsWith("#### ")) {
        currentItem = {
          calendarName: currentCalendarForHabits,
          name: trimmedLine.substring(5).trim()
        };
        habits.push(currentItem);
        console.log(`    - Found Habit: ${currentItem.name}`);
      } else if (currentItem && trimmedLine.startsWith("- **")) {
        const pair = parseKeyValuePair(trimmedLine);
        if (pair) {
          switch (pair.key) {
            case "Description":
              currentItem.description = pair.value;
              break;
            case "Type":
              currentItem.type = pair.value;
              break;
            case "Timer": {
              const { timerEnabled, targetDurationMinutes } = parseTimer(pair.value);
              currentItem.timerEnabled = timerEnabled;
              currentItem.targetDurationMinutes = targetDurationMinutes;
              break;
            }
            case "Points":
              currentItem.pointsValue = parseInt(pair.value, 10);
              break;
            case "Position":
              currentItem.position = parseInt(pair.value, 10);
              break;
          }
        }
      }
    }
  }

  return { calendars, habits };
}

/**
 * Generates the TypeScript file content for the sample data.
 * @param {any[]} calendars - The array of calendar objects.
 * @param {any[]} habits - The array of habit objects.
 * @returns {string}
 */
function generateTsContent(calendars, habits) {
  const calendarsJson = JSON.stringify(calendars, null, 2);
  const habitsJson = JSON.stringify(habits, null, 2).replace(
    /"type": "(positive|negative)"/g,
    `"type": "$1" as const`
  );

  return `/**
 * Sample data configuration for generating demo content in the app.
 * This includes sample calendars and sample habits.
 *
 * ⚠️ THIS FILE IS AUTO-GENERATED. DO NOT EDIT.
 * To edit sample data, modify \`vibes/sample-data.md\` and run \`pnpm run generate:sample-data\`.
 */

// Sample data configuration - easily editable for demo purposes
export const SAMPLE_DATA_CONFIG = {
  calendars: ${calendarsJson},
  habits: ${habitsJson}
} as const;

// Type definitions for sample data structure

/**
 * Represents the entire structure of the sample data configuration.
 * Derived from the \`SAMPLE_DATA_CONFIG\` constant to ensure type safety.
 */
export type SampleDataConfig = typeof SAMPLE_DATA_CONFIG;

/**
 * Represents a single sample calendar object within the \`calendars\` array.
 * This type is inferred from the first element of the \`calendars\` array.
 */
export type SampleCalendar = (typeof SAMPLE_DATA_CONFIG.calendars)[number];

/**
 * Represents a single sample habit object within the \`habits\` array.
 * This type is inferred from the first element of the \`habits\` array.
 */
export type SampleHabit = (typeof SAMPLE_DATA_CONFIG.habits)[number];
`;
}

async function main() {
  try {
    const mdPath = path.join(projectRoot, markdownFile);

    const lines = [];
    const fileStream = createReadStream(mdPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      lines.push(line);
    }

    const { calendars, habits } = parseMarkdown(lines);
    const tsContent = generateTsContent(calendars, habits);
    const tsPath = path.join(projectRoot, tsFile);
    await fs.writeFile(tsPath, tsContent);
    console.log(`✅ Successfully generated ${tsFile}`);
  } catch (error) {
    console.error("❌ Error generating sample data:", error);
    process.exit(1);
  }
}

main();
