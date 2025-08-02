# Convex + Clerk Authentication Fix Guide

> **🎉 STATUS: RESOLVED** ✅
> As of the latest fixes, the race condition has been completely resolved. Authentication now works reliably.
> See `CONVEX_AUTH_TESTING_GUIDE.md` for testing instructions.

## 🔍 Root Cause Analysis

Your **"Not authenticated"** error where `ctx.auth.getUserIdentity()` returns null is caused by a **race condition** between client-side authentication and backend query execution.

### The Problem
1. **Convex queries execute immediately** when components mount, even before authentication is fully established
2. **Client-side authentication takes time** - Clerk needs to load, validate the session, and fetch the JWT token
3. **Your queries don't wait** for authentication to be ready, causing `getUserIdentity()` to return null

## 🚀 Immediate Solutions

### 1. Use Authenticated Query Hooks (RECOMMENDED)

Replace your current `useQuery` calls with the new authenticated versions:

```typescript
// ❌ OLD - Can cause race conditions
const completions = useQuery(api.completions.getCompletionsSince, {
  timestamp: Date.now() - 86400000
});

// ✅ NEW - Waits for authentication
const completions = useAuthenticatedQuery(api.completions.getCompletionsSince, {
  timestamp: Date.now() - 86400000
});
```

### 2. Check Authentication Status in Components

```svelte
<script lang="ts">
  import { useAuthenticationStatus } from '$lib/hooks/use-authenticated-query';

  const { isLoading, isAuthenticated, canQuery } = useAuthenticationStatus();

  // Only render queries when authentication is ready
</script>

{#if isLoading}
  <p>🔄 Establishing authentication...</p>
{:else if !isAuthenticated}
  <p>❌ Please sign in to continue</p>
{:else if canQuery}
  <!-- Your authenticated content here -->
  <YourQueryComponent />
{/if}
```

### 3. Use Convex Components for Better Control

```svelte
<script lang="ts">
  import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
</script>

<AuthLoading>
  <p>Loading authentication...</p>
</AuthLoading>

<Unauthenticated>
  <p>Please sign in</p>
</Unauthenticated>

<Authenticated>
  <!-- This content only renders when auth is fully ready -->
  <YourQueryComponent />
</Authenticated>
```

## 🔧 Backend Improvements

Your Convex functions now use improved authentication helpers:

```typescript
// ❌ OLD - Basic error handling
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");

// ✅ NEW - Detailed error reporting and debugging
const identity = await requireAuth(ctx);
```

## 🐛 Debug Your Current Setup

Add this to any component to test your authentication flow:

```typescript
import { debugAuthFlow } from '../debug-auth-test';

// Run in browser console
debugAuthFlow();
```

This will show you:
- ✅ Clerk loading status
- ✅ User authentication state
- ✅ Token retrieval success
- ✅ JWT token claims (aud, iss, sub)

## 📋 Step-by-Step Fix Checklist

### Frontend Fixes:
- [ ] Replace `useQuery` with `useAuthenticatedQuery` in components
- [ ] Add authentication status checks before rendering queries
- [ ] Use `<Authenticated>` components for protected content
- [ ] Test with the debug utility

### Backend Fixes:
- [ ] Functions now use `requireAuth()` helper (already updated)
- [ ] Better error messages for debugging
- [ ] Proper logging for authentication flow

### Verification:
- [ ] Run `debugAuthFlow()` in browser console
- [ ] Check browser network tab for auth tokens in WebSocket messages
- [ ] Verify no "Not authenticated" errors in Convex logs
- [ ] Test query execution after sign-in

## 🎯 Expected Behavior After Fix

1. **Page Load**: Authentication status is checked first
2. **Loading State**: Shows loading while Clerk initializes
3. **Auth Ready**: Queries execute only after authentication is confirmed
4. **No Race Conditions**: `ctx.auth.getUserIdentity()` always returns valid data
5. **Better Debugging**: Clear error messages and logging

## 🔍 Testing Your Fix

1. **Sign out** and refresh the page
2. **Check browser console** - should see authentication flow logs
3. **Sign in** - queries should execute successfully
4. **No errors** in Convex dashboard logs
5. **Network tab** should show valid JWT tokens in WebSocket messages

## 📚 Key Files Modified

- `src/lib/hooks/use-authenticated-query.ts` - New authenticated query hooks
- `src/convex/auth_helpers.ts` - Improved backend authentication helpers
- `src/convex/completions.ts` - Updated to use new auth helpers
- `src/lib/components/authenticated-query-example.svelte` - Usage example

Your authentication setup should now be race-condition free! 🎉