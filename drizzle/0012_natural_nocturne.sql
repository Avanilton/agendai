ALTER TABLE "users" ADD COLUMN "theme" text DEFAULT 'light' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_home_route" text DEFAULT '/app' NOT NULL;