CREATE TABLE `admins` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admins_username_idx` ON `admins` (`username`);--> statement-breakpoint
CREATE TABLE `game_play_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`user_ip` text DEFAULT '' NOT NULL,
	`user_agent` text DEFAULT '' NOT NULL,
	`played_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `play_logs_game_idx` ON `game_play_logs` (`game_id`);--> statement-breakpoint
CREATE INDEX `play_logs_played_at_idx` ON `game_play_logs` (`played_at`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`cover_image` text DEFAULT '' NOT NULL,
	`screenshots` text DEFAULT '[]' NOT NULL,
	`entry_file` text DEFAULT 'index.html' NOT NULL,
	`oss_prefix` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`play_count` integer DEFAULT 0 NOT NULL,
	`locale` text DEFAULT '{"en":{"title":"","description":""},"zh":{"title":"","description":""}}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_slug_idx` ON `games` (`slug`);--> statement-breakpoint
CREATE INDEX `games_status_idx` ON `games` (`status`);--> statement-breakpoint
CREATE INDEX `games_category_idx` ON `games` (`category`);