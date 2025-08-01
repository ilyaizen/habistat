import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";

/**
 * Creates a new user record or updates an existing one based on Clerk ID.
 * This is intended to be called internally, often triggered by a Clerk webhook.
 * Marked as internalMutation so it can be called from Convex HTTP actions/webhooks.
 */
export const createOrUpdate = internalMutation({
  // Define arguments using Convex validation
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  // The handler function that executes the mutation
  handler: async (ctx, args) => {
    // Attempt to find an existing user with the given email address
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      // If user exists, update their details, including the Clerk ID
      // This handles cases where a user links a new account (e.g., Google then GitHub)
      console.log(`Updating existing user for email: ${args.email}`);
      await ctx.db.patch(existingUser._id, {
        clerkId: args.clerkId, // Update the clerkId to the latest one
        name: args.name,
        avatarUrl: args.avatarUrl,
      });
      return existingUser._id; // Return the existing user's ID
    } else {
      // If user does not exist, create a new user record
      console.log(`Creating new user for email: ${args.email}`);
      const userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        avatarUrl: args.avatarUrl,
        subscriptionTier: "free", // Default to free tier on creation
      });
      return userId; // Return the new user's ID
    }
  },
});

// Placeholder for anonymous data migration mutation. Uncomment and use internalMutation if needed in the future.
// import { internalMutation } from "./_generated/server";
// export const migrateAnonymousData = internalMutation({
//   args: {
//     anonymousData: v.any()
//   },
//   handler: async (ctx: MutationCtx, args: { anonymousData: any }) => {
//     // ...implementation...
//   }
// });

/**
 * Query to fetch the current user's data, including subscription status.
 * Uses authentication context to identify the user.
 * Returns null if no user is found or not authenticated.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const clerkId = identity.subject;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    return user || null;
  },
});

/**
 * Internal mutation to update a user's subscription info (for Stripe webhooks).
 * Accepts subscriptionId, tier, and expiration timestamp.
 */
export const updateSubscription = internalMutation({
  args: {
    clerkId: v.string(),
    subscriptionId: v.optional(v.string()),
    subscriptionTier: v.optional(
      v.union(
        v.literal("free"),
        v.literal("premium_monthly"),
        v.literal("premium_lifetime")
      )
    ),
    subscriptionExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, {
      subscriptionId: args.subscriptionId,
      subscriptionTier: args.subscriptionTier,
      subscriptionExpiresAt: args.subscriptionExpiresAt,
    });
    return user._id;
  },
});

/**
 * Internal query to fetch all users.
 * This is intended for use in cleanup scripts or admin actions.
 */
export const getAllUsersForCleanup = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

/**
 * Internal mutation to delete a user by their ID.
 * This is intended for use in cleanup scripts or admin actions.
 */
export const deleteUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.delete(userId);
  },
});

// TODO: Add queries as needed, e.g., getUserById, getUserSettings, etc.
