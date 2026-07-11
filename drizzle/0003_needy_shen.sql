CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`locale` text DEFAULT '{"en":{"name":"","description":"","seoTitle":"","seoDescription":""},"zh":{"name":"","description":"","seoTitle":"","seoDescription":""}}',
	`icon` text DEFAULT '',
	`cover_image` text DEFAULT '',
	`color` text DEFAULT '',
	`sort_order` integer DEFAULT 0,
	`is_visible` integer DEFAULT 1,
	`game_count` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_idx` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `categories_sort_idx` ON `categories` (`sort_order`);--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`locale` text DEFAULT '{"en":{"name":"","description":"","seoTitle":"","seoDescription":""},"zh":{"name":"","description":"","seoTitle":"","seoDescription":""}}',
	`icon` text DEFAULT '',
	`cover_image` text DEFAULT '',
	`layout` text DEFAULT 'grid',
	`sort_order` integer DEFAULT 0,
	`is_visible` integer DEFAULT 1,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collections_slug_idx` ON `collections` (`slug`);--> statement-breakpoint
CREATE INDEX `collections_sort_idx` ON `collections` (`sort_order`);--> statement-breakpoint
CREATE TABLE `game_collections` (
	`game_id` text NOT NULL,
	`collection_id` text NOT NULL,
	`sort_order` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`game_id`, `collection_id`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `game_collections_collection_idx` ON `game_collections` (`collection_id`);--> statement-breakpoint
CREATE TABLE `game_tags` (
	`game_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`game_id`, `tag_id`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `game_tags_tag_idx` ON `game_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`locale` text DEFAULT '{"en":{"name":"","description":"","seoTitle":"","seoDescription":""},"zh":{"name":"","description":"","seoTitle":"","seoDescription":""}}',
	`icon` text DEFAULT '',
	`color` text DEFAULT '',
	`sort_order` integer DEFAULT 0,
	`is_visible` integer DEFAULT 1,
	`game_count` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_idx` ON `tags` (`slug`);--> statement-breakpoint
CREATE INDEX `tags_sort_idx` ON `tags` (`sort_order`);--> statement-breakpoint
ALTER TABLE `games` ADD `category_id` text;--> statement-breakpoint
CREATE INDEX `games_category_id_idx` ON `games` (`category_id`);