CREATE TABLE `album_entries` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`content` text NOT NULL,
	`revision` integer NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
