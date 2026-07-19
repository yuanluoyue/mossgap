CREATE TABLE `inventory_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`item_id` text NOT NULL,
	`change` integer NOT NULL,
	`balance_after` integer NOT NULL,
	`reason` text,
	`biz_type` text,
	`biz_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `item_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `inventory_logs_user_id_idx` ON `inventory_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `inventory_logs_item_id_idx` ON `inventory_logs` (`item_id`);--> statement-breakpoint
CREATE INDEX `inventory_logs_biz_idx` ON `inventory_logs` (`biz_type`,`biz_id`);--> statement-breakpoint
CREATE INDEX `inventory_logs_created_at_idx` ON `inventory_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `item_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`type` text DEFAULT 'consumable' NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`icon` text,
	`rarity` text DEFAULT 'common',
	`stackable` integer DEFAULT 0,
	`max_stack` integer DEFAULT 0,
	`enabled` integer DEFAULT 1,
	`sort_order` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `item_templates_code_idx` ON `item_templates` (`code`);--> statement-breakpoint
CREATE INDEX `item_templates_type_idx` ON `item_templates` (`type`);--> statement-breakpoint
CREATE INDEX `item_templates_enabled_idx` ON `item_templates` (`enabled`);--> statement-breakpoint
CREATE INDEX `item_templates_sort_idx` ON `item_templates` (`sort_order`);--> statement-breakpoint
CREATE TABLE `user_inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`item_id` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `item_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_inventory_user_item_idx` ON `user_inventory` (`user_id`,`item_id`);--> statement-breakpoint
CREATE INDEX `user_inventory_user_id_idx` ON `user_inventory` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_inventory_item_id_idx` ON `user_inventory` (`item_id`);