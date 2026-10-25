CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'expense' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_categories_type_name` ON `categories` (`type`,`name`);--> statement-breakpoint
CREATE TABLE `monthly_budgets` (
	`year_month` text PRIMARY KEY NOT NULL,
	`budget` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recurring_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`remaining_amount` real,
	`cadence` text DEFAULT 'monthly' NOT NULL,
	`next_date` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`category_id` text NOT NULL,
	`payment_method_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_recurring_category` ON `recurring_expenses` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_recurring_active_next` ON `recurring_expenses` (`active`,`next_date`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY DEFAULT 'default' NOT NULL,
	`budget` real DEFAULT 2500 NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`seeded_at` integer
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`type` text DEFAULT 'expense' NOT NULL,
	`transaction_date` text NOT NULL,
	`category_id` text NOT NULL,
	`payment_method_id` text,
	`source_recurring_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_transactions_date` ON `transactions` (`transaction_date`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_transactions_category` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_type` ON `transactions` (`type`);--> statement-breakpoint
CREATE INDEX `idx_transactions_category_date` ON `transactions` (`category_id`,`transaction_date`);--> statement-breakpoint
CREATE INDEX `idx_transactions_source_recurring` ON `transactions` (`source_recurring_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_method_date` ON `transactions` (`payment_method_id`,`transaction_date`);