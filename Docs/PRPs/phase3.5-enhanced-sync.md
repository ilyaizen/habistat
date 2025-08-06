# name: "Phase 3.5: Enhanced Sync - Activity History & Completion Timestamps - Habistat"

description: |
Implement comprehensive sync for daily activity history and all habit completion timestamps to Convex. This intermediate phase between Phase 3 and 4 ensures complete data synchronization for analytics and cross-device consistency.

## Core Principles

1. **Context is King**: Include ALL necessary documentation, examples, and caveats.
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix.
3. **Information Dense**: Use keywords and patterns from the codebase.
4. **Progressive Success**: Start simple, validate, then enhance.

---

## Goal

Implement bidirectional sync for daily activity history (app opens/uptime) and ensure all habit completion timestamps are properly synchronized to Convex. This builds upon the existing Phase 3 sync infrastructure to provide complete data consistency across devices.

## Why

- **Analytics Foundation**: Enable usage analytics and user engagement tracking
- **Cross-Device Consistency**: Ensure activity history and completions sync across all user devices
- **Data Completeness**: Prepare for advanced features requiring complete historical data
- **Business Intelligence**: Support subscription analytics and user behavior insights
- **Problems Solved**: Missing activity data in cloud, incomplete completion history sync

## What

Enhanced sync system that:

1. Syncs daily activity history (1 timestamp per day) to new Convex `activityHistory` table
2. Ensures all habit completion timestamps are properly synchronized bidirectionally
3. Maintains existing sync patterns and conflict resolution strategies
4. Integrates seamlessly with current `SyncService.fullSync()` architecture
5. Preserves local-first approach with SQLite as source of truth

### Success Criteria

- [ ] Daily activity history syncs to Convex with proper deduplication
- [ ] All habit completion timestamps sync bidirectionally without data loss
- [ ] Activity data persists across app restarts and device changes
- [ ] Sync performance remains optimal with new data types
- [ ] No breaking changes to existing sync functionality
- [ ] Proper error handling and retry logic for new sync operations

## All Needed Context

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: src/lib/services/sync.ts
  why: Current sync service patterns, bidirectional sync logic, conflict resolution

- file: src/lib/services/user-sync.ts
  why: User sync patterns and authentication handling

- file: src/convex/schema.ts
  why: Current Convex table definitions and indexing patterns

- file: src/lib/components/activity-monitor.svelte
  why: Current activity tracking implementation and data structures

- file: src/lib/components/habit-completion-control.svelte
  why: Completion logging patterns and user interaction flows

- file: src/lib/utils/tracking.ts
  why: Local activity tracking utilities and session management

- file: src/lib/stores/completions.ts
  why: Completion store patterns and local data management

- file: Docs/implementation-plan.md
  why: Phase 3 sync architecture and established patterns

- url: https://docs.convex.dev/database/schemas
  why: Convex schema definition best practices and indexing strategies
```

### Current Codebase Tree (Key Files)

```bash
src/
├── lib/
│   ├── services/
│   │   ├── sync.ts                    # Main sync service with fullSync()
│   │   ├── user-sync.ts               # User authentication sync
│   │   └── local-data.ts              # Local SQLite operations
│   ├── stores/
│   │   ├── completions.ts             # Completion data management
│   │   └── calendars.ts               # Calendar sync patterns
│   ├── components/
│   │   ├── activity-monitor.svelte    # Activity tracking UI
│   │   └── habit-completion-control.svelte # Completion logging
│   ├── utils/
│   │   ├── tracking.ts                # Activity tracking utilities
│   │   ├── convex-operations.ts       # Sync operation helpers
│   │   └── convex.ts                  # Convex client setup
│   └── db/
│       └── schema.ts                  # Local SQLite schema
├── convex/
│   ├── schema.ts                      # Convex table definitions
│   ├── completions.ts                 # Completion queries/mutations
│   └── users.ts                       # User management functions
```

### Desired Codebase Tree with New Files

```bash
src/convex/
└── activityHistory.ts                 # New: Activity history queries/mutations

