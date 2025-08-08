import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Define cron jobs for server maintenance tasks.
const crons = cronJobs();

// Phase 3.7: Periodically dedupe activityHistory across all users.
// Runs every 6 hours. Safe to re-run; operation is idempotent with LWW rules.
crons.interval(
  "activityHistory dedupe",
  { hours: 6 },
  internal.maintenance.dedupeAllActivityHistory,
  {}
);

export default crons;


