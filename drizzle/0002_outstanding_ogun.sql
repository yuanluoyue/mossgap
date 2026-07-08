CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text DEFAULT '',
	`remark` text DEFAULT '',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_idx` ON `settings` (`key`);--> statement-breakpoint
CREATE TABLE `sys_menus` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`name` text NOT NULL,
	`path` text,
	`icon` text,
	`sort_order` integer DEFAULT 0,
	`is_visible` integer DEFAULT 1,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sys_menus_parent_idx` ON `sys_menus` (`parent_id`);--> statement-breakpoint
CREATE TABLE `sys_role_menus` (
	`role_id` text NOT NULL,
	`menu_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`role_id`, `menu_id`),
	FOREIGN KEY (`role_id`) REFERENCES `sys_roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`menu_id`) REFERENCES `sys_menus`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sys_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text DEFAULT '',
	`sort_order` integer DEFAULT 0,
	`is_active` integer DEFAULT 1,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sys_roles_code_idx` ON `sys_roles` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `sys_roles_name_idx` ON `sys_roles` (`name`);--> statement-breakpoint
CREATE TABLE `sys_user_roles` (
	`admin_id` text NOT NULL,
	`role_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`admin_id`, `role_id`),
	FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `sys_roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `admin_operation_logs` ADD `operator_id` text;--> statement-breakpoint
ALTER TABLE `admin_operation_logs` ADD `operator_username` text;--> statement-breakpoint
ALTER TABLE `admin_operation_logs` ADD `resource` text;--> statement-breakpoint
CREATE INDEX `op_logs_resource_idx` ON `admin_operation_logs` (`resource`);--> statement-breakpoint
CREATE INDEX `op_logs_operator_idx` ON `admin_operation_logs` (`operator_id`);--> statement-breakpoint
ALTER TABLE `admins` ADD `email` text;--> statement-breakpoint
ALTER TABLE `admins` ADD `name` text;--> statement-breakpoint
ALTER TABLE `admins` ADD `avatar` text;--> statement-breakpoint
ALTER TABLE `admins` ADD `is_active` integer DEFAULT 1;