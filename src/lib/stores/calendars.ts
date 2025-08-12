// Svelte store for managing calendar data with Drizzle ORM persistence
// - All CRUD operations are persisted to SQLite (via Drizzle ORM)
// - Store is reactive: UI updates automatically on changes
// - Used throughout dashboard and calendar pages

// Drizzle: use table.$inferSelect/$inferInsert instead of deprecated InferModel
import { get, writable } from "svelte/store";

// import { eq } from "drizzle-orm";

// Use centralized Convex operations for DRY principles
import { convexMutation, convexSubscription } from "$lib/utils/convex-operations";
// Path to Convex API
import { api } from "../../convex/_generated/api";
import type { calendars as calendarsSchema } from "../db/schema";
// All data operations are now done through the local-data service,
// which handles DB connection and persistence.
import * as localData from "../services/local-data";
// Phase 3.7: Enforce allowed color names at the store boundary to guard non-UI callers
import { normalizeCalendarColor } from "../utils/colors";
// Phase 3.7: Per-type initial sync detection via local sync metadata
import { getLastSyncTimestamp, updateLastSyncTimestamp } from "../utils/convex-operations";
import { subscriptionStore } from "./subscription";

export type Calendar = typeof calendarsSchema.$inferSelect;
// Input type for creating new calendars via the store's add method
export type CalendarInputData = Pick<Calendar, "name" | "colorTheme"> & { position?: number };

// Centralized debug flag
import { DEBUG_VERBOSE } from "$lib/utils/debug";

/**
 * Creates a Svelte store for managing calendars, including local persistence and Convex synchronization.
 * This store handles loading, creating, updating, and deleting calendars, and ensures data consistency
 * between the local SQLite database and the Convex backend.
 */
