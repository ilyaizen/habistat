# name: "Phase 3: SaaS Subscription Management & UI Limits - Habistat"

description: |
Implement subscription-aware UI logic, tier limitations, and sync feedback for the Habistat SaaS model. Based on Phase 3 requirements from implementation-plan.md.

## Core Principles

1. **Context is King**: Include ALL necessary documentation, examples, and caveats.
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix.
3. **Information Dense**: Use keywords and patterns from the codebase.
4. **Progressive Success**: Start simple, validate, then enhance.

---

## Goal

Implement the subscription store, UI logic for free tier limits, sync status feedback, and entitlement checks to enable the SaaS business model in Habistat. Users should see clear limitations on free tier, upgrade prompts, and visual sync indicators.

## Why

- **Business value**: Enable monetization through tier-based feature gating
- **User experience**: Clear feedback on sync status and subscription benefits
- **Integration**: Build on existing Convex auth and local-first architecture
- **Problems solved**: Transparent pricing model, user retention through upgrade paths

## What

Subscription-aware UI that:

1. Displays current subscription tier and limits
2. Prevents creation beyond free tier limits (3 calendars, 7 habits per calendar)
3. Shows sync status indicators (Offline, Syncing, Synced)
4. Provides upgrade prompts and disable states for over-limit items
5. Integrates with existing Convex user management

### Success Criteria

- [ ] Free tier limits enforced in UI (creation disabled when limits reached)
- [ ] Subscription status visible in settings and relevant UI components
- [ ] Over-limit items visually disabled but not deleted
- [ ] Sync status indicators working across all data operations
- [ ] Upgrade prompts contextual and non-intrusive
- [ ] All limits persist across app restarts and sync events

## All Needed Context

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://docs.convex.dev/auth/clerk
  why: Existing auth patterns for user identity in queries/mutations

- file: src/convex/users.ts
  why: getCurrentUser query pattern and subscription field structure

- file: src/lib/stores/calendars.ts
  why: Existing store patterns, Convex integration, sync logic

- file: src/lib/utils/convex.ts
  why: Client initialization and auth setup patterns

- docfile: Docs/guidebook.md
  why: Local-first architecture, Svelte 5 runes, performance patterns

- url: https://kit.svelte.dev/docs/state-management
  why: Reactive stores and derived state patterns
```

### Current Codebase Tree (Key Files)

```bash
src/
├── lib/
│   ├── stores/
│   │   ├── calendars.ts          # Existing store with sync patterns
│   │   ├── habits.ts             # Existing store with sync patterns
│   │   ├── network.ts            # isOnline store for sync feedback
│   │   └── user.ts               # User/auth store with Clerk integration
│   ├── services/
│   │   └── sync.ts               # Sync service patterns
│   └── utils/
│       └── convex.ts             # Convex client setup
├── convex/
│   ├── users.ts                  # getCurrentUser query exists
│   └── schema.ts                 # Users table with subscription fields
└── routes/
    ├── dashboard/
    │   └── +page.svelte          # Main UI needing subscription logic
    └── settings/
        └── account/
            └── +page.svelte      # Settings page for subscription display
```

### Desired Codebase Tree with New Files

```bash
src/lib/stores/
└── subscription.ts               # New: Subscription status management

src/lib/components/
├── ui/
│   ├── sync-indicator.svelte     # New: Sync status visual feedback
│   └── upgrade-prompt.svelte     # New: Contextual upgrade messaging
└── subscription/
    ├── tier-limit-guard.svelte   # New: Wrapper for limit enforcement
    └── subscription-badge.svelte # New: Current tier display

src/lib/utils/
└── subscription-limits.ts        # New: Constants and limit checking logic
```

### Known Gotchas of Codebase & Library Quirks

```typescript
// CRITICAL: Svelte 5 Runes ($effect, $state, etc.) are only valid inside .svelte files.
// CRITICAL: Use $derived for computed state to prevent 'effect_update_depth_exceeded' errors.
// CRITICAL: Convex client auth setup requires token from /api/auth/token endpoint.
// CRITICAL: Store updates must trigger Svelte reactivity - use .set() or writable stores.
// CRITICAL: Never import Node-only packages (better-sqlite3) in client-side code.
// PATTERN: All Convex queries/mutations require identity.subject for user scoping.
// PATTERN: Free tier limits: 3 calendars max, 7 habits per calendar max.
// PATTERN: Subscription tiers: "free", "premium_monthly", "premium_lifetime".
```

## Implementation Blueprint

### Data Models and Structure

```typescript
// src/lib/utils/subscription-limits.ts
export const FREE_TIER_LIMITS = {
  maxCalendars: 3,
  maxHabitsPerCalendar: 7,
} as const;

