/**
 * @typedef {import('svelte/store').Writable<any>} NumberFlowElementStore
 * We are using 'any' here because of difficulties with TypeScript resolving
 * the exported `NumberFlowElement` class from the `NumberFlow.svelte` component file within a `.js` file.
 * The intended type is: `Writable<import('./NumberFlow.svelte').NumberFlowElement | undefined>`
 */

/**
 * Defines the shape of the group context object.
 * @typedef {{ register: (el: NumberFlowElementStore) => void }} GroupContext
 */

import { getContext, setContext } from "svelte";

/**
 * A unique key to store and retrieve the number flow group context.
 * @type {Symbol | string}
 */
const GROUP_CONTEXT_KEY = "number-flow-group";

/**
 * Retrieves the group context for coordinating `NumberFlow` component animations.
 * This allows multiple components to synchronize their updates.
 * @returns {GroupContext | undefined} The group context object, if available.
 */
export function getGroupContext() {
  return getContext(GROUP_CONTEXT_KEY);
}

/**
 * Sets the group context for `NumberFlow` components.
 * This is typically called by a `NumberFlowGroup` component to provide a shared context to its children.
 * @param {GroupContext} context The group context object to set.
 */
export function setGroupContext(context) {
  setContext(GROUP_CONTEXT_KEY, context);
}
