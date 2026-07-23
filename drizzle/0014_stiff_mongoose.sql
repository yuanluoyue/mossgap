CREATE TABLE `eggs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`father_id` text NOT NULL,
	`mother_id` text NOT NULL,
	`generation` integer DEFAULT 2 NOT NULL,
	`genome` text NOT NULL,
	`status` text DEFAULT 'INCUBATING' NOT NULL,
	`start_at` integer NOT NULL,
	`finish_at` integer NOT NULL,
	`created_pet_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `eggs_owner_id_idx` ON `eggs` (`owner_id`);--> statement-breakpoint
CREATE INDEX `eggs_status_idx` ON `eggs` (`status`);--> statement-breakpoint
CREATE INDEX `eggs_father_id_idx` ON `eggs` (`father_id`);--> statement-breakpoint
CREATE INDEX `eggs_mother_id_idx` ON `eggs` (`mother_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_animals` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`species_id` text NOT NULL,
	`genome` text NOT NULL,
	`generation` integer DEFAULT 1 NOT NULL,
	`father_id` text,
	`mother_id` text,
	`breed_count` integer DEFAULT 0 NOT NULL,
	`cooldown_at` integer,
	`status` text DEFAULT 'NORMAL' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_animals`("id", "owner_id", "species_id", "genome", "generation", "father_id", "mother_id", "breed_count", "cooldown_at", "status", "created_at", "updated_at") SELECT "id", "owner_id", "species_id", "genome", "generation", "father_id", "mother_id", "breed_count", "cooldown_at", "status", "created_at", "updated_at" FROM `animals`;--> statement-breakpoint
DROP TABLE `animals`;--> statement-breakpoint
ALTER TABLE `__new_animals` RENAME TO `animals`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `animals_owner_id_idx` ON `animals` (`owner_id`);--> statement-breakpoint
CREATE INDEX `animals_species_id_idx` ON `animals` (`species_id`);--> statement-breakpoint
CREATE INDEX `animals_generation_idx` ON `animals` (`generation`);--> statement-breakpoint
CREATE INDEX `animals_status_idx` ON `animals` (`status`);