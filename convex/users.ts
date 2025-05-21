import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Creates a new user record or updates an existing one based on Clerk ID.
 * This is intended to be called internally, often triggered by a Clerk webhook.
 */
export const createOrUpdate = mutation({
  // Define arguments using Convex validation
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string())
  },
  // The handler function that executes the mutation
  handler: async (ctx, args) => {
    // Attempt to find an existing user with the given Clerk ID
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique(); // Expect at most one user

    if (existingUser) {
      // If user exists, update their details
      console.log(`Updating existing user for Clerk ID: ${args.clerkId}`);
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        avatarUrl: args.avatarUrl
        // TODO: Add logic to update other fields if necessary
      });
      return existingUser._id; // Return the existing user's ID
    } else {
      // If user does not exist, create a new user record
      console.log(`Creating new user for Clerk ID: ${args.clerkId}`);
      const userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        avatarUrl: args.avatarUrl
        // TODO: Set default values for other Habistat-specific fields
      });
      return userId; // Return the new user's ID
    }
  }
});

/**
 * Placeholder mutation for migrating anonymous data.
 * This needs to be implemented based on the specific data structures.
 */
export const migrateAnonymousData = mutation({
  args: {
    // anonymousData: v.object({ /* ... define expected structure ... */ }),
    anonymousData: v.any() // Use v.any() for now, refine later
  },
  handler: async (ctx, args) => {
    // IMPORTANT: This mutation requires the user to be authenticated.
    // Get the user identity from the context.
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("User must be authenticated to migrate data.");
    }

    const userId = identity.subject; // Clerk User ID
    console.log(`Migrating anonymous data for user: ${userId}`);
    console.log("Received data:", args.anonymousData);

    // TODO: Implement the logic to merge args.anonymousData with the user's existing data.
    // This might involve fetching the user's current data, applying merge rules,
    // and patching the user record or related records (habits, etc.).
    console.warn("Anonymous data migration logic not implemented in Convex mutation.");

    // Example: Fetch user, merge, patch
    // const user = await ctx.db.query('users').withIndex('by_clerk_id', q => q.eq('clerkId', userId)).unique();
    // if (user) {
    //   const mergedData = { /* ... merge logic ... */ };
    //   await ctx.db.patch(user._id, mergedData);
    // }

    return { success: true }; // Indicate success (even if placeholder)
  }
});

// TODO: Add queries as needed, e.g., getUserById, getUserSettings, etc.
