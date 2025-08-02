# Convex/Clerk User Sync Implementation

This document explains the complete implementation of user synchronization between Clerk (authentication) and Convex (database) in the Habistat application.

## 🎯 Overview

The user sync system ensures that:
- **Users are automatically created** in the Convex `users` table when they sign in
- **No duplicate users** exist (unique by both email and clerkId)
- **User data is kept in sync** between Clerk and Convex
- **Proper error handling** and retry mechanisms are in place
- **Offline-first approach** is maintained

## 🏗️ Architecture

### Components

1. **Convex Users Table** (`src/convex/users.ts`)
2. **User Sync Service** (`src/lib/services/user-sync.ts`)
3. **Enhanced Sync Service** (`src/lib/services/sync.ts`)
4. **Clerk Integration** (`src/lib/hooks/use-clerk.ts`)
5. **Sync Store** (`src/lib/stores/sync.ts`)

### Data Flow

```
User Signs In → Clerk → useClerk Hook → User Sync Service → Convex Users Table
                ↓
              Session Association + Anonymous Data Migration
```

## 📋 Features Implemented

### ✅ Convex Users Table

- **Schema** with proper indexes for `clerkId` and `email`
- **Uniqueness constraints** preventing duplicates
- **Subscription support** (free, premium_monthly, premium_lifetime)
- **Proper validation** with Convex validators

### ✅ User Sync Functions

#### Internal Functions (Webhook/Server Use)
- `createOrUpdate` - Creates or updates user via webhooks
- `updateSubscription` - Updates user subscription info
- `deleteUserByClerkId` - Deletes user when removed from Clerk

#### Public Functions (Client Use)
- `syncCurrentUser` - Syncs authenticated user from client
- `getCurrentUser` - Gets current user data

### ✅ Automatic Sync Integration

- **Authentication hooks** automatically trigger user sync
- **Session association** with anonymous data migration
- **Error handling** with retry mechanisms
- **Status tracking** and progress indicators

## 🔧 Usage

### Automatic Sync (Default Behavior)

The user sync happens automatically when:
1. User signs in via Clerk
2. User data changes in Clerk
3. User signs out (cleanup)

No manual intervention needed!

### Manual Sync (Advanced)

```typescript
import { userSyncService } from "$lib/services/user-sync";

// Force sync current user
const result = await userSyncService.forceSyncCurrentUser(user);

// Check sync status
const isInProgress = userSyncService.isSyncInProgress();
const lastSyncedUserId = userSyncService.getLastSyncedUserId();
```

### Debug Component

Add the debug component to any page for testing:

```svelte
<script>
  import UserSyncDebug from "$lib/components/user-sync-debug.svelte";
</script>

<UserSyncDebug />
```

## 🛡️ Uniqueness Guarantees

### Email Uniqueness
- Primary check: Look for existing user by email
- On collision: Update existing user with new Clerk ID
- Handles account deletion/recreation scenarios

### Clerk ID Uniqueness
- Primary check: Look for existing user by Clerk ID
- On match: Update user data (email, name, avatar)
- Handles data changes in Clerk

### Conflict Resolution
1. **Clerk ID match** → Update user data
2. **Email match (different Clerk ID)** → Update with new Clerk ID
3. **No matches** → Create new user

## 🔄 Sync Flow

### Sign In Flow
```
1. User signs in via Clerk
2. useClerk hook detects user change
3. setupSessionAssociation() called
4. userSyncService.handleAuthChange() triggered
5. User data extracted from Clerk
6. syncCurrentUser() mutation called
7. User created/updated in Convex
8. Session associated with user
9. Anonymous data migrated (if applicable)
```

### Sign Out Flow
```
1. User signs out via Clerk
2. useClerk hook detects null user
3. userSyncService.handleAuthChange(null) called
4. Sync state cleared
5. Session cleanup performed
```

## 🚨 Error Handling

### Retry Mechanisms
- **3 retries** for network failures
- **Exponential backoff** built into safe query wrapper
- **Graceful degradation** when sync fails

### Error Types
- **Authentication errors** → Wait for auth ready
- **Network errors** → Retry with backoff
- **Validation errors** → Log and report
- **Uniqueness conflicts** → Automatic resolution

### Error Recovery
- Errors are logged to console with detailed context
- Auth state store updated with error messages
- UI can display sync status and retry options
- Manual sync options available via debug component

## 🧪 Testing

### Manual Testing
1. Use the debug component (`<UserSyncDebug />`)
2. Sign in/out multiple times
3. Check browser console for detailed logs
4. Verify user creation in Convex dashboard

### Automated Testing
```typescript
// Test user sync service
import { userSyncService } from "$lib/services/user-sync";

// Mock user object
const mockUser = {
  id: "user_123",
  primaryEmailAddress: { emailAddress: "test@example.com" },
  fullName: "Test User",
  imageUrl: "https://example.com/avatar.jpg"
};

// Test sync
const result = await userSyncService.syncUser(mockUser);
expect(result.success).toBe(true);
```

## 📊 Monitoring

### Console Logs
- `[UserSync]` - User sync service operations
- `[Sync]` - General sync service operations
- `[Session]` - Session association events
- `[Auth]` - Authentication state changes

### Debug Information
- User sync progress
- Last synced user ID
- Authentication status
- Error logs and recovery

## 🔗 Integration Points

### Required Imports
```typescript
// In components that need user sync
import { userSyncService } from "$lib/services/user-sync";
import { useClerk } from "$lib/hooks/use-clerk";
```

### Store Integration
```typescript
// Sync store automatically initializes user sync
import { syncStore } from "$lib/stores/sync";
```

### Auth State Integration
```typescript
// Auth state includes user sync status
import { authState } from "$lib/stores/auth-state";
```

## 🔮 Future Enhancements

### Planned Features
- [ ] Bulk user sync for admin operations
- [ ] User profile picture sync optimization
- [ ] Advanced conflict resolution strategies
- [ ] Real-time user updates via webhooks
- [ ] User sync analytics and metrics

### Scalability Considerations
- User sync is designed for individual user operations
- Batch operations should use internal functions
- Consider rate limiting for high-volume scenarios
- Monitor Convex function usage and optimize as needed

## 📝 Code Examples

### Basic Integration
```svelte
<script>
  import { onMount } from "svelte";
  import { useClerk } from "$lib/hooks/use-clerk";

  const { setupSessionAssociation, initializeClerk } = useClerk();

  onMount(() => {
    initializeClerk();
    return setupSessionAssociation(); // Auto-cleanup on unmount
  });
</script>
```

### Advanced Usage with Error Handling
```typescript
import { userSyncService } from "$lib/services/user-sync";
import { authState } from "$lib/stores/auth-state";

// Listen for auth errors
authState.subscribe((state) => {
  if (state.error?.includes("sync")) {
    // Handle sync errors
    console.error("User sync error:", state.error);
    // Optionally retry or show user feedback
  }
});

// Manual retry
async function retryUserSync(user) {
  const result = await userSyncService.forceSyncCurrentUser(user);
  if (result.success) {
    authState.setError(null); // Clear error
  }
}
```

## 🎉 Success!

Your Convex/Clerk user sync is now fully implemented with:

- ✅ **Automatic user creation** on sign-in
- ✅ **Unique constraints** on email and Clerk ID
- ✅ **Conflict resolution** for edge cases
- ✅ **Error handling** and retry mechanisms
- ✅ **Debug tools** for testing and monitoring
- ✅ **Comprehensive logging** for troubleshooting

Users will be seamlessly synced between Clerk and Convex with no duplicate entries!