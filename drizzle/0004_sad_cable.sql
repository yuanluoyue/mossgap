ALTER TABLE `games` ADD `uploader_id` text;--> statement-breakpoint
CREATE INDEX `games_uploader_id_idx` ON `games` (`uploader_id`);