src/lib/
├── services/
│   └── sync.ts                        # Enhanced: Add activity sync methods
├── utils/
│   └── convex-operations.ts           # Enhanced: Activity sync helpers
└── db/
    └── schema.ts                      # Enhanced: Activity history local schema
```

### Known Gotchas of Codebase & Library Quirks

```typescript
// CRITICAL: Svelte 5 Runes ($effect, $state, etc.) are only valid inside .svelte files.
// CRITICAL: Use $derived for computed state to prevent 'effect_update_depth_exceeded' errors.
// CRITICAL: All Convex operations must wait for authentication via waitForConvexAuth()
// CRITICAL: Use performSafeOperation() wrapper for all sync operations
// CRITICAL: Local UUID mapping is essential - use localUuid field for sync correlation
// CRITICAL: Last-Write-Wins conflict resolution based on clientUpdatedAt timestamps

// Activity tracking pattern from tracking.ts
export async function logAppOpenIfNeeded(): Promise<boolean> {
  const today = formatLocalDate(new Date());
  const existingEntry = await getAppOpenForDate(today);
  
  if (!existingEntry) {
    await logAppOpen(); // Creates new entry with current timestamp
    return true; // New day logged
  }
  return false; // Already logged today
}

// Sync service pattern from sync.ts
async syncCompletions(): Promise<SyncResult> {
  return performSafeOperation(async () => {
    this.isSyncing = true;
    await Promise.allSettled([this.pullCompletions(), this.pushCompletions()]);
    return {};
  }, "Completions sync").finally(() => {
    this.isSyncing = false;
  });
}

// Convex schema pattern
activityHistory: defineTable({
  userId: v.string(), // Clerk User ID (from identity.subject)
  localUuid: v.string(), // Maps to local activity entry ID
  date: v.string(), // YYYY-MM-DD format for daily deduplication
  timestamp: v.number(), // First app open timestamp for this date
  clientCreatedAt: v.number(), // Timestamp from client for LWW
  clientUpdatedAt: v.number(), // Timestamp from client for LWW
})
  .index("by_user_date", ["userId", "date"]) // For daily deduplication
  .index("by_user_timestamp", ["userId", "timestamp"]) // For chronological queries
  .index("by_local_uuid", ["userId", "localUuid"]), // For sync correlation
```

## Implementation Blueprint

### Task 1: Extend Convex Schema for Activity History

```typescript
// ADD to src/convex/schema.ts
activityHistory: defineTable({
  userId: v.string(), // Clerk User ID (from identity.subject)
  localUuid: v.string(), // Maps to local activity entry ID for sync correlation
  date: v.string(), // YYYY-MM-DD format for daily deduplication
  timestamp: v.number(), // First app open timestamp for this date
  clientCreatedAt: v.number(), // Timestamp from client for LWW conflict resolution
  clientUpdatedAt: v.number(), // Timestamp from client for LWW conflict resolution
})
  .index("by_user_date", ["userId", "date"]) // For efficient daily lookups and deduplication
  .index("by_user_timestamp", ["userId", "timestamp"]) // For chronological activity queries
  .index("by_local_uuid", ["userId", "localUuid"]), // For sync correlation and updates
```

### Task 2: Create Convex Activity History Functions

```typescript
// CREATE src/convex/activityHistory.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Query to get activity history since timestamp for sync
export const getActivityHistorySince = query({
  args: { 
    timestamp: v.number(), 
    limit: v.optional(v.number()),
    cursor: v.optional(v.string())
  },
  handler: async (ctx, { timestamp, limit = 100, cursor }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Implementation follows existing completions.ts pattern
    // Return paginated results with nextCursor for large datasets
  },
});

