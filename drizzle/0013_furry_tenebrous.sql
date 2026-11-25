CREATE TABLE "pricing_calculations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"item_type" text NOT NULL,
	"service_id" uuid,
	"product_id" uuid,
	"item_name" text NOT NULL,
	"inputs" jsonb NOT NULL,
	"total_cost_cents" integer NOT NULL,
	"minimum_price_cents" integer NOT NULL,
	"recommended_price_cents" integer NOT NULL,
	"estimated_profit_cents" integer NOT NULL,
	"real_margin_percent" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pricing_calculations" ADD CONSTRAINT "pricing_calculations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_calculations" ADD CONSTRAINT "pricing_calculations_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_calculations" ADD CONSTRAINT "pricing_calculations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pricing_calculations_org_idx" ON "pricing_calculations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pricing_calculations_org_type_idx" ON "pricing_calculations" USING btree ("organization_id","item_type");