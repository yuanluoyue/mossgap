CREATE TABLE `admin_operation_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`target_type` text DEFAULT 'game' NOT NULL,
	`target_id` text DEFAULT '' NOT NULL,
	`meta` text DEFAULT '{}' NOT NULL,
	`operator_ip` text DEFAULT '' NOT NULL,
	`operator_useragent` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `op_logs_action_idx` ON `admin_operation_logs` (`action`);--> statement-breakpoint
CREATE INDEX `op_logs_target_idx` ON `admin_operation_logs` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `op_logs_created_idx` ON `admin_operation_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `game_likes` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`user_ip` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `likes_game_idx` ON `game_likes` (`game_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `likes_game_ip_idx` ON `game_likes` (`game_id`,`user_ip`);--> statement-breakpoint
CREATE TABLE `game_dislikes` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`user_ip` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dislikes_game_idx` ON `game_dislikes` (`game_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `dislikes_game_ip_idx` ON `game_dislikes` (`game_id`,`user_ip`);--> statement-breakpoint
ALTER TABLE `games` ADD `source_type` text DEFAULT 'zip';--> statement-breakpoint
ALTER TABLE `games` ADD `iframe_url` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `games` ADD `how_to_play` text DEFAULT '{"en":"","zh":""}';--> statement-breakpoint
ALTER TABLE `games` ADD `related_game_ids` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `games` ADD `oss_size` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `games` ADD `like_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `games` ADD `dislike_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `games` ADD `featured` integer DEFAULT 0;--> statement-breakpoint
CREATE TABLE `feedbacks` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'platform' NOT NULL,
	`game_id` text DEFAULT '',
	`contact` text DEFAULT '',
	`content` text NOT NULL,
	`user_ip` text DEFAULT '' NOT NULL,
	`user_agent` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `feedbacks_type_idx` ON `feedbacks` (`type`);--> statement-breakpoint
CREATE INDEX `feedbacks_status_idx` ON `feedbacks` (`status`);--> statement-breakpoint
CREATE INDEX `feedbacks_game_idx` ON `feedbacks` (`game_id`);--> statement-breakpoint
CREATE INDEX `feedbacks_created_idx` ON `feedbacks` (`created_at`);