// Mutation to batch upsert activity history entries
export const batchUpsertActivityHistory = mutation({
  args: {
    activities: v.array(v.object({
      localUuid: v.string(),
      date: v.string(),
      timestamp: v.number(),
      clientCreatedAt: v.number(),
      clientUpdatedAt: v.number(),
    }))
  },
  handler: async (ctx, { activities }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Batch upsert with conflict resolution based on clientUpdatedAt
    // Use date field for deduplication (one entry per day per user)
  },
});
```

### Task 3: Enhance SyncService with Activity History Sync

```typescript
// ENHANCE src/lib/services/sync.ts
export class SyncService {
  // ADD new method following existing syncCompletions pattern
  async syncActivityHistory(): Promise<SyncResult> {
    if (!this.userId) {
      return { success: false, error: "Not authenticated" };
    }

    if (this.isSyncing) {
      return { success: true, error: "Sync already in progress" };
    }

    if (!(await waitForConvexAuth())) {
      return { success: false, error: "Authentication not ready - please wait and try again" };
    }

    return performSafeOperation(async () => {
      this.isSyncing = true;
      await Promise.allSettled([this.pullActivityHistory(), this.pushActivityHistory()]);
      return {};
    }, "Activity history sync").finally(() => {
      this.isSyncing = false;
    });
  }

  // ADD private methods following existing completion sync patterns
  private async pullActivityHistory(): Promise<void> {
    // Pull server activity history and merge with local data
    // Use Last-Write-Wins based on clientUpdatedAt timestamps
    // Update local SQLite database via localData service
  }

  private async pushActivityHistory(): Promise<void> {
    // Get local activity history that needs syncing
    // Map to Convex format with proper userId and localUuid
    // Batch upsert to server using batchUpsertActivityHistory mutation
  }

