CREATE TABLE `restaurant_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`restaurant_id` text NOT NULL,
	`participant_name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE no action
);
