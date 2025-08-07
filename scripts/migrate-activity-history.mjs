#!/usr/bin/env node

/**
 * Migration script to convert firstOpenAt to openedAt in activity history
 * This handles the schema field name change in production data
 */

import { ConvexHttpClient } from "convex/browser";

// Use production URL
const client = new ConvexHttpClient("https://steady-goldfish-513.convex.cloud");

async function migrateActivityHistory() {
  console.log("🔄 Starting activity history field migration...");
  
  try {
    // Note: This requires authentication, so it should be run by an authenticated user
    // You'll need to run this from the browser console or with proper auth setup
    const result = await client.mutation("activityHistory:migrateActivityHistoryFields", {});
    
    console.log(`✅ Migration completed successfully!`);
    console.log(`📊 Migrated ${result.migratedCount} records out of ${result.totalRecords} total`);
    
    if (result.migratedCount === 0) {
      console.log("ℹ️  No records needed migration - all data is already using openedAt field");
    }
    
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    
    if (error.message.includes("Not authenticated")) {
      console.log("\n💡 This migration requires authentication.");
      console.log("Please run this from the browser console while logged in:");
      console.log(`
// Copy and paste this in your browser console:
const client = new ConvexHttpClient("https://steady-goldfish-513.convex.cloud");
client.mutation("activityHistory:migrateActivityHistoryFields", {})
  .then(result => console.log("Migration result:", result))
  .catch(err => console.error("Migration error:", err));
      `);
    }
  }
}

// Run the migration
migrateActivityHistory();
