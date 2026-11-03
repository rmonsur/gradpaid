import { PayPalAgentToolkit } from '@paypal/agent-toolkit/ai-sdk';
import type { Tool } from 'ai';
import { getEnv } from '@/lib/env';

/** Product/action map in the shape the PayPal Agent Toolkit expects. */
export type ToolkitActions = Readonly<Record<string, Readonly<Record<string, boolean>>>>;

/** Tools the donor-facing giving agent may call. */
export const GIVING_ACTIONS: ToolkitActions = {
  orders: { create: true, get: true },
};

/** Tools the money-moving disbursement agent may call. Payouts is added as a custom tool. */
export const DISBURSEMENT_ACTIONS: ToolkitActions = {
  orders: { get: true },
  transactions: { list: true },
  invoices: { create: true, send: true, get: true },
  payments: { createRefund: true, getRefunds: true },
};

export interface PayPalToolkitHandle {
  readonly toolkit: PayPalAgentToolkit;
  readonly tools: Readonly<Record<string, Tool>>;
}

/**
 * Builds a PayPal Agent Toolkit instance scoped to an explicit allowlist of actions,
 * always in sandbox mode. Each agent gets its own handle so no agent can reach a tool
 * it was not granted.
 */
export function createPayPalToolkit(
  actions: ToolkitActions,
  requestId?: string,
): PayPalToolkitHandle {
  const env = getEnv();
  const toolkit = new PayPalAgentToolkit({
    clientId: env.PAYPAL_CLIENT_ID,
    clientSecret: env.PAYPAL_CLIENT_SECRET,
    configuration: {
      actions: actions as Record<string, Record<string, boolean>>,
      context: { sandbox: true, request_id: requestId },
    },
  });
  return { toolkit, tools: toolkit.getTools() };
}
