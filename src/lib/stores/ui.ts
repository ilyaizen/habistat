import { writable } from "svelte/store";

// Writable store to trigger fireworks effect
// Set to true to start fireworks, false to stop or after duration
export const triggerFireworks = writable(false);
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

// Legacy fireworks store removed - replaced by confetti system
