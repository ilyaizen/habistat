/**
 * Utility functions for parsing and displaying habit and calendar names
 * 
 * Names are stored in the format "<emoji> <name>" (e.g., "🌳 Nature Bathing", "📚 Learning")
 * These utilities help separate the emoji from the text for better visual presentation.
 */

/**
 * Parses a name string to extract the emoji and text components
 * Works for both habits and calendars
 * 
 * @param name - The full name string in format "<emoji> <text>"
 * @returns Object containing the emoji and text parts, or fallback values
 */
export function parseName(name: string): {
  emoji: string;
  text: string;
} {
  // Regular expression to match emoji at the start of the string
  // This matches most Unicode emoji characters including compound emojis
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?)\s+(.+)$/u;
  
  const match = name.match(emojiRegex);
  
  if (match) {
    return {
      emoji: match[1].trim(),
      text: match[2].trim()
    };
  }
  
  // Fallback: if no emoji is found, use a default and return the full name as text
  return {
    emoji: "📝", // Default emoji for items without one
    text: name.trim()
  };
}

/**
 * Backward compatibility function for habits
 * @param habitName - The habit name string
 * @returns Object with emoji and text parts
 */
export function parseHabitName(habitName: string): {
  emoji: string;
  text: string;
} {
  return parseName(habitName);
}

/**
 * Parses a calendar name string to extract the emoji and text components
 * @param calendarName - The calendar name string
 * @returns Object with emoji and text parts, with calendar-specific default emoji
 */
export function parseCalendarName(calendarName: string): {
  emoji: string;
  text: string;
} {
  const result = parseName(calendarName);
  
  // Use calendar-specific default emoji if none found
  if (result.emoji === "📝") {
    result.emoji = "📅"; // Calendar emoji as default
  }
  
  return result;
}

/**
 * Gets the first character if it looks like an emoji, otherwise returns default
 * This is a simpler fallback approach for edge cases
 * 
 * @param name - The name string
 * @returns Object with emoji and remaining text
 */
export function parseNameSimple(name: string): {
  emoji: string;
  text: string;
} {
  const trimmed = name.trim();
  
  if (trimmed.length === 0) {
    return { emoji: "📝", text: "Untitled" };
  }
  
  // Check if first character is likely an emoji (non-ASCII)
  const firstChar = trimmed.charAt(0);
  if (firstChar.charCodeAt(0) > 127) {
    // Find where the emoji ends and text begins
    const spaceIndex = trimmed.indexOf(' ');
    if (spaceIndex > 0) {
      return {
        emoji: trimmed.substring(0, spaceIndex).trim(),
        text: trimmed.substring(spaceIndex + 1).trim()
      };
    }
  }
  
  // No emoji found, return default
  return {
    emoji: "📝",
    text: trimmed
  };
}
