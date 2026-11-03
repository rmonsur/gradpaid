import { pgTable, text, integer, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',
  'pending_verification',
  'active',
  'funded',
  'failed_verification',
]);

export const borrowers = pgTable('borrowers', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const campaigns = pgTable('campaigns', {
  id: text('id').primaryKey(),
  borrowerId: text('borrower_id')
    .notNull()
    .references(() => borrowers.id),
  title: text('title').notNull(),
  story: text('story').notNull(),
  school: text('school').notNull(),
  fieldOfStudy: text('field_of_study').notNull(),
  state: text('state').notNull(),
  cohortTags: text('cohort_tags').array().notNull().default([]),
  servicerName: text('servicer_name').notNull(),
  /** Masked in the UI, never logged. */
  loanAccountRef: text('loan_account_ref').notNull(),
  balanceCents: integer('balance_cents').notNull(),
  interestRateBps: integer('interest_rate_bps').notNull(),
  monthlyPaymentCents: integer('monthly_payment_cents').notNull(),
  goalCents: integer('goal_cents').notNull(),
  raisedCents: integer('raised_cents').notNull().default(0),
  disbursedCents: integer('disbursed_cents').notNull().default(0),
  status: campaignStatusEnum('status').notNull().default('draft'),
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type Borrower = typeof borrowers.$inferSelect;
