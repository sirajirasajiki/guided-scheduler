CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`admin_token` text NOT NULL,
	`share_token` text NOT NULL,
	`candidate_dates` text NOT NULL,
	`confirmed_date` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_admin_token_unique` ON `events` (`admin_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `events_share_token_unique` ON `events` (`share_token`);--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`responses` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
