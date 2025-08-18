/**
 * Formats a Date object into a 'YYYY-MM-DD' string in UTC.
 * @param date The date to format.
 * @returns The formatted date string.
 */
export function formatDate(date: Date): string {
  // Always use UTC to avoid timezone issues
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date object as 'YYYY-MM-DD' in the user's local timezone.
 * This is crucial for correctly tracking daily activity based on the user's calendar day.
 * @param date The date to format.
 * @returns A string in 'YYYY-MM-DD' format.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Creates a date range for a specific day in local timezone.
 * @param dateStr Date string in 'YYYY-MM-DD' format
 * @returns Object with start and end timestamps for the day
 */
export function getLocalDayRange(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/**
 * Gets the current date string in local timezone format.
 * @returns Current date as 'YYYY-MM-DD' string
 */
export function getTodayLocal(): string {
  return formatLocalDate(new Date());
}
