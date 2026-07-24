CREATE TABLE `breed_market_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`animal_id` text NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`description` text,
	`expired_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `breed_market_orders_owner_id_idx` ON `breed_market_orders` (`owner_id`);--> statement-breakpoint
CREATE INDEX `breed_market_orders_animal_id_idx` ON `breed_market_orders` (`animal_id`);--> statement-breakpoint
CREATE INDEX `breed_market_orders_status_idx` ON `breed_market_orders` (`status`);