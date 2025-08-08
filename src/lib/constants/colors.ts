// Deprecated facade: keep minimal re-exports to avoid breaking older imports.
// The authoritative implementations live in $lib/utils/colors.

export type { CalendarColor } from "../utils/colors";
export {
  ALLOWED_CALENDAR_COLORS,
  colorNameToCss,
  // Temporary alias during migration: legacy callers may still import this name.
  colorNameToCss as colorNameToHex,
  isAllowedCalendarColor,
  normalizeCalendarColor
} from "../utils/colors";
