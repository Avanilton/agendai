CREATE TABLE "booking_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"allow_any_professional" boolean DEFAULT true NOT NULL,
	"min_advance_minutes" integer DEFAULT 60 NOT NULL,
	"max_advance_days" integer DEFAULT 30 NOT NULL,
	"slot_interval_minutes" integer DEFAULT 30 NOT NULL,
	"auto_confirm" boolean DEFAULT false NOT NULL,
	"cancellation_policy_hours" integer DEFAULT 24 NOT NULL,
	"welcome_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_settings_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
ALTER TABLE "booking_settings" ADD CONSTRAINT "booking_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;