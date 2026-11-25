CREATE TYPE "public"."commission_calc_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."commission_source" AS ENUM('service', 'product_sale', 'goal_bonus', 'manual');--> statement-breakpoint
CREATE TYPE "public"."commission_status" AS ENUM('pending', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."time_entry_type" AS ENUM('work_hours', 'overtime', 'absence', 'day_off', 'vacation');--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"source" "commission_source" DEFAULT 'service' NOT NULL,
	"calc_type" "commission_calc_type" DEFAULT 'percentage' NOT NULL,
	"base_amount_cents" integer DEFAULT 0 NOT NULL,
	"rate_bps" integer DEFAULT 0 NOT NULL,
	"commission_amount_cents" integer NOT NULL,
	"status" "commission_status" DEFAULT 'pending' NOT NULL,
	"reference_date" date NOT NULL,
	"paid_at" timestamp with time zone,
	"appointment_id" uuid,
	"sale_id" uuid,
	"service_id" uuid,
	"description" text NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"month_key" text NOT NULL,
	"target_revenue_cents" integer DEFAULT 0 NOT NULL,
	"target_appointments" integer DEFAULT 0 NOT NULL,
	"bonus_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"type" time_entry_type DEFAULT 'work_hours' NOT NULL,
	"entry_date" date NOT NULL,
	"duration_minutes" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_goals" ADD CONSTRAINT "professional_goals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_goals" ADD CONSTRAINT "professional_goals_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_time_entries" ADD CONSTRAINT "team_time_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_time_entries" ADD CONSTRAINT "team_time_entries_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_time_entries" ADD CONSTRAINT "team_time_entries_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commissions_org_prof_status_idx" ON "commissions" USING btree ("organization_id","professional_id","status");--> statement-breakpoint
CREATE INDEX "commissions_org_ref_date_idx" ON "commissions" USING btree ("organization_id","reference_date");--> statement-breakpoint
CREATE INDEX "prof_goals_org_month_idx" ON "professional_goals" USING btree ("organization_id","month_key");--> statement-breakpoint
CREATE INDEX "time_entries_org_prof_date_idx" ON "team_time_entries" USING btree ("organization_id","professional_id","entry_date");