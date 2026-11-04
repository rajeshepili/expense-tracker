PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`type` text DEFAULT 'expense' NOT NULL,
	`transaction_date` text NOT NULL,
	`category_id` text,
	`payment_method_id` text,
	`source_recurring_id` text,
	`transfer_id` text,
	`transfer_direction` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_transactions`("id", "description", "amount", "type", "transaction_date", "category_id", "payment_method_id", "source_recurring_id", "transfer_id", "transfer_direction", "created_at") SELECT "id", "description", "amount", "type", "transaction_date", "category_id", "payment_method_id", "source_recurring_id", NULL, NULL, "created_at" FROM `transactions`;--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
ALTER TABLE `__new_transactions` RENAME TO `transactions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_transactions_date` ON `transactions` (`transaction_date`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_transactions_category` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_type` ON `transactions` (`type`);--> statement-breakpoint
CREATE INDEX `idx_transactions_category_date` ON `transactions` (`category_id`,`transaction_date`);--> statement-breakpoint
CREATE INDEX `idx_transactions_source_recurring` ON `transactions` (`source_recurring_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_account_date` ON `transactions` (`payment_method_id`,`transaction_date`);--> statement-breakpoint
CREATE INDEX `idx_transactions_transfer` ON `transactions` (`transfer_id`);--> statement-breakpoint
ALTER TABLE `payment_methods` ADD `type` text DEFAULT 'asset' NOT NULL;--> statement-breakpoint
UPDATE `payment_methods` SET `type` = 'liability' WHERE lower(`name`) LIKE '%credit card%';--> statement-breakpoint
ALTER TABLE `payment_methods` ADD `starting_balance` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_methods` ADD `closed` integer DEFAULT false NOT NULL;