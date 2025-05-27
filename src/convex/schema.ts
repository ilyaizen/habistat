import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Define the 'users' table
  users: defineTable({
    // Clerk User ID, used to link Convex user to Clerk authentication
    clerkId: v.string(),
    // User's email address
    email: v.string(),
    // User's name (optional)
    name: v.optional(v.string()),
    // URL for the user's avatar image (optional)
    avatarUrl: v.optional(v.string())
    // TODO: Add any other Habistat-specific user fields here (e.g., settings, preferences)
  })
    // Create an index on the 'clerkId' field for efficient lookups
    .index("by_clerk_id", ["clerkId"])

  // TODO: Add other tables as needed (e.g., calendars, habits, completions)
  // calendars: defineTable({...}).index("by_user", ["userId"]),
  // habits: defineTable({...}).index("by_calendar", ["calendarId"]).index("by_user", ["userId"]),
  // completions: defineTable({...}).index("by_habit", ["habitId"]).index("by_user_and_date", ["userId", "completedAt"]),
});
