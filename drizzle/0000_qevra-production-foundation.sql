CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`detail_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_org_time_idx` ON `audit_events` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `dataset_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`dataset_id` text NOT NULL,
	`object_key` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`checksum` text NOT NULL,
	`label` text,
	`split` text DEFAULT 'unassigned' NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dataset_assets_dataset_checksum_uq` ON `dataset_assets` (`dataset_id`,`checksum`);--> statement-breakpoint
CREATE INDEX `dataset_assets_dataset_idx` ON `dataset_assets` (`dataset_id`);--> statement-breakpoint
CREATE TABLE `dataset_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`dataset_id` text NOT NULL,
	`version` integer NOT NULL,
	`name` text NOT NULL,
	`manifest_object_key` text NOT NULL,
	`image_count` integer NOT NULL,
	`label_summary_json` text DEFAULT '{}' NOT NULL,
	`split_summary_json` text DEFAULT '{}' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dataset_snapshots_version_uq` ON `dataset_snapshots` (`dataset_id`,`version`);--> statement-breakpoint
CREATE TABLE `datasets` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'collecting' NOT NULL,
	`image_count` integer DEFAULT 0 NOT NULL,
	`byte_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `datasets_recipe_idx` ON `datasets` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `deployments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`model_id` text NOT NULL,
	`station_id` text NOT NULL,
	`environment` text DEFAULT 'shadow' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`deployed_by` text NOT NULL,
	`deployed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `deployments_station_idx` ON `deployments` (`station_id`);--> statement-breakpoint
CREATE TABLE `inspections` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`model_id` text,
	`station_id` text DEFAULT 'browser-station' NOT NULL,
	`serial_number` text,
	`batch_number` text,
	`source` text NOT NULL,
	`model_decision` text NOT NULL,
	`final_disposition` text DEFAULT 'pending' NOT NULL,
	`anomaly_score` real,
	`latency_ms` real,
	`image_object_key` text,
	`heatmap_object_key` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`inspected_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `inspections_org_time_idx` ON `inspections` (`organization_id`,`inspected_at`);--> statement-breakpoint
CREATE INDEX `inspections_recipe_idx` ON `inspections` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `models` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`training_job_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'candidate' NOT NULL,
	`artifact_object_key` text NOT NULL,
	`metrics_json` text DEFAULT '{}' NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`training_job_id`) REFERENCES `training_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `models_recipe_version_uq` ON `models` (`recipe_id`,`version`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_uq` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`family` text NOT NULL,
	`sku` text NOT NULL,
	`variant` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`attributes_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_org_sku_variant_uq` ON `products` (`organization_id`,`sku`,`variant`);--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`task_type` text NOT NULL,
	`camera_profile` text DEFAULT 'unassigned' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`active_model_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `recipes_product_idx` ON `recipes` (`product_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`inspection_id` text NOT NULL,
	`reviewer_email` text NOT NULL,
	`disposition` text NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inspection_id`) REFERENCES `inspections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reviews_inspection_idx` ON `reviews` (`inspection_id`);--> statement-breakpoint
CREATE TABLE `training_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`requested_by` text NOT NULL,
	`provider_job_id` text,
	`status` text DEFAULT 'provider_required' NOT NULL,
	`config_json` text DEFAULT '{}' NOT NULL,
	`metrics_json` text DEFAULT '{}' NOT NULL,
	`failure_message` text,
	`started_at` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`snapshot_id`) REFERENCES `dataset_snapshots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `training_jobs_recipe_idx` ON `training_jobs` (`recipe_id`);--> statement-breakpoint
CREATE INDEX `training_jobs_status_idx` ON `training_jobs` (`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'reviewer' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_org_email_uq` ON `users` (`organization_id`,`email`);