# Convex + Clerk Authentication Testing Guide

## 🚀 Quick Test Instructions

After applying the authentication fixes, follow these steps to test and verify the authentication flow:

### 1. Open Browser Developer Tools
- Press `F12` or right-click → "Inspect"
- Navigate to the **Console** tab

### 2. Run the Debug Function
In the console, type:
```javascript
debugConvexAuth()
```

This will display comprehensive authentication state information including:
- Environment status
- Convex client state
- Clerk authentication state
- Token retrieval test results

### 3. Expected Output (Success)
If authentication is working correctly, you should see:
```
[Convex] Debug Auth State
  Environment: { browser: true, online: true, offlineMode: false }
  Convex Client State: { clientExists: true, authReady: true, ... }
  Clerk State: { clerkLoaded: true, hasUser: true, hasSession: true, ... }
  waitForClerk() result: true
  waitForClerkUser() result: true
  Token retrieval result: SUCCESS
```

### 4. Test Sync Operations
If the debug shows success, test the sync functionality:
```javascript
// In the browser console
window.location.reload(); // Refresh to trigger sync
```

Watch the console for sync-related messages. You should see:
- `[Sync] Convex authentication is ready, proceeding with sync`
- `✅ Completions sync completed`

## 🔧 Troubleshooting Common Issues

### Issue: "Clerk not loaded"
**Symptoms:** `clerkLoaded: false` in debug output
**Solution:**
1. Ensure Clerk script is loaded in `app.html`
2. Check network tab for failed Clerk script loads
3. Verify `PUBLIC_CLERK_PUBLISHABLE_KEY` is set correctly

### Issue: "No user session"
**Symptoms:** `hasUser: false` or `hasSession: false`
**Solution:**
1. Sign out and sign back in
2. Clear browser storage and cookies
3. Check Clerk dashboard for user status

### Issue: "Token retrieval failed"
**Symptoms:** `Token retrieval result: FAILED`
**Solution:**
1. Verify `CLERK_JWT_ISSUER_DOMAIN` environment variable
2. Check Convex auth configuration in `auth.config.ts`
3. Ensure "convex" JWT template exists in Clerk dashboard

### Issue: "Authentication timeout"
**Symptoms:** Timeout waiting for Clerk/user session
**Solution:**
1. Increase timeout values if on slow network
2. Check browser network requests for failures
3. Verify no browser extensions blocking scripts

## 🛠️ Advanced Debugging

### Check Environment Variables
In console:
```javascript
console.log({
  convexUrl: import.meta.env.VITE_CONVEX_URL,
  clerkKey: import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY
});
```

### Manual Token Test
```javascript
// Test token retrieval manually
window.Clerk?.session?.getToken({ template: "convex" })
  .then(token => console.log("Manual token:", token ? "SUCCESS" : "FAILED"))
  .catch(err => console.error("Manual token error:", err));
```

### Check Clerk JWT Template
1. Go to Clerk Dashboard
2. Navigate to JWT Templates
3. Ensure "convex" template exists
4. Verify the issuer domain matches your environment variable

## 📋 Environment Checklist

Ensure these environment variables are set:
- [ ] `VITE_CONVEX_URL` - Your Convex deployment URL
- [ ] `PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- [ ] `CLERK_JWT_ISSUER_DOMAIN` - Clerk JWT issuer domain
- [ ] `CLERK_SECRET_KEY` - Clerk secret key (server-side only)

## 🎯 Success Criteria

Authentication is working correctly when:
1. ✅ `debugConvexAuth()` shows all green checkmarks
2. ✅ Sync operations complete without "authentication not ready" errors
3. ✅ No "Not authenticated" errors in console during app usage
4. ✅ Data syncing between local and Convex cloud works

## 🔄 If Issues Persist

1. **Clear all browser data** (cookies, localStorage, sessionStorage)
2. **Restart the development server**
3. **Check Convex and Clerk dashboards** for any service issues
4. **Verify network connectivity** and firewall settings
5. **Try in incognito mode** to rule out extension conflicts

## 📞 Getting Help

If authentication still fails after following this guide:
1. Run `debugConvexAuth()` and copy the full output
2. Check browser console for any error messages
3. Provide details about your environment (OS, browser, network)
4. Include relevant environment variable values (without secrets)