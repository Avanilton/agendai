CREATE TYPE "public"."nfse_status" AS ENUM('draft', 'queued', 'issued', 'cancelled', 'error');--> statement-breakpoint
CREATE TYPE "public"."pix_charge_status" AS ENUM('pending', 'paid', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."tax_regime" AS ENUM('mei', 'simples_nacional', 'lucro_presumido', 'lucro_real');--> statement-breakpoint
CREATE TABLE "fiscal_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"cnpj" text,
	"municipal_registration" text,
	"tax_regime" "tax_regime" DEFAULT 'simples_nacional' NOT NULL,
	"default_service_code" text,
	"iss_rate_bps" integer DEFAULT 200 NOT NULL,
	"provider" text DEFAULT 'none' NOT NULL,
	"environment" text DEFAULT 'sandbox' NOT NULL,
	"is_configured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fiscal_profiles_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "pix_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid,
	"transaction_id" uuid,
	"provider" text DEFAULT 'manual_br_code' NOT NULL,
	"external_charge_id" text,
	"pix_key" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"br_code" text NOT NULL,
	"description" text NOT NULL,
	"status" "pix_charge_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid,
	"transaction_id" uuid,
	"service_code" text,
	"description" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"iss_rate_bps" integer DEFAULT 200 NOT NULL,
	"status" "nfse_status" DEFAULT 'draft' NOT NULL,
	"external_id" text,
	"invoice_number" text,
	"xml_url" text,
	"pdf_url" text,
	"error_message" text,
	"issued_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fiscal_profiles" ADD CONSTRAINT "fiscal_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pix_charges" ADD CONSTRAINT "pix_charges_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pix_charges" ADD CONSTRAINT "pix_charges_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pix_charges" ADD CONSTRAINT "pix_charges_transaction_id_financial_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."financial_transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pix_charges" ADD CONSTRAINT "pix_charges_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_transaction_id_financial_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."financial_transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pix_charges_org_status_idx" ON "pix_charges" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "service_invoices_org_status_idx" ON "service_invoices" USING btree ("organization_id","status");