export function createCalendarsStore() {
  const _calendars = writable<Calendar[]>([]);
  const isLoading = writable(true); // True by default until initial load
  const isSyncing = writable(false); // For Convex operations

  let currentClerkUserId: string | null = null;
  let convexUnsubscribe: (() => void) | null = null; // To manage Convex subscription

  /**
   * Loads calendars from the local SQLite database and updates the store's state.
   * This function is used for initial loading and as a fallback when Convex is unavailable.
   */
  async function _loadFromLocalDB() {
    isLoading.set(true);
    try {
      // A better approach would be localData.getCalendarsForUser(userId)
      const allCalendars = await localData.getAllCalendars();
      if (currentClerkUserId) {
        _calendars.set(
          allCalendars.filter(
            (c) => c.userId === currentClerkUserId || c.userId === null || c.userId === ""
          )
        );
      } else {
        // Load calendars where userId is empty string or null
        _calendars.set(allCalendars.filter((c) => c.userId === "" || c.userId === null));
      }
    } catch (error) {
      console.error("Error loading calendars from local DB:", error);
      _calendars.set([]); // Set to empty on error
    } finally {
      isLoading.set(false);
    }
  }

  // Helper function to sync calendars created while offline/anonymous
  async function _syncAnonymousCalendars(clerkUserId: string) {
    isSyncing.set(true);
    const allCalendars = await localData.getAllCalendars();
    const anonymousCalendars = allCalendars.filter((c) => c.userId === "" || c.userId === null);

    if (anonymousCalendars.length === 0) {
      isSyncing.set(false);
      return;
    }

    if (DEBUG_VERBOSE)
      console.log(
        `Syncing ${anonymousCalendars.length} anonymous calendars for user ${clerkUserId}`
      );

    for (const cal of anonymousCalendars) {
      try {
        // Use the local ID as localUuid for Convex to ensure mapping
        await convexMutation(api.calendars.createCalendar, {
          localUuid: cal.id,
          name: cal.name,
          colorTheme: cal.colorTheme,
          position: cal.position,
          isEnabled: cal.isEnabled === 1,
          createdAt: cal.createdAt,
          updatedAt: cal.updatedAt
        });
        // After successful sync, update the local record with the new clerkUserId
        await localData.updateCalendar(cal.id, { userId: clerkUserId, updatedAt: Date.now() });
      } catch (error) {
        console.error(`Failed to sync anonymous calendar ${cal.id} to Convex:`, error);
        // Consider adding to a retry queue or notifying user
      }
    }
    // Refresh local store to reflect userId changes
    await _loadFromLocalDB();
    isSyncing.set(false);
  }

  // Set user for the store - to be called from Svelte components
  // subscribeConvex controls whether we attach Convex subscriptions (network sync)
  // Set subscribeConvex=false to only filter local data without triggering sync
  async function setUser(
    newClerkUserId: string | null,
    isInitialSync: boolean = false,
    subscribeConvex: boolean = true
  ) {
    // If userId didn't change, we may still need to transition from
    // local-only (no Convex subscription) to subscribed mode. Allow that.
    if (newClerkUserId === currentClerkUserId) {
      if (subscribeConvex && !convexUnsubscribe) {
        // proceed to set up subscription without changing userId
      } else {
        return; // Nothing to do
      }
    }

    currentClerkUserId = newClerkUserId;

    if (convexUnsubscribe) {
      convexUnsubscribe();
      convexUnsubscribe = null;
      if (DEBUG_VERBOSE) console.log("Unsubscribed from Convex calendar updates.");
    }

    if (currentClerkUserId) {
      // Local-only mode: show signed-in user's local data without network activity
      if (!subscribeConvex) {
        await _loadFromLocalDB();
        return;
      }
      // User is logged in. Enable network sync and subscription when requested.
      if (DEBUG_VERBOSE) console.log("Calendars: enabling Convex subscription/sync...");
      isLoading.set(true);
      isSyncing.set(true);

      await _syncAnonymousCalendars(currentClerkUserId);

      try {
        // Subscribe to the query using onUpdate
        convexUnsubscribe = convexSubscription(
          api.calendars.getUserCalendars,
          {},
          async (convexCalendarsFromServer: any) => {
            if (convexCalendarsFromServer === undefined) return; // Data not ready yet.

            // --- MERGE LOGIC ---
            isSyncing.set(true);
            // Phase 3.7: Determine initial sync per-type using local sync metadata if not explicitly provided
            const initialFlag = isInitialSync || (await getLastSyncTimestamp("calendars")) === 0;
            const localUserCalendars = (await localData.getAllCalendars()).filter(
              (c) => c.userId === currentClerkUserId
            );

            const localCalendarsMap = new Map(localUserCalendars.map((c) => [c.id, c]));

            for (const convexCal of convexCalendarsFromServer) {
              if (!currentClerkUserId) return;

              const localCalendar = localCalendarsMap.get(convexCal.localUuid);
              const serverDataForLocal: Omit<Calendar, "id"> = {
                localUuid: convexCal.localUuid,
                userId: currentClerkUserId,
                name: convexCal.name,
                // Ensure normalized name even if server is still in normalization step
                colorTheme: normalizeCalendarColor(convexCal.colorTheme),
                position: convexCal.position,
                isEnabled: convexCal.isEnabled ? 1 : 0,
                createdAt: convexCal.createdAt,
                updatedAt: convexCal.updatedAt
              };

              if (localCalendar) {
                // During initial sync (user sign-in), always overwrite local data with server data
                // During ongoing sync, use Last-Write-Wins conflict resolution
                if (initialFlag || convexCal.clientUpdatedAt > localCalendar.updatedAt) {
                  await localData.updateCalendar(localCalendar.id, serverDataForLocal);
                  if (initialFlag && DEBUG_VERBOSE) {
                    console.log(
                      `📥 Initial sync: Overwriting local calendar ${localCalendar.id} with server data`
                    );
                  }
                }
                localCalendarsMap.delete(convexCal.localUuid);
              } else {
                // Create new calendar from server data
                await localData.createCalendar({
                  id: convexCal.localUuid,
                  ...serverDataForLocal
                });
                if (initialFlag && DEBUG_VERBOSE) {
                  console.log(
                    `📥 Initial sync: Creating calendar ${convexCal.localUuid} from server data`
                  );
                }
              }
            }

            // During initial sync, delete any local calendars not present on server
            // During ongoing sync, only delete if they were removed from server
            for (const localIdToDelete of localCalendarsMap.keys()) {
              await localData.deleteCalendar(localIdToDelete);
              if (initialFlag && DEBUG_VERBOSE) {
                console.log(
                  `📥 Initial sync: Deleting local calendar ${localIdToDelete} not found on server`
                );
              }
            }

            await _loadFromLocalDB();
            isSyncing.set(false);
            if (DEBUG_VERBOSE) console.log("Local calendars updated from Convex.");

            // Mark calendars as synced now that pull/merge completed
            await updateLastSyncTimestamp("calendars", Date.now());
          }
        );

        if (DEBUG_VERBOSE) console.log("Subscribed to Convex calendar updates.");
      } catch (error) {
        console.error("Convex watch for calendars failed:", error);
        await _loadFromLocalDB(); // Fallback to local
      } finally {
        isLoading.set(false);
      }
      isLoading.set(false); // Initial loading (including first sync) finished
    } else {
      // User is logged out
      if (DEBUG_VERBOSE) console.log("User logged out, loading local/anonymous calendars.");
      await _loadFromLocalDB();
    }
  }

  // Initial load from local DB when the store is first created.
  _loadFromLocalDB();

  return {
    subscribe: _calendars.subscribe,
    isLoading: { subscribe: isLoading.subscribe },
    isSyncing: { subscribe: isSyncing.subscribe }, // For later Convex use
    setUser, // Expose setUser method

    // Reloads calendars from local DB. UI should call this if needed,
    // though most operations here will update the store optimistically.
    async refresh() {
      await _loadFromLocalDB();
    },

    /**
     * Adds a new calendar to both the local database and Convex.
     * @param data - The calendar data to add, without id, userId, or isConvex properties.
     */
    async add(data: CalendarInputData) {
      // Check subscription limits before creating
      const canCreate = subscriptionStore.checkLimit("calendars");
      if (!canCreate) {
        const upgradeMessage = subscriptionStore.getUpgradeMessage("calendars");
        throw new Error(`Calendar creation limit reached. ${upgradeMessage}`);
      }

      const allCalendars = get(_calendars);
      const maxPosition =
        allCalendars.length > 0 ? Math.max(...allCalendars.map((c) => c.position ?? 0)) : -1;

      const newUuid = crypto.randomUUID();
      const now = Date.now();
      const calUserId = currentClerkUserId || "";

      const newCalendar: Calendar = {
        id: newUuid,
        localUuid: newUuid, // Sync correlation ID
        userId: calUserId,
        name: data.name,
        // Enforce allowed color names on create
        colorTheme: normalizeCalendarColor(data.colorTheme),
        position: data.position ?? maxPosition + 1,
        isEnabled: 1,
        createdAt: now,
        updatedAt: now
      };

      // Optimistic UI update first
      _calendars.update((current) =>
        [...current, newCalendar].sort((a, b) => a.position - b.position)
      );

      try {
        const createdCal = await localData.createCalendar(newCalendar);
        _calendars.update((current) =>
          current
            .map((c) => (c.id === newUuid ? createdCal : c))
            .sort((a, b) => a.position - b.position)
        );

        if (currentClerkUserId) {
          isSyncing.set(true);
          try {
            const result = await convexMutation(api.calendars.createCalendar, {
              localUuid: newCalendar.id, // local ID is the localUuid
              name: newCalendar.name,
              // Send normalized color name to server
              colorTheme: normalizeCalendarColor(newCalendar.colorTheme),
              position: newCalendar.position,
              isEnabled: newCalendar.isEnabled === 1, // Pass boolean to Convex
              // Phase 3.7: server expects createdAt/updatedAt
              createdAt: now,
              updatedAt: now
            });
            if (result !== null) {
              console.log(`Calendar ${newCalendar.id} synced to Convex.`);
            } else {
              console.warn("Failed to sync calendar to Convex");
            }
          } catch (error) {
            console.error(`Failed to sync new calendar ${newCalendar.id} to Convex:`, error);
            // TODO: Implement retry or offline queuing mechanism
          } finally {
            isSyncing.set(false);
          }
        }
      } catch (e) {
        console.error("Failed to add calendar locally:", e);
        // Revert optimistic update on error
        await _loadFromLocalDB();
        throw e; // Re-throw for the caller to handle
      }
    },

    /**
     * Updates an existing calendar in both the local database and Convex.
     * @param localUuid - The local ID of the calendar to update.
     * @param data - An object containing the properties to update.
     */
    async update(
      localUuid: string,
      data: Partial<Omit<Calendar, "id" | "userId" | "createdAt" | "updatedAt">>
    ) {
      const originalCalendars = get(_calendars);
      const calendarToUpdate = originalCalendars.find((c) => c.id === localUuid);
      if (!calendarToUpdate) {
        console.error(`Calendar with localUuid ${localUuid} not found for update.`);
        return;
      }

      let finalCalendars = [...originalCalendars];
      const now = Date.now();

      // Case 1: Position is being updated, which requires reordering.
      if (data.position !== undefined && data.position !== calendarToUpdate.position) {
        const list = originalCalendars.filter((c) => c.id !== localUuid);
        list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

        const updatedItem = { ...calendarToUpdate, ...data, updatedAt: now };

        const targetIndex = Math.max(0, Math.min(data.position, list.length));

        list.splice(targetIndex, 0, updatedItem);

        // Re-assign sequential positions and update timestamps for all affected calendars.
        finalCalendars = list.map((cal, index) => {
          const newPosition = index;
          const wasUpdated = cal.id === updatedItem.id || cal.position !== newPosition;
          return {
            ...cal,
            position: newPosition,
            updatedAt: wasUpdated ? now : cal.updatedAt
          };
        });
      } else {
        // Case 2: Simple property change without reordering.
        finalCalendars = originalCalendars.map((c) =>
          c.id === localUuid ? { ...c, ...data, updatedAt: now } : c
        );
      }

      // Optimistic UI update
      _calendars.set(finalCalendars.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));

      try {
        const originalMap = new Map(originalCalendars.map((c) => [c.id, c.updatedAt]));
        const updatePromises: Promise<void>[] = [];

        for (const finalCal of finalCalendars) {
          const originalTimestamp = originalMap.get(finalCal.id);
          // Only update if the timestamp has changed. This covers moves, shifts, and direct edits.
          if (originalTimestamp !== finalCal.updatedAt) {
            updatePromises.push(
              localData.updateCalendar(finalCal.id, {
                name: finalCal.name,
                // Always keep color normalized locally
                colorTheme: normalizeCalendarColor(finalCal.colorTheme),
                position: finalCal.position,
                isEnabled: finalCal.isEnabled,
                updatedAt: finalCal.updatedAt
              })
            );
          }
        }

        await Promise.all(updatePromises);

        if (currentClerkUserId && updatePromises.length > 0) {
          isSyncing.set(true);
          try {
            // A robust solution would use a batch update mutation.
            // For now, syncing the primary change is a pragmatic approach.
            const mainUpdatedItem = finalCalendars.find((c) => c.id === localUuid);
            if (mainUpdatedItem) {
              // Ensure the payload matches the mutation's expected input type precisely.
              // The original `data` object might contain fields not in the mutation args.
              const payload: any = {
                localUuid,
                updatedAt: mainUpdatedItem.updatedAt
              };
              if (data.name !== undefined) payload.name = data.name;
              if (data.colorTheme !== undefined)
                payload.colorTheme = normalizeCalendarColor(data.colorTheme);
              if (data.position !== undefined) payload.position = data.position;
              if (data.isEnabled !== undefined) payload.isEnabled = data.isEnabled === 1;

              const result = await convexMutation(api.calendars.updateCalendar, payload);
              if (result !== null) {
                console.log(`Calendar ${localUuid} update synced to Convex.`);
              } else {
                console.warn("Failed to update calendar in Convex");
              }
            }
          } catch (error) {
            console.error(`Failed to sync calendar update ${localUuid} to Convex:`, error);
          } finally {
            isSyncing.set(false);
          }
        }
      } catch (error) {
        console.error("Error updating calendar(s):", error);
        _calendars.set(originalCalendars);
      }
    },

    async updateOrder(reorderedCalendars: Calendar[]) {
      const originalCalendars = get(_calendars);
      const now = Date.now();
      const updatedCalendars = reorderedCalendars.map((cal, index) => ({
        ...cal,
        position: index,
        updatedAt: now
      }));

      // Optimistic UI update. By deferring with setTimeout, we let svelte-dnd-action
      // finish its DOM manipulations before Svelte rerenders the list, avoiding a race condition.
      setTimeout(() => {
        _calendars.set(updatedCalendars);
      }, 0);

      try {
        // Batch update positions in the local database
        await Promise.all(
          updatedCalendars.map((cal) =>
            localData.updateCalendar(cal.id, { position: cal.position, updatedAt: now })
          )
        );

        if (currentClerkUserId) {
          try {
            isSyncing.set(true);
            // Future implementation for Convex sync
            // const result = await convexMutation(api.calendars.updateCalendarOrder, {
            //   orderedIds: updatedCalendars.map((cal) => cal.id)
            // });
          } catch (err) {
            console.error("Failed to sync calendar order to Convex:", err);
            // Non-critical, local state is updated.
          } finally {
            isSyncing.set(false);
          }
        }
      } catch (error) {
        console.error("Failed to update calendar order:", error);
        // Revert on failure
        _calendars.set(originalCalendars);
      }
    },

    async remove(localUuid: string) {
      if (!localUuid) {
        console.error("Calendar remove function called with invalid ID");
        return;
      }

      const originalItems = get(_calendars);
      // Optimistic UI update
      _calendars.update((current) => current.filter((cal) => cal.id !== localUuid));

      try {
        // The service now handles persistence
        await localData.deleteCalendar(localUuid);

        // Convex call will be added here
        if (currentClerkUserId) {
          isSyncing.set(true);
          try {
            const result = await convexMutation(api.calendars.deleteCalendar, { localUuid });
            if (result !== null) {
              console.log(`Calendar ${localUuid} delete synced to Convex.`);
            } else {
              console.warn("Failed to delete calendar from Convex");
            }
          } catch (error) {
            console.error(`Failed to sync delete for calendar ${localUuid} to Convex:`, error);
            // TODO: Implement retry or offline queue
          } finally {
            isSyncing.set(false);
          }
        }
      } catch (e) {
        console.error("Failed to delete calendar locally:", e);
        _calendars.set(originalItems); // Revert optimistic update
        throw e;
      }
    }
  };
}

export const calendarsStore = createCalendarsStore();
// Load initial data. The subscription to Clerk's session will handle re-loading
// if the user logs in/out.
calendarsStore.refresh();
