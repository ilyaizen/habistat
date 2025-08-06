/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as activityHistory from "../activityHistory.js";
import type * as auth_helpers from "../auth_helpers.js";
import type * as calendars from "../calendars.js";
import type * as cleanup from "../cleanup.js";
import type * as completions from "../completions.js";
import type * as debug from "../debug.js";
import type * as habits from "../habits.js";
import type * as http from "../http.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  activityHistory: typeof activityHistory;
  auth_helpers: typeof auth_helpers;
  calendars: typeof calendars;
  cleanup: typeof cleanup;
  completions: typeof completions;
  debug: typeof debug;
  habits: typeof habits;
  http: typeof http;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
