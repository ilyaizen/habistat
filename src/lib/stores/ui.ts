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
