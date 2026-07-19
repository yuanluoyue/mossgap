CREATE TABLE `point_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `point_accounts_user_id_idx` ON `point_accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `point_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`change` integer NOT NULL,
	`balance_after` integer NOT NULL,
	`type` text NOT NULL,
	`biz_type` text,
	`biz_id` text,
	`remark` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `point_logs_user_id_idx` ON `point_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `point_logs_biz_idx` ON `point_logs` (`biz_type`,`biz_id`);--> statement-breakpoint
CREATE INDEX `point_logs_created_at_idx` ON `point_logs` (`created_at`);