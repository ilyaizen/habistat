import { v } from "convex/values";

/**
 * Shared Convex-side constants.
 * Note: We duplicate the allowed calendar colors server-side to avoid importing
 * client code into the Convex runtime. Keep this list in sync with
 * `src/lib/utils/colors.ts`.
 */

export const ALLOWED_CALENDAR_COLORS = [
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "red",
  "orange",
  "amber",
  "yellow"
] as const;

export type CalendarColor = (typeof ALLOWED_CALENDAR_COLORS)[number];

/**
 * Validator for calendar color after Step 2 tightening.
 * Using a `v.union` of literals ensures Convex rejects invalid values at write-time.
 */
export const calendarColorValidator = v.union(
  ...ALLOWED_CALENDAR_COLORS.map((c) => v.literal(c))
);

// Phase 3.7 Step 2: After monitoring normalization events (R1), we now reject
// invalid colors at the Convex layer. Toggle to `false` if rollback is needed.
export const REJECT_INVALID_CALENDAR_COLOR = true as const;


