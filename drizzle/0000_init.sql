CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'pending_verification', 'active', 'funded', 'failed_verification');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('created', 'approved', 'captured', 'failed');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."agent_run_status" AS ENUM('running', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."disbursement_status" AS ENUM('planned', 'sent', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ledger_kind" AS ENUM('donation_captured', 'sponsor_invoiced', 'sponsor_paid', 'servicer_payout', 'refund', 'reconciled', 'exception');--> statement-breakpoint
CREATE TABLE "borrowers" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"borrower_id" text NOT NULL,
	"title" text NOT NULL,
	"story" text NOT NULL,
	"school" text NOT NULL,
	"field_of_study" text NOT NULL,
	"state" text NOT NULL,
	"cohort_tags" text[] DEFAULT '{}' NOT NULL,
	"servicer_name" text NOT NULL,
	"loan_account_ref" text NOT NULL,
	"balance_cents" integer NOT NULL,
	"interest_rate_bps" integer NOT NULL,
	"monthly_payment_cents" integer NOT NULL,
	"goal_cents" integer NOT NULL,
	"raised_cents" integer DEFAULT 0 NOT NULL,
	"disbursed_cents" integer DEFAULT 0 NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"paypal_order_id" text NOT NULL,
	"paypal_capture_id" text,
	"donor_name" text NOT NULL,
	"donor_email" text,
	"total_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"split" jsonb NOT NULL,
	"status" "order_status" DEFAULT 'created' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"captured_at" timestamp with time zone,
	CONSTRAINT "orders_paypal_order_id_unique" UNIQUE("paypal_order_id")
);
--> statement-breakpoint
CREATE TABLE "pledges" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"cents" integer NOT NULL,
	"disbursement_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"sponsor_id" text NOT NULL,
	"paypal_invoice_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_paypal_invoice_id_unique" UNIQUE("paypal_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "sponsors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"cohort_tag" text NOT NULL,
	"ratio_bps" integer NOT NULL,
	"cap_cents" integer NOT NULL,
	"matched_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"agent" text NOT NULL,
	"trigger" text NOT NULL,
	"status" "agent_run_status" DEFAULT 'running' NOT NULL,
	"summary" text,
	"tool_calls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "disbursements" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"paypal_payout_batch_id" text,
	"paypal_payout_item_id" text,
	"status" "disbursement_status" DEFAULT 'planned' NOT NULL,
	"agent_run_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "ledger_kind" NOT NULL,
	"campaign_id" text,
	"amount_cents" integer NOT NULL,
	"counterparty" text NOT NULL,
	"paypal_ref" text,
	"agent_run_id" text,
	"related_entry_id" text,
	"memo" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_exceptions" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_run_id" text NOT NULL,
	"paypal_ref" text,
	"expected_cents" integer,
	"actual_cents" integer,
	"detail" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_borrower_id_borrowers_id_fk" FOREIGN KEY ("borrower_id") REFERENCES "public"."borrowers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;