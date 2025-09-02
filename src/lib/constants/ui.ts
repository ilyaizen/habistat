// UI constants shared across components
// Centralize defaults for history/activity day counts so we can tweak once.

/** Default number of days to show on small/mobile screens. */
export const DEFAULT_HISTORY_DAYS_MOBILE = 28;

/** Default number of days to show on larger/desktop screens. */
export const DEFAULT_HISTORY_DAYS_DESKTOP = 56;

/**
 * Get the default number of days for history/activity views based on viewport.
 * Keep logic minimal here; components can still override via explicit props.
 */
export function getDefaultHistoryDays(isMobile: boolean): number {
    return isMobile ? DEFAULT_HISTORY_DAYS_MOBILE : DEFAULT_HISTORY_DAYS_DESKTOP;
}
