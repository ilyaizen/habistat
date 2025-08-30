import { writable } from "svelte/store";

// Fireworks trigger types
export interface FireworksTrigger {
  originX: number;
  originY: number;
  points?: number; // Optional intensity proxy, similar to confetti points
  color?: string; // Optional base color for the burst
}

// Writable store to trigger fireworks effect
// Supported values:
// - false: no effect
// - true: full sequence with ascent + explosions
// - number: full sequence with intensity scaled by number
// - FireworksTrigger: single explosion at (originX, originY)
export const triggerFireworks = writable<false | true | number | FireworksTrigger>(false);
// Interface for confetti trigger data
export interface ConfettiTrigger {
  color: string;
  points: number;
  originX?: number; // Optional x coordinate for confetti origin
  originY?: number; // Optional y coordinate for confetti origin
}

// Writable store to trigger confetti effect
// Can be set to:
// - false: No confetti (default)
// - true: Basic confetti with default color
// - number: Confetti with intensity based on points value
// - ConfettiTrigger object: Confetti with custom color and points
export const triggerConfetti = writable<false | true | number | ConfettiTrigger>(false);

/**
 * Convenience helper to trigger a single fireworks explosion at a given screen position.
 * Use this when you want an immediate burst (no ascent), e.g., originating from a button.
 */
export function triggerFireworksAt(originX: number, originY: number, points = 1, color?: string) {
  triggerFireworks.set({ originX, originY, points, color });
}

// --- Damage (negative) effect triggers ---
// The damage effect is a whole-page visual that briefly desaturates the UI,
// adds a red radial overlay, and shakes the screen. This mirrors the positive
// fireworks effect API for drop-in usage anywhere in the app.

export interface DamageTrigger {
  // Optional center of the radial overlay in viewport coordinates
  originX?: number;
  originY?: number;
  // Intensity scales duration/opacity in a small range (0.2..2)
  intensity?: number;
}

// Writable store to trigger the damage effect
// Supported values:
// - false: no effect
// - true: trigger with default intensity and centered overlay
// - number: trigger with the given intensity (centered overlay)
// - DamageTrigger: trigger with custom origin and intensity
export const triggerDamage = writable<false | true | number | DamageTrigger>(false);

/**
 * Convenience helper to trigger the damage effect at a given screen position.
 * If origin is omitted, the overlay centers on the viewport.
 */
export function triggerDamageAt(originX?: number, originY?: number, intensity = 1) {
  if (typeof originX === "number" && typeof originY === "number") {
    triggerDamage.set({ originX, originY, intensity });
  } else {
    triggerDamage.set(intensity);
  }
}

// --- Intro Lottie (confetti) overlay trigger ---
// Used for the one-time intro celebration after the user starts a session.
export interface IntroConfettiOptions {
  // Playback speed multiplier (default 1.5)
  speed?: number;
  // Allow user to click or press Escape to skip (default true)
  allowSkip?: boolean;
  // Optional custom source path; defaults to "/colorful_confetti.json"
  src?: string;
}

// Set to:
// - false: hidden
// - true: show with defaults
// - IntroConfettiOptions: show with options
export const triggerIntroConfetti = writable<false | true | IntroConfettiOptions>(false);
