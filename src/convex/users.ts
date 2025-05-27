import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

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

// TODO: Add queries as needed, e.g., getUserById, getUserSettings, etc.
