CREATE TABLE `visitor_daily_limits` (
	`day` integer PRIMARY KEY NOT NULL,
	`sessions` integer NOT NULL,
	`events` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `visitor_events` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`received_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `visitor_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `visitor_events_session` ON `visitor_events` (`session_id`,`received_at`);--> statement-breakpoint
CREATE TABLE `visitor_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`label` text,
	`device` text NOT NULL,
	`language` text,
	`referrer` text,
	`country` text,
	`region` text,
	`city` text,
	`timezone` text,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `visitor_sessions_visitor` ON `visitor_sessions` (`visitor_id`);--> statement-breakpoint
CREATE INDEX `visitor_sessions_seen` ON `visitor_sessions` (`last_seen_at`);