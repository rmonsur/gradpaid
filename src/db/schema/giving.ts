import { pgTable, text, integer, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { campaigns } from './campaigns';

export const orderStatusEnum = pgEnum('order_status', [
  'created',
  'approved',
  'captured',
  'failed',
]);

export interface SplitLine {
  readonly campaignId: string;
  readonly cents: number;
  readonly reason: string;
}

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  paypalOrderId: text('paypal_order_id').notNull().unique(),
  paypalCaptureId: text('paypal_capture_id'),
  donorName: text('donor_name').notNull(),
  donorEmail: text('donor_email'),
  totalCents: integer('total_cents').notNull(),
  currency: text('currency').notNull().default('USD'),
  split: jsonb('split').$type<readonly SplitLine[]>().notNull(),
  status: orderStatusEnum('status').notNull().default('created'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  capturedAt: timestamp('captured_at', { withTimezone: true }),
});

export const pledges = pgTable('pledges', {
  id: text('id').primaryKey(),
  orderId: text('order_id')
    .notNull()
    .references(() => orders.id),
  campaignId: text('campaign_id')
    .notNull()
    .references(() => campaigns.id),
  cents: integer('cents').notNull(),
  disbursementId: text('disbursement_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type Pledge = typeof pledges.$inferSelect;
