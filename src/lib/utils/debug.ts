// Centralized debug configuration flags
//
// Purpose:
// - Provide a single source of truth for debug toggles used across the app
// - Avoid scattering per-file DEBUG_VERBOSE constants
// - Make it easy to adjust verbosity in one place
//
// Notes:
// - Keep defaults conservative to avoid noisy consoles in production builds
// - If needed in the future, these flags can be derived from env vars
//   (e.g., import.meta.env.DEV) without changing call sites

// Controls chatty, non-essential logs across stores/services.
// Keep false by default to minimize noise.
export const DEBUG_VERBOSE = false;
