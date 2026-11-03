import { pgTable, text, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'cancelled']);

export const sponsors = pgTable('sponsors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  /** Campaigns whose cohortTags include this tag are matched. */
  cohortTag: text('cohort_tag').notNull(),
  /** Match ratio in basis points: 10000 = 1:1. */
  ratioBps: integer('ratio_bps').notNull(),
  capCents: integer('cap_cents').notNull(),
  matchedCents: integer('matched_cents').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  sponsorId: text('sponsor_id')
    .notNull()
    .references(() => sponsors.id),
  paypalInvoiceId: text('paypal_invoice_id').notNull().unique(),
  amountCents: integer('amount_cents').notNull(),
  status: invoiceStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Sponsor = typeof sponsors.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
