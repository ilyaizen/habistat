import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { cubicOut } from "svelte/easing";
import type { TransitionConfig } from "svelte/transition";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Adds an optional `ref` property for Svelte element binding.
 * Usage: WithElementRef<HTMLButtonAttributes> will add `ref?: HTMLElement | null`.
 */
export type WithElementRef<T, E = HTMLElement> = T & { ref?: E | null };
