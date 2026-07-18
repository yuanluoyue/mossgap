ALTER TABLE `games` ADD `badge` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `games` ADD `weight` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `games` ADD `published_at` integer;--> statement-breakpoint
CREATE INDEX `games_weight_idx` ON `games` (`weight`);--> statement-breakpoint
CREATE INDEX `games_published_at_idx` ON `games` (`published_at`);