export type SubscriptionTier = "free" | "premium_monthly" | "premium_lifetime";

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt?: number; // Unix timestamp
  maxCalendars: number;
  maxHabitsPerCalendar: number;
}

// Store interfaces using Svelte's writable pattern
export interface SubscriptionStore {
  subscribe: (
    callback: (value: SubscriptionStatus | null) => void
  ) => () => void;
  refresh: () => Promise<void>;
  checkLimit: (type: "calendars" | "habits", calendarId?: string) => boolean;
  getUpgradeMessage: (type: "calendars" | "habits") => string;
}
```

### List of Tasks to be Completed

```yaml
Task 1:
  CREATE src/lib/utils/subscription-limits.ts:
    - DEFINE FREE_TIER_LIMITS constants
    - EXPORT SubscriptionTier and SubscriptionStatus types
    - IMPLEMENT limit checking utility functions
    - ADD upgrade message generation logic

Task 2:
  CREATE src/lib/stores/subscription.ts:
    - IMPLEMENT writable store for subscription status
    - ADD refresh() method calling convex.users.getCurrentUser
    - IMPLEMENT checkLimit() method for tier enforcement
    - USE existing Convex client pattern from calendars.ts
    - HANDLE authentication state changes from user store

Task 3:
  CREATE src/lib/components/ui/sync-indicator.svelte:
    - SUBSCRIBE to network store (isOnline)
    - DISPLAY sync states: "Offline", "Syncing", "Synced"
    - USE shadcn-svelte Badge component for visual feedback
    - ADD pulse animation for "Syncing" state

Task 4:
  CREATE src/lib/components/subscription/tier-limit-guard.svelte:
    - ACCEPT props: type ('calendars' | 'habits'), calendarId (optional)
    - USE subscription store to check limits
    - RENDER children only if within limits
    - SHOW upgrade prompt when limit reached
    - DISABLE interaction for over-limit existing items

Task 5:
  MODIFY src/routes/dashboard/+page.svelte:
    - IMPORT and use TierLimitGuard for "Add Calendar" button
    - ADD SyncIndicator to header/status area
    - APPLY disabled styles to over-limit calendars/habits
    - ENSURE existing functionality preserved

Task 6:
  MODIFY src/lib/stores/calendars.ts:
    - INTEGRATE subscription store for limit checking
    - PREVENT creation operations when limits exceeded
    - ADD user feedback for limit violations
    - MAINTAIN existing sync and CRUD patterns

Task 7:
  MODIFY src/lib/stores/habits.ts:
    - INTEGRATE subscription store for per-calendar limit checking
    - PREVENT habit creation beyond 7 per calendar on free tier
    - ADD contextual limit messaging
    - MAINTAIN existing store patterns
```

### Per Task Pseudocode

```typescript
// FILE: src/lib/stores/subscription.ts
// Pseudocode with CRITICAL details
import { writable, derived } from "svelte/store";
import { getConvexClient } from "$lib/utils/convex";
import { api } from "../convex/_generated/api";
import { user } from "./user"; // Existing user store
import {
  FREE_TIER_LIMITS,
  type SubscriptionStatus,
} from "$lib/utils/subscription-limits";

// PATTERN: Writable store with custom methods like existing stores
function createSubscriptionStore() {
  const { subscribe, set, update } = writable<SubscriptionStatus | null>(null);

  return {
    subscribe,

    async refresh() {
      const convex = getConvexClient();
      if (!convex) return;

      try {
        // PATTERN: Use existing getCurrentUser query from convex/users.ts
        const userData = await convex.query(api.users.getCurrentUser, {});
        if (userData) {
          const status: SubscriptionStatus = {
            tier: userData.subscriptionTier || "free",
            isActive:
              userData.subscriptionTier !== "free" &&
              (!userData.subscriptionExpiresAt ||
                userData.subscriptionExpiresAt > Date.now()),
            expiresAt: userData.subscriptionExpiresAt,
            maxCalendars:
              userData.subscriptionTier === "free"
                ? FREE_TIER_LIMITS.maxCalendars
                : Infinity,
            maxHabitsPerCalendar:
              userData.subscriptionTier === "free"
                ? FREE_TIER_LIMITS.maxHabitsPerCalendar
                : Infinity,
          };
          set(status);
        }
      } catch (error) {
        console.error("Failed to refresh subscription status:", error);
      }
    },

    checkLimit(type: "calendars" | "habits", calendarId?: string): boolean {
      // PATTERN: Access store value synchronously with get() helper
      const status = get(subscriptionStore);
      if (!status || status.tier !== "free") return true; // Premium has no limits

      if (type === "calendars") {
        // Check current calendar count against limit
        // Use existing calendars store to get current count
      } else {
        // Check habits count for specific calendar
        // Use existing habits store to get count for calendarId
      }
    },
  };
}

