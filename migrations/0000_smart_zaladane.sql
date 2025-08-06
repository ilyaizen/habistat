CREATE TABLE `activeTimers` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`habitId` text NOT NULL,
	`startTime` integer NOT NULL,
	`pausedTime` integer,
	`totalPausedDurationSeconds` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `activity_history` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`date` text NOT NULL,
	`timestamp` integer NOT NULL,
	`clientUpdatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `appOpens` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendars` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`name` text NOT NULL,
	`colorTheme` text NOT NULL,
	`position` integer NOT NULL,
	`isEnabled` integer DEFAULT 1 NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `completions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`habitId` text NOT NULL,
	`completedAt` integer NOT NULL,
	`clientUpdatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`convexId` text,
	`userId` text,
	`calendarId` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`timerEnabled` integer DEFAULT 0 NOT NULL,
	`targetDurationSeconds` integer,
	`pointsValue` integer DEFAULT 0,
	`position` integer NOT NULL,
	`isEnabled` integer DEFAULT 1 NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `syncMetadata` (
	`id` text PRIMARY KEY NOT NULL,
	`lastSyncTimestamp` integer DEFAULT 0 NOT NULL
);
