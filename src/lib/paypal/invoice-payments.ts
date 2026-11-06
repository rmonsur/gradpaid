import type { PayPalAgentToolkit } from '@paypal/agent-toolkit/ai-sdk';
import { paypalRest } from './rest';
import { toPayPalAmount, DEFAULT_CURRENCY } from '@/lib/money';

const ISO_DATE_CHARS = 10;

/**
 * Records a payment against a PayPal invoice (Invoicing v2 "record payment"). PayPal marks the
 * invoice PAID and emits INVOICING.INVOICE.PAID, which the webhook also books idempotently.
 */
export async function recordInvoicePayment(
  toolkit: PayPalAgentToolkit,
  paypalInvoiceId: string,
  amountCents: number,
): Promise<void> {
  await paypalRest<unknown>(toolkit, {
    method: 'POST',
    path: `/v2/invoicing/invoices/${encodeURIComponent(paypalInvoiceId)}/payments`,
    body: {
      method: 'PAYPAL',
      payment_date: new Date().toISOString().slice(0, ISO_DATE_CHARS),
      amount: { currency_code: DEFAULT_CURRENCY, value: toPayPalAmount(amountCents) },
      note: 'Match settled by the sponsor agent after verifying GradPaid ledger evidence.',
    },
    requestId: `gradpaid-invoice-payment-${paypalInvoiceId}`,
  });
}
