// The money model behind the figure. Pure functions over integer cents; the
// build inlines this file into the page so the readout and the moving parts
// are driven by the same arithmetic. Every function returns a new state.

export const GIFT_CENTS = 2500;
export const MATCH_RATIO = 1;
export const MATCH_CAP_CENTS = 5000;
export const BIN_COUNT = 3;
export const SPLIT_MIN = 1;
export const SPLIT_MAX = BIN_COUNT;
export const CENTS_PER_DOLLAR = 100;

export const LINE_KINDS = Object.freeze({
  ORDER: "ORDER",
  SPLIT: "SPLIT",
  PAYOUT: "PAYOUT",
  INVOICE: "INVOICE",
});

export function emptyLedger() {
  return Object.freeze({
    raised: 0,
    paid: 0,
    match: 0,
    bins: Object.freeze(Array.from({ length: BIN_COUNT }, () => 0)),
    lines: Object.freeze([]),
  });
}

export function clampSplit(ways) {
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, Math.round(ways)));
}

// Whole-cent allocation: the remainder goes one cent at a time to the last bins,
// so 2500 three ways is 833, 833 and 834.
export function allocate(cents, ways) {
  const count = clampSplit(ways);
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  return Array.from({ length: count }, (_, index) => base + (index >= count - remainder ? 1 : 0));
}

export function matchDue(paidCents) {
  return Math.min(MATCH_CAP_CENTS, Math.round(paidCents * MATCH_RATIO));
}

const withLine = (ledger, kind, cents, bin) =>
  Object.freeze([...ledger.lines, Object.freeze({ kind, cents, bin: bin ?? null, index: ledger.lines.length })]);

export function capture(ledger, cents) {
  return Object.freeze({ ...ledger, raised: ledger.raised + cents, lines: withLine(ledger, LINE_KINDS.ORDER, cents) });
}

export function allocateTo(ledger, bin, cents) {
  const bins = Object.freeze(ledger.bins.map((held, index) => (index === bin ? held + cents : held)));
  return Object.freeze({ ...ledger, bins, lines: withLine(ledger, LINE_KINDS.SPLIT, cents, bin) });
}

export function payout(ledger, bin, cents) {
  const bins = Object.freeze(ledger.bins.map((held, index) => (index === bin ? held - cents : held)));
  const paid = ledger.paid + cents;
  const match = matchDue(paid);
  const afterPayout = Object.freeze({ ...ledger, bins, paid, match, lines: withLine(ledger, LINE_KINDS.PAYOUT, cents, bin) });
  if (match === ledger.match) return afterPayout;
  return Object.freeze({ ...afterPayout, lines: withLine(afterPayout, LINE_KINDS.INVOICE, match - ledger.match) });
}

export function formatCents(cents) {
  const dollars = Math.floor(cents / CENTS_PER_DOLLAR);
  const rest = String(cents % CENTS_PER_DOLLAR).padStart(2, "0");
  return `$${dollars.toLocaleString("en-US")}.${rest}`;
}

export function readoutOf(ledger) {
  const cap = ledger.match >= MATCH_CAP_CENTS ? " (cap)" : "";
  return `raised ${formatCents(ledger.raised)} · paid ${formatCents(ledger.paid)} · match ${formatCents(ledger.match)}${cap}`;
}
