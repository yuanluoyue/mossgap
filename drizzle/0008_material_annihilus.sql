DROP INDEX `games_category_idx`;--> statement-breakpoint
ALTER TABLE `games` DROP COLUMN `category`;--> statement-breakpoint
ALTER TABLE `games` DROP COLUMN `play_count`;--> statement-breakpoint
ALTER TABLE `games` DROP COLUMN `how_to_play`;--> statement-breakpoint
ALTER TABLE `games` DROP COLUMN `related_game_ids`;--> statement-breakpoint
ALTER TABLE `games` DROP COLUMN `featured`;