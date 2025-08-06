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
CREATE TABLE `activityHistory` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`localUuid` text NOT NULL,
	`date` text NOT NULL,
	`openedAt` integer NOT NULL,
	`clientUpdatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activityHistory_localUuid_unique` ON `activityHistory` (`localUuid`);--> statement-breakpoint
CREATE TABLE `calendars` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`localUuid` text NOT NULL,
	`name` text NOT NULL,
	`colorTheme` text NOT NULL,
	`position` integer NOT NULL,
	`isEnabled` integer DEFAULT 1 NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendars_localUuid_unique` ON `calendars` (`localUuid`);--> statement-breakpoint
CREATE TABLE `completions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`habitId` text NOT NULL,
	`completedAt` integer NOT NULL,
	`clientUpdatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`localUuid` text NOT NULL,
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
CREATE UNIQUE INDEX `habits_localUuid_unique` ON `habits` (`localUuid`);--> statement-breakpoint
CREATE TABLE `syncMetadata` (
	`id` text PRIMARY KEY NOT NULL,
	`lastSyncTimestamp` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `userProfile` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`firstAppOpenAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
