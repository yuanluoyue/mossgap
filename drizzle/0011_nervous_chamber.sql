CREATE TABLE `missions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`type` text NOT NULL,
	`event` text,
	`target` integer DEFAULT 1 NOT NULL,
	`reward_type` text DEFAULT 'point' NOT NULL,
	`reward_value` integer DEFAULT 0 NOT NULL,
	`icon` text,
	`sort_order` integer DEFAULT 0,
	`enabled` integer DEFAULT 1,
	`start_at` integer,
	`end_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `missions_type_idx` ON `missions` (`type`);--> statement-breakpoint
CREATE INDEX `missions_event_idx` ON `missions` (`event`);--> statement-breakpoint
CREATE INDEX `missions_enabled_idx` ON `missions` (`enabled`);--> statement-breakpoint
CREATE INDEX `missions_sort_idx` ON `missions` (`sort_order`);--> statement-breakpoint
CREATE TABLE `user_missions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mission_id` text NOT NULL,
	`cycle_key` text DEFAULT '' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`claimed_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mission_id`) REFERENCES `missions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_missions_user_mission_cycle_idx` ON `user_missions` (`user_id`,`mission_id`,`cycle_key`);--> statement-breakpoint
CREATE INDEX `user_missions_user_id_idx` ON `user_missions` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_missions_mission_id_idx` ON `user_missions` (`mission_id`);--> statement-breakpoint
CREATE INDEX `user_missions_status_idx` ON `user_missions` (`status`);--> statement-breakpoint
CREATE INDEX `user_missions_updated_at_idx` ON `user_missions` (`updated_at`);