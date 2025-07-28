# Clerk + Convex Authentication Setup Guide

This guide explains how to properly set up Clerk authentication with Convex for the Habistat project.

## Issues Addressed

- ❌ "Not authenticated" errors in Convex functions
- ❌ Missing `localUuid` field in sync operations
- ❌ "No auth provider found matching the given token" errors
- ❌ "Publishable key is missing" errors in server-side authentication

## Prerequisites

1. Clerk account and application already created
2. Convex deployment already configured
3. `CLERK_WEBHOOK_SECRET` already set in Convex environment variables

## Step 1: Set Up Local Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# Clerk Authentication - Get these from your Clerk Dashboard
CLERK_SECRET_KEY=sk_test_your_actual_secret_key_here
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here

# Convex Configuration - Get this from your Convex Dashboard
VITE_CONVEX_URL=https://your-deployment.convex.cloud
PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Development
NODE_ENV=development
```

**Important**: Replace the placeholder values with your actual keys:
- Get `CLERK_SECRET_KEY` and `PUBLIC_CLERK_PUBLISHABLE_KEY` from your Clerk Dashboard → API Keys
- Get `VITE_CONVEX_URL` from your Convex Dashboard → Settings → URL

## Step 2: Create JWT Template in Clerk Dashboard

1. **Navigate to Clerk Dashboard**: Go to your Clerk application dashboard
2. **Go to JWT Templates**: In the sidebar, click on "JWT Templates"
3. **Create New Template**: Click "New template"
4. **Select Convex**: From the list of templates, select "Convex"
5. **IMPORTANT**: Do NOT rename the template - it must be called `convex`
6. **Copy Issuer URL**: Copy the "Issuer" URL (it will look like `https://verb-noun-12.clerk.accounts.dev`)

## Step 3: Set Environment Variable in Convex

Run this command to set the Clerk issuer domain in your Convex deployment:

```bash
bunx convex env set CLERK_JWT_ISSUER_DOMAIN "https://your-clerk-issuer-domain.clerk.accounts.dev"
```

Replace `https://your-clerk-issuer-domain.clerk.accounts.dev` with the actual Issuer URL you copied from step 2.

## Step 4: Update Auth Configuration

The `convex/auth.config.ts` file should already be configured correctly:

```typescript
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex"
    }
  ]
};
```

## Step 5: Deploy Configuration

Deploy the updated configuration:

```bash
bunx convex dev
```

## Step 6: Verify Setup

1. **Check Environment Variables**: Ensure all variables are set correctly in your `.env` file
2. **Check Convex Dashboard**: Go to Settings > Authentication in your Convex dashboard
3. **Verify Provider**: You should see your Clerk domain listed with Application ID "convex"
4. **Test Authentication**: Try logging in to your application

## Troubleshooting

### "Publishable key is missing" Error

This error occurs when the server-side Clerk client doesn't have both keys configured:
- Ensure `CLERK_SECRET_KEY` is set in your `.env` file
- Ensure `PUBLIC_CLERK_PUBLISHABLE_KEY` is set in your `.env` file
- Restart your development server after adding environment variables

### "No auth provider found matching the given token"

This usually means:
- JWT template wasn't created properly in Clerk
- `CLERK_JWT_ISSUER_DOMAIN` doesn't match the Clerk issuer URL
- The JWT template isn't named "convex"

### "Not authenticated" in Convex functions

This usually means:
- The JWT token doesn't have the correct audience (`aud: "convex"`)
- The token isn't being passed to Convex properly
- The auth configuration doesn't match the token issuer

### Debug Steps

1. **Check Token**: Use jwt.io to decode the JWT token and verify:
   - `iss` field matches your `CLERK_JWT_ISSUER_DOMAIN`
   - `aud` field is "convex"
   - Token is valid and not expired

2. **Check Browser Network**: In developer tools, look for:
   - WebSocket messages with `type: "Authenticate"`
   - The token should be in the `value` field

3. **Check Convex Logs**: Add `console.log("auth identity:", await ctx.auth.getUserIdentity())` to your functions

4. **Check Server Logs**: Look in your terminal for authentication error messages from `hooks.server.ts`

## Expected Outcome

After completing these steps:
- ✅ Clerk authentication will work properly
- ✅ Server-side authentication will have both required keys
- ✅ Convex functions will receive authenticated user identity
- ✅ Sync operations will work without authentication errors
- ✅ `localUuid` mapping fix will allow proper completion syncing
