CREATE TABLE `game_contents` (
	`id` text NOT NULL,
	`game_id` text NOT NULL,
	`locale` text NOT NULL,
	`summary` text DEFAULT '',
	`how_to_play` text DEFAULT '',
	`tips` text DEFAULT '',
	`controls` text DEFAULT '',
	`faq` text DEFAULT '[]',
	`seo_title` text DEFAULT '',
	`seo_description` text DEFAULT '',
	`keywords` text DEFAULT '',
	`canonical` text DEFAULT '',
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`game_id`, `locale`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `game_contents_game_id_idx` ON `game_contents` (`game_id`);