  // ENHANCE fullSync method to include activity history
  async fullSync(userInfo?: { email: string; name?: string; avatarUrl?: string; }): Promise<SyncResult & { userSyncResult?: any }> {
    // ADD activity history sync to existing fullSync flow
    // Insert after completions sync:
    syncResults.activityHistory = await this.syncActivityHistory();
  }
}
```

### Task 4: Enhance Local Database Schema

```typescript
// ENHANCE src/lib/db/schema.ts
// ADD activity history table if not already present
export const activityHistory = sqliteTable("activity_history", {
  id: text("id").primaryKey(),
  userId: text("user_id"), // Clerk user ID when synced
  date: text("date").notNull(), // YYYY-MM-DD format
  timestamp: integer("timestamp").notNull(), // Unix timestamp of first app open
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ADD corresponding local data service functions
// ENHANCE src/lib/services/local-data.ts
export async function getActivityHistoryForSync(userId: string): Promise<ActivityHistoryEntry[]> {
  // Get all activity history entries for user that need syncing
}

export async function upsertActivityHistory(entry: ActivityHistoryEntry): Promise<void> {
  // Upsert activity history with conflict resolution
}
```

### Task 5: Enhance Activity Monitor Component

```typescript
// ENHANCE src/lib/components/activity-monitor.svelte
// ADD sync trigger when new activity is logged
async function loadActivityData() {
  // EXISTING: Load local activity data
  
  // ADD: Trigger sync if user is authenticated
  const clerkUser = $clerkUserStore;
  if (clerkUser?.id) {
    // Trigger activity history sync in background
    syncService.syncActivityHistory().catch(console.error);
  }
}
```

### Integration Points

```yaml
DATABASE:
  - enhance: "Local SQLite schema with activity_history table"
  - add: "Convex activityHistory table with proper indexing"
  - pattern: "Follow existing completion sync patterns for consistency"

SYNC_SERVICE:
  - enhance: "SyncService.fullSync() to include activity history"
  - add: "syncActivityHistory(), pullActivityHistory(), pushActivityHistory() methods"
  - pattern: "Use existing performSafeOperation and conflict resolution patterns"

COMPONENTS:
  - enhance: "activity-monitor.svelte to trigger sync on new activity"
  - verify: "habit-completion-control.svelte completion sync is working correctly"
  - pattern: "Background sync without blocking UI interactions"

CONVEX_FUNCTIONS:
  - add: "src/convex/activityHistory.ts with queries and mutations"
  - pattern: "Follow existing completions.ts patterns for consistency"
```

### Testing Strategy

```typescript
// Unit tests for sync service
describe("SyncService Activity History", () => {
  it("should sync activity history bidirectionally", async () => {
    // Test local -> server sync
    // Test server -> local sync
    // Test conflict resolution
  });

  it("should handle daily deduplication correctly", async () => {
    // Test that only one entry per day per user is maintained
  });
});

// Integration tests
describe("Activity Monitor Integration", () => {
  it("should trigger sync when new activity is logged", async () => {
    // Test that activity logging triggers background sync
  });
});
```

## Validation Gates

```bash
# Type checking
bunx tsc --noEmit

# Linting and formatting
bun lint
bun format

# Unit Tests
bun test

# Build validation
bun build

# Convex deployment validation
bunx convex dev --once

# Manual sync testing
# 1. Log activity on device A
# 2. Sync and verify data appears in Convex dashboard
# 3. Sync on device B and verify activity history appears
# 4. Test completion sync across devices
# 5. Verify no duplicate activity entries for same day
```

## Anti-Patterns to Avoid

- ❌ Don't create duplicate activity entries for the same day/user
- ❌ Don't block UI while syncing activity history - use background sync
- ❌ Don't ignore existing sync patterns - follow SyncService conventions
- ❌ Don't forget proper error handling and retry logic
- ❌ Don't bypass authentication checks - always verify user identity
- ❌ Don't create circular sync dependencies between data types
- ❌ Don't ignore conflict resolution - use Last-Write-Wins consistently

## Implementation Tasks (Ordered)

1. **Extend Convex Schema**: Add `activityHistory` table with proper indexing
2. **Create Convex Functions**: Implement queries and mutations for activity history
3. **Enhance Local Schema**: Add activity history table and data service functions
4. **Extend SyncService**: Add activity history sync methods following existing patterns
5. **Update FullSync**: Integrate activity history sync into existing fullSync flow
6. **Enhance Activity Monitor**: Add background sync trigger for new activity
7. **Verify Completion Sync**: Ensure habit completion timestamps sync correctly
8. **Add Tests**: Unit and integration tests for new sync functionality
9. **Performance Testing**: Verify sync performance with new data types
10. **Documentation**: Update sync documentation and troubleshooting guides

**Confidence Score: 9/10** - Comprehensive context with existing patterns, clear validation gates, and progressive implementation approach following established sync architecture.

---

## Current Sync Architecture Context

The existing sync system in Habistat follows these established patterns:

### SyncService Architecture
- **Bidirectional Sync**: Pull and push operations for each data type
- **Conflict Resolution**: Last-Write-Wins based on `clientUpdatedAt` timestamps
- **Authentication**: All operations wait for Convex auth via `waitForConvexAuth()`
- **Error Handling**: `performSafeOperation()` wrapper with retry logic
- **Local Mapping**: `localUuid` field correlates local and server records

### Existing Data Flow
1. **User Sync**: `UserSyncService` handles Clerk user authentication and sync
2. **Full Sync**: `SyncService.fullSync()` orchestrates all data type syncing
3. **Store Integration**: Calendars and habits sync via store `setUser()` methods
4. **Completion Sync**: Bidirectional sync with proper habit ID mapping

### Activity Tracking Current State
- **Local Tracking**: `tracking.ts` utilities log daily app opens to SQLite
- **UI Display**: `activity-monitor.svelte` shows 30-day activity visualization
- **Session Management**: Session store tracks app usage and creation date
- **Missing**: Cloud sync for activity data across devices

### Completion Tracking Current State
- **Local Logging**: `completionsStore.logCompletion()` saves to SQLite
- **UI Controls**: `habit-completion-control.svelte` provides completion interface
- **Sync Status**: Currently syncs via `SyncService.syncCompletions()`
- **Verification Needed**: Ensure all completion timestamps sync correctly

This Phase 3.5 implementation builds upon these established patterns to add comprehensive activity history sync and verify completion sync completeness.
