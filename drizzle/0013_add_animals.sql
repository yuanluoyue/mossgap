CREATE TABLE `animals` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`species_id` text NOT NULL,
	`genome` text NOT NULL,
	`generation` integer DEFAULT 1 NOT NULL,
	`father_id` text,
	`mother_id` text,
	`breed_count` integer DEFAULT 0 NOT NULL,
	`cooldown_at` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `animals_owner_id_idx` ON `animals` (`owner_id`);--> statement-breakpoint
CREATE INDEX `animals_species_id_idx` ON `animals` (`species_id`);--> statement-breakpoint
CREATE INDEX `animals_generation_idx` ON `animals` (`generation`);--> statement-breakpoint
CREATE INDEX `animals_status_idx` ON `animals` (`status`);