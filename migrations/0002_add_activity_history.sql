CREATE TABLE `activity_history` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`date` text NOT NULL,
	`timestamp` integer NOT NULL,
	`clientUpdatedAt` integer NOT NULL
);