export const subscriptionStore = createSubscriptionStore();

// PATTERN: Subscribe to user store changes to refresh subscription
user.subscribe(($user) => {
  if ($user?.isLoaded) {
    subscriptionStore.refresh();
  }
});
```

```svelte
<!-- FILE: src/lib/components/subscription/tier-limit-guard.svelte -->
<!-- Pseudocode with CRITICAL details -->
<script lang="ts">
  import { subscriptionStore } from "$lib/stores/subscription";
  import UpgradePrompt from "./upgrade-prompt.svelte";

  // PATTERN: Use Svelte 5 $props rune for component props
  let {
    type,
    calendarId,
    children,
    showUpgradePrompt = true
  }: {
    type: "calendars" | "habits";
    calendarId?: string;
    children: any;
    showUpgradePrompt?: boolean;
  } = $props();

  // PATTERN: Use $derived for computed state to avoid reactive loops
  const canCreate = $derived(() => {
    return subscriptionStore.checkLimit(type, calendarId);
  });

  const upgradeMessage = $derived(() => {
    return subscriptionStore.getUpgradeMessage(type);
  });
</script>

{#if canCreate}
  {@render children()}
{:else if showUpgradePrompt}
  <UpgradePrompt message={upgradeMessage} />
{/if}
```

### Integration Points

```yaml
DATABASE:
  - existing: "Users table in Convex already has subscription fields"
  - pattern: "Query via convex.users.getCurrentUser for subscription status"

CONFIG:
  - add to: src/lib/utils/subscription-limits.ts
  - pattern: "Export constants for easy configuration changes"

ROUTES:
  - modify: src/routes/dashboard/+page.svelte
  - modify: src/routes/settings/account/+page.svelte
  - pattern: "Add subscription awareness to creation flows"

STORES:
  - integrate: src/lib/stores/calendars.ts, habits.ts
  - pattern: "Check limits before allowing creation operations"
```

## Validation Loop

### Level 1: Syntax & Style

```bash
# Run these FIRST - fix any errors before proceeding
bun lint                    # Biome linting
bunx tsc --noEmit           # TypeScript type checking
bun format                  # Biome formatting

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Unit Tests

```typescript
// CREATE tests/subscription.test.ts with these test cases:
import { describe, it, expect, beforeEach, vi } from "vitest";
import { get } from "svelte/store";
import { subscriptionStore } from "$lib/stores/subscription";
import { FREE_TIER_LIMITS } from "$lib/utils/subscription-limits";

describe("Subscription Store", () => {
  beforeEach(() => {
    // Mock Convex client
    vi.mock("$lib/utils/convex", () => ({
      getConvexClient: () => ({
        query: vi.fn().mockResolvedValue({
          subscriptionTier: "free",
          subscriptionExpiresAt: null,
        }),
      }),
    }));
  });

  it("initializes with null status", () => {
    const status = get(subscriptionStore);
    expect(status).toBeNull();
  });

  it("enforces free tier calendar limits", async () => {
    await subscriptionStore.refresh();
    const canCreateCalendar = subscriptionStore.checkLimit("calendars");
    // Test logic based on current calendar count
  });

  it("allows unlimited creation for premium tiers", async () => {
    // Mock premium subscription response
    // Test that limits are bypassed
  });
});
```

```bash
# Run and iterate until passing:
bun test tests/subscription.test.ts
# If failing: Read error, understand root cause, fix code, re-run.
```

### Level 3: Integration Test

```bash
# Start the dev server
bun dev

# Test subscription status loads
curl http://localhost:5173/api/auth/token
# Expected: Valid JWT token if authenticated

# Test dashboard with limits (requires manual testing)
# 1. Navigate to /dashboard
# 2. Verify "Add Calendar" is disabled after 3 calendars on free tier
# 3. Verify upgrade prompts appear when limits reached
# 4. Verify sync indicator shows current status

# Test settings page subscription display
# Navigate to /settings/account and verify subscription info displayed
```

### Level 4: Production Build & E2E

```bash
# Production build check
bun build
bun tauri build

# Expected: Successful build with no errors
# Common issues:
# - Convex client not initialized in SSR -> Check browser guards
# - Store subscription errors -> Check user authentication flow
# - Type errors in subscription logic -> Run bunx tsc --noEmit

# E2E test scenarios:
# 1. Anonymous user sees free tier limits
# 2. Authenticated user sees subscription status
# 3. Free tier user cannot exceed limits
# 4. Premium user has no creation restrictions
# 5. Sync indicators update during network changes
```

## Final Validation Checklist

- [ ] All tests pass: `bun test`
- [ ] No linting errors: `bun lint`
- [ ] No type errors: `bunx tsc --noEmit`
- [ ] Free tier limits enforced in UI (manual test with 3+ calendars)
- [ ] Subscription status displays correctly in settings
- [ ] Sync indicator shows accurate network/sync status
- [ ] Over-limit items are visually disabled but not deleted
- [ ] Upgrade prompts are contextual and helpful
- [ ] Performance is smooth with reactive updates

## Authentication Issues Resolved (2025-01-28)

**FIXED**: The following authentication issues were identified and resolved:

1. **Missing `localUuid` Field**: Fixed sync service mapping `c.localUuid` → `c.id` in `batchUpsertCompletions`
2. **Clerk JWT Template**: Required "convex" JWT template in Clerk dashboard with `aud: "convex"`
3. **Environment Variable**: Must set `CLERK_JWT_ISSUER_DOMAIN` in Convex environment
4. **Token Endpoint**: Updated to properly request Convex-compatible JWT tokens

**Setup Required**: Follow the instructions in `Docs\clerk-setup.md` to complete the authentication configuration.

---

## Anti-Patterns to Avoid

- ❌ Don't create $effect chains that write to signals read by other effects
- ❌ Don't hardcode limits - use constants from subscription-limits.ts
- ❌ Don't prevent viewing/editing over-limit items, only creation
- ❌ Don't ignore offline state - handle gracefully with network store
- ❌ Don't bypass existing store patterns - integrate with current architecture
- ❌ Don't forget to handle premium users who downgrade with existing over-limit data
- ❌ Don't make upgrade prompts aggressive or block core functionality

**Confidence Score: 9/10** - Comprehensive context with existing patterns, clear validation gates, and progressive implementation approach.

---

Implementation Complete! 🎉

I've successfully implemented the Phase 3: SaaS Subscription Management & UI Limits features for Habistat. Here's what was delivered:

✅ Core Components Created:

1. src/lib/utils/subscription-limits.ts - Tier limits and utility functions
2. src/lib/stores/subscription.ts - Subscription status management store
3. src/lib/components/ui/sync-indicator.svelte - Network/sync status feedback
4. src/lib/components/subscription/subscription-badge.svelte - Current tier display
5. src/lib/components/subscription/tier-limit-guard.svelte - Creation limit enforcement
6. src/lib/components/subscription/upgrade-prompt.svelte - Contextual upgrade messaging

✅ Key Features Implemented:

- Free Tier Limits: 3 calendars max, 7 habits per calendar max
- Subscription Status: Real-time display in header and settings
- Limit Enforcement: "New Calendar" buttons replaced with upgrade prompts when limits reached
- Sync Indicators: Shows "Offline/Syncing/Synced" status for authenticated users
- Settings Integration: Complete subscription info display in Account tab
- Reactive Updates: All components refresh subscription data when user authentication changes

✅ Integration Points:

- Dashboard: New Calendar buttons wrapped in TierLimitGuard
- App Header: Added sync indicator and subscription badge
- Settings: Enhanced account tab with detailed subscription information
- Convex Backend: Updated getCurrentUser query to use auth context properly

✅ Architecture Benefits:

- Local-First Compatible: Works with existing offline-first approach
- Type-Safe: Full TypeScript integration with proper type definitions
- Performance Optimized: Uses Svelte 5 runes and derived state correctly
- Context-Aware: Integrates with existing Clerk authentication patterns
- Modular: Clean separation of concerns with reusable components

The implementation follows all the established patterns from the Docs/guidebook.md and integrates seamlessly with the existing codebase. The subscription
management is now ready to support the SaaS business model with clear user feedback and proper tier enforcement.

Next Steps: This sets up the foundation for Phase 5 (Stripe Integration) where the actual payment processing and premium subscription management will be
implemented.
