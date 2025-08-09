import { v } from "convex/values";
import { internalMutation, internalQuery, query, mutation } from "./_generated/server";

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
  returns: v.id("users"),
  // The handler function that executes the mutation
  handler: async (ctx, args) => {
    // First check if user already exists by clerkId
    const existingUserByClerkId = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUserByClerkId) {
      // User exists with this clerkId, update their details
      console.log(`Updating existing user with clerkId: ${args.clerkId}`);
      await ctx.db.patch(existingUserByClerkId._id, {
        email: args.email, // Update email in case it changed in Clerk
        name: args.name,
        avatarUrl: args.avatarUrl,
      });
      return existingUserByClerkId._id;
    }

    // Check if another user exists with the same email but different clerkId
    const existingUserByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUserByEmail) {
      // Email collision - this could happen if user deletes and recreates account
      // Update the existing user with the new clerkId
      console.log(`Email collision detected. Updating user ${existingUserByEmail._id} with new clerkId: ${args.clerkId}`);
      await ctx.db.patch(existingUserByEmail._id, {
        clerkId: args.clerkId,
        name: args.name,
        avatarUrl: args.avatarUrl,
      });
      return existingUserByEmail._id;
    }

    // No existing user found, create a new one
    console.log(`Creating new user for clerkId: ${args.clerkId}, email: ${args.email}`);
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      subscriptionTier: "free", // Default to free tier on creation
    });
    return userId;
  },
});

/**
 * Public mutation: Set the user's firstAppOpenAt timestamp if missing.
 * - Requires authentication.
 * - Finds the user by Clerk ID and only sets the field if it's currently unset.
 * - Returns true if updated, false if already set or user not found.
 */
export const setFirstAppOpenAtIfMissing = mutation({
  args: {
    // Optional client-supplied timestamp; when omitted we use Date.now() on server
    timestamp: v.optional(v.number())
  },
  returns: v.boolean(),
  handler: async (ctx, { timestamp }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkId = identity.subject;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) {
      // User record should exist (created via syncCurrentUser / webhooks). No-op if missing.
      return false;
    }

    if (user.firstAppOpenAt && user.firstAppOpenAt > 0) {
      // Already set; do not overwrite
      return false;
    }

    await ctx.db.patch(user._id, {
      firstAppOpenAt: timestamp ?? Date.now()
    });
    return true;
  }
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
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      clerkId: v.string(),
      email: v.string(),
      name: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      subscriptionId: v.optional(v.string()),
      subscriptionTier: v.optional(
        v.union(
          v.literal("free"),
          v.literal("premium_monthly"),
          v.literal("premium_lifetime")
        )
      ),
      subscriptionExpiresAt: v.optional(v.number()),
      firstAppOpenAt: v.optional(v.number()), // Added missing field from Phase 3.8
    }),
    v.null()
  ),
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
  returns: v.id("users"),
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
 * Public mutation for client-side user synchronization.
 * Creates or updates the current authenticated user in the database.
 * This should be called whenever a user signs in to ensure they exist in Convex.
 */
export const syncCurrentUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    // Get the authenticated user's identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkId = identity.subject;

    // Use the same logic as createOrUpdate but for public access
    // First check if user already exists by clerkId
    const existingUserByClerkId = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (existingUserByClerkId) {
      // User exists with this clerkId, update their details
      console.log(`Syncing existing user with clerkId: ${clerkId}`);
      await ctx.db.patch(existingUserByClerkId._id, {
        email: args.email, // Update email in case it changed in Clerk
        name: args.name,
        avatarUrl: args.avatarUrl,
      });
      return existingUserByClerkId._id;
    }

    // Check if another user exists with the same email but different clerkId
    const existingUserByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUserByEmail) {
      // Email collision - update the existing user with the new clerkId
      console.log(`Email collision during sync. Updating user ${existingUserByEmail._id} with new clerkId: ${clerkId}`);
      await ctx.db.patch(existingUserByEmail._id, {
        clerkId: clerkId,
        name: args.name,
        avatarUrl: args.avatarUrl,
      });
      return existingUserByEmail._id;
    }

    // No existing user found, create a new one
    console.log(`Creating new user during sync for clerkId: ${clerkId}, email: ${args.email}`);
    const userId = await ctx.db.insert("users", {
      clerkId: clerkId,
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      subscriptionTier: "free", // Default to free tier on creation
    });
    return userId;
  },
});

/**
 * Internal query to fetch all users.
 * This is intended for use in cleanup scripts or admin actions.
 */
export const getAllUsersForCleanup = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      clerkId: v.string(),
      email: v.string(),
      name: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      subscriptionId: v.optional(v.string()),
      subscriptionTier: v.optional(
        v.union(
          v.literal("free"),
          v.literal("premium_monthly"),
          v.literal("premium_lifetime")
        )
      ),
      subscriptionExpiresAt: v.optional(v.number()),
    })
  ),
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
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    await ctx.db.delete(userId);
    return null;
  },
});

/**
 * Internal mutation to delete a user by their Clerk ID.
 * This is intended for use in Clerk webhooks when a user is deleted.
 */
export const deleteUserByClerkId = internalMutation({
  args: { clerkId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (user) {
      console.log(`Deleting user with Clerk ID: ${clerkId}`);
      await ctx.db.delete(user._id);
      return true;
    } else {
      console.warn(`User with Clerk ID ${clerkId} not found for deletion`);
      return false;
    }
  },
});

// TODO: Add queries as needed, e.g., getUserById, getUserSettings, etc.
