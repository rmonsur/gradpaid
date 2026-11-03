export const APP_NAME = 'GradPaid';
export const APP_TAGLINE = 'Give once. The loan gets paid. Not the grad.';

/** Hard per-run ceiling on total payouts, in cents. Protects the sandbox demo from runaway agents. */
export const MAX_PAYOUT_PER_RUN_CENTS = 500_000;
/** Minimum accumulated amount before a servicer payout is worth sending, in cents. */
export const MIN_DISBURSEMENT_CENTS = 1_000;
/** Maximum campaigns a single donation can be split across. */
export const MAX_SPLIT_CAMPAIGNS = 3;
/** Maximum agent steps per run. */
export const MAX_AGENT_STEPS = 12;
/** Maximum upload size for loan statements, in bytes. */
export const MAX_STATEMENT_BYTES = 10 * 1024 * 1024;
export const ALLOWED_STATEMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

export const MODELS = {
  agent: 'claude-sonnet-5-5',
  extraction: 'claude-opus-5-5',
} as const;
