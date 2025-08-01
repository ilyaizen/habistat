import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const deduplicateUsers = internalAction({
  handler: async (ctx) => {
    console.log("Starting user deduplication process...");

    // 1. Get all users from the database
    const allUsers = await ctx.runQuery(internal.users.getAllUsersForCleanup);

    // 2. Group users by email
    const usersByEmail = new Map<string, (typeof allUsers)[number][]>();
    for (const user of allUsers) {
      if (!usersByEmail.has(user.email)) {
        usersByEmail.set(user.email, []);
      }
      usersByEmail.get(user.email)!.push(user);
    }

    console.log(
      `Found ${allUsers.length} total users, grouped into ${usersByEmail.size} unique emails.`
    );

    let duplicatesFound = 0;
    let recordsDeleted = 0;

    // 3. Iterate through each group and handle duplicates
    for (const [email, users] of usersByEmail.entries()) {
      if (users.length <= 1) {
        continue; // No duplicates for this email
      }

      duplicatesFound++;
      console.log(`Found ${users.length} duplicates for email: ${email}`);

      // Sort users to find the one to keep (e.g., the oldest one)
      users.sort((a, b) => a._creationTime - b._creationTime);
      const canonicalUser = users[0];
      const usersToDelete = users.slice(1);

      console.log(
        `Keeping user ${canonicalUser._id} (created at ${new Date(canonicalUser._creationTime).toISOString()}).`
      );

      // 4. Delete the redundant user records
      for (const userToDelete of usersToDelete) {
        console.log(`Deleting redundant user record ${userToDelete._id}.`);
        await ctx.runMutation(internal.users.deleteUser, {
          userId: userToDelete._id,
        });
        recordsDeleted++;
      }
    }

    const summary = `Deduplication complete. Found duplicates for ${duplicatesFound} emails. Deleted ${recordsDeleted} redundant user records.`;
    console.log(summary);
    return summary;
  },
});
