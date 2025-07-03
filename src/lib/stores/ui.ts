import { writable } from "svelte/store";

// Writable store to trigger fireworks effect
// Set to true to start fireworks, false to stop or after duration
export const triggerFireworks = writable(false);
