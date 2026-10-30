CREATE TABLE `playtest_events` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`received_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `playtest_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `playtest_session_events` ON `playtest_events` (`session_id`,`received_at`);--> statement-breakpoint
CREATE TABLE `playtest_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`alias` text NOT NULL,
	`token_hash` text NOT NULL,
	`consent_version` text NOT NULL,
	`ip_consent` integer NOT NULL,
	`ip_address` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `playtest_token` ON `playtest_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `playtest_expiry` ON `playtest_sessions` (`expires_at`);