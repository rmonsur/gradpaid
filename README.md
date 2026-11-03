# GradPaid

Give once. The loan gets paid. Not the grad.

GradPaid is crowd-repayment for student debt, run by AI agents on the PayPal developer platform. A borrower creates a verified campaign from a real loan statement. Donors give once with PayPal and an agent splits the gift across the graduates they care about. A disbursement agent then pays the loan servicer directly through PayPal, invoices matching sponsors, reconciles against PayPal transaction history, and publishes an append-only ledger. The borrower never touches the money.

Built for the PayPal AI Hackathon. Everything runs in the PayPal sandbox.

Hosted demo: https://gradpaid.onrender.com (Render web service, Postgres, and a cron job that runs the
disbursement agent every six hours).

## Where PayPal's AI SDK is used

Every money movement is a tool call made by an agent through the official PayPal Agent Toolkit (`@paypal/agent-toolkit`, Vercel AI SDK integration), and every call is shown live in the app.

| Agent                     | PayPal Agent Toolkit tools                                                            | Custom tools                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Giving agent (donor chat) | `create_order`, `get_order`                                                           | campaign search (Elastic or Postgres), split proposal, order recording                                  |
| Checkout capture          | `pay_order`                                                                           |                                                                                                         |
| Disbursement agent        | `list_transactions`, `create_invoice`, `send_invoice`, `get_invoice`, `create_refund` | `send_payout` and `get_payout_batch` wrapping the PayPal Payouts REST API, plan, ledger, reconciliation |

The disbursement agent never decides an amount or a recipient. `open_disbursement` computes the amount from
the campaign's pledges on the server, `send_payout` takes only a disbursement id and reads the amount and
receiver from the row, `record_sponsor_invoice` reads the invoice back from PayPal with `get_invoice` and
refuses to record it if the total differs from the match due, and `get_ledger_expectations` hands the agent
the captures it must find in `list_transactions`. Failed payouts keep their pledges and resume under the same
idempotency key, crashed runs release what they planned, and only one run per agent can be live at a time.

The Payouts tools are written in the same shape as the toolkit's own tools and registered alongside them, showing how the toolkit extends to products it does not ship yet. The PayPal MCP server (`@paypal/mcp`) was used in the development workflow to inspect sandbox state.

## Stack

Next.js 16 (App Router, TypeScript strict), Vercel AI SDK with Claude, PayPal Agent Toolkit, PayPal JS SDK v6, Postgres with Drizzle, Elastic Cloud Serverless (hybrid search, optional), AG Grid (ledger), Render (web, Postgres, cron), Postman (health monitor and demo collection). Details in `doc/STACK.md`, product and pitch in `doc/ABOUT.md`.

## Run it locally

Requirements: Node 22, pnpm 9, Postgres 14 or newer.

```bash
pnpm install
createdb gradpaid
cp .env.example .env.local   # fill in the values described below
pnpm db:migrate
pnpm seed                    # three verified campaigns and one matching sponsor
pnpm dev                     # http://localhost:3000
```

Environment variables:

| Variable                                   | Purpose                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | Postgres connection string                                                         |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Sandbox REST app credentials. Enable Payouts on the app in the Developer Dashboard |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID`             | Same client id, used by the browser SDK                                            |
| `PAYPAL_SERVICER_EMAIL`                    | Sandbox business account that stands in for the loan servicer                      |
| `PAYPAL_SPONSOR_EMAIL`                     | Sandbox business account that receives sponsor match invoices                      |
| `PAYPAL_WEBHOOK_ID`                        | Optional. Webhook id for capture events; polling is the fallback                   |
| `ANTHROPIC_API_KEY`                        | Model for the agents                                                               |
| `ELASTIC_URL`, `ELASTIC_API_KEY`           | Optional. Without them campaign search uses Postgres                               |
| `CRON_SECRET`                              | Bearer token for the scheduled disbursement trigger                                |
| `DEMO_TOKEN`                               | Bearer token for the Agent console reset and run buttons                           |
| `NEXT_PUBLIC_APP_URL`                      | Public base URL, used to scope the PayPal client token                             |

## PayPal sandbox setup

1. In the Developer Dashboard create a REST app (sandbox) and copy the client id and secret.
2. On the app's Features, enable Payouts and Transaction Search. Without Transaction Search the reconciliation step logs a 403 and continues.
3. Under Sandbox accounts create two extra Business accounts, one to play the loan servicer and one to play the matching sponsor, and put their emails in `PAYPAL_SERVICER_EMAIL` and `PAYPAL_SPONSOR_EMAIL`. The default Personal account is the funded buyer for checkout.
4. Optional: create a webhook for `PAYMENT.CAPTURE.COMPLETED` pointing at `/api/webhooks/paypal` and set `PAYPAL_WEBHOOK_ID`.

## Judge path

1. Open the hosted URL. The landing page lists three verified campaigns.
2. Go to Give. Tell the agent who you want to help and how much. Confirm the split. Pay with the sandbox buyer account below. Watch the right-hand panel: every PayPal call shows its request, response, and id.
3. Go to Agent console. Paste the demo token, run the disbursement agent. It pays the servicer by PayPal payout, invoices the sponsor, reconciles against PayPal transactions, and reports.
4. Go to Ledger. Every row carries a PayPal reference.
5. Use Reset demo data in the Agent console at any time to start over.

Sandbox buyer credentials and the demo token are on the Devpost submission page.

## Commands

```bash
pnpm test            # 77 unit and integration tests (integration tests need DATABASE_URL)
pnpm typecheck
pnpm lint
pnpm disburse:dry    # run the disbursement agent from the CLI without sending payouts
pnpm disburse
```

## Reliability for judges

Hosted on Render with a health endpoint at `/api/health`, a Postman collection and monitor on it, seeded demo data with a one-click reset (including one captured gift so the disbursement agent always has work), capture as a single conditional update so the webhook and the polling route cannot double count, payouts keyed on internal ids, a fixed receiver and per-run cap on payouts, rate limits on public endpoints, and a Postgres fallback for search.

## Design and documentation

- `doc/DESIGN.md`: the design system (Aura "SaaS Finance Platform" tokens: dark background, lime accent, Inter display, JetBrains Mono body). Every colour in the app is a token from this file.
- `doc/diagrams/`: architecture, how a gift moves, the agent harness, and the deployment, as self-contained HTML, plus an interactive isometric figure of the money path in `doc/diagrams/money-path/`.
- `.claude/skills/`: the engineering skills used to build and review this repo (tdd, code-review, diagnosing-bugs, implement). The impeccable, anatomy and diagram-design skills are installed locally and ignored by git; install them with `npx impeccable install` and `npx skills add wheresryan22/anatomy cathrynlavery/diagram-design`.

## Honest scope notes

Loan servicers do not accept PayPal today, so the servicer is a sandbox business account and payouts are modeled in sandbox. A production version would need money transmission licensing or a registered nonprofit partner, and stronger loan ownership verification than statement extraction.

## License

MIT. See `LICENSE`.
