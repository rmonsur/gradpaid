# GradPaid: Technical Stack

This document describes every layer of the system, why each choice was made, and how the pieces connect. It is a design document, not an implementation guide. See ABOUT.md for the product and pitch.

---

## 1. Stack at a glance

| Layer           | Choice                                                                                         | Reason                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Web application | Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui                                 | Fast to make polished, server components plus streaming, one deployable unit |
| Agent runtime   | Vercel AI SDK with `@paypal/agent-toolkit`                                                     | PayPal's officially supported pairing. Streams tool calls to the UI natively |
| Language models | Claude Sonnet 5.5 for agents, Claude Opus 5.5 for statement extraction                         | Strong tool use, vision for uploaded statements                              |
| PayPal          | Orders, Invoicing, Payouts, Reporting, Refunds, JS SDK v6, Webhooks, Agent Toolkit, MCP server | The core requirement of the hackathon and the center of the product          |
| Search          | Elastic Cloud Serverless, hybrid vector and keyword                                            | Donor intent to campaign matching. Sponsor tool                              |
| Ledger UI       | AG Grid                                                                                        | Public transparency ledger with grouping and filtering. Sponsor tool         |
| Database        | Postgres on Render with Drizzle ORM                                                            | Managed, co-located with the app, typed schema                               |
| Hosting         | Render web service plus Render cron job                                                        | Public URL for webhooks, scheduled agent runs. Sponsor tool                  |
| Validation      | Zod                                                                                            | Schema validation at every boundary and for every tool input                 |
| Judge tooling   | Postman collection and monitor                                                                 | Health checks and a one-click demo reset. Sponsor tool                       |
| Notifications   | Zapier (optional, stretch)                                                                     | Milestone emails. Sponsor tool                                               |
| Logging         | Pino structured logs                                                                           | No console output in committed code                                          |
| Testing         | Vitest, Playwright                                                                             | Unit and integration on agents and tools, one end-to-end judge path          |

Sponsor tools deliberately excluded: Bryntum, Channel3, APIMatic, KERNEL, Astropods. Each would be decorative here. Four sponsor tools with a real job beat eight used shallowly.

---

## 2. System architecture

```
Browser
  |  Next.js pages, PayPal JS SDK v6 buttons, AG Grid ledger, streaming agent panel
  v
Next.js server (Render web service)
  |  Route handlers: chat, upload, checkout, webhooks, health, reset
  |  Agent runtime: Vercel AI SDK
  |     Tools: PayPal Agent Toolkit (official) + custom Payouts tool + Elastic search tool + ledger tools
  v
PayPal sandbox            Elastic Cloud          Postgres (Render)
  Orders, Invoices,         Campaign index         Campaigns, pledges,
  Payouts, Reporting,       (hybrid search)        matches, ledger,
  Refunds, Webhooks                                agent runs

Render cron job
  |  Triggers the disbursement agent on a schedule
  v
Same Next.js server, internal route protected by a shared secret
```

Three agents share one runtime and one tool registry, but each has its own system prompt, tool allowlist, and reasoning budget.

---

## 3. PayPal integration

### 3.1 Sandbox accounts

All accounts are created in the PayPal Developer Dashboard sandbox. None of these are real money.

| Account  | Type     | Role                                                                                 |
| -------- | -------- | ------------------------------------------------------------------------------------ |
| Platform | Business | Receives donor orders, sends payouts, issues invoices. Owns the REST app credentials |
| Servicer | Business | Receives payouts. Stands in for a loan servicer                                      |
| Sponsor  | Business | Receives and pays matching invoices                                                  |
| Donor    | Personal | Funded buyer account for judges to use at checkout                                   |

Credentials for the donor account are published in the README and on the demo page. Platform client ID and secret live only in Render environment variables.

### 3.2 Products and how each is reached

| Product                      | Reached through                                                                                     | Used by                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Orders: create, get, capture | Agent Toolkit `create_order`, `get_order`, `pay_order` plus JS SDK v6 buttons for the approval step | Giving agent, checkout page              |
| Invoicing: create, send, get | Agent Toolkit `create_invoice`, `send_invoice`, `get_invoice`                                       | Disbursement agent                       |
| Payouts                      | Custom tool wrapping the Payouts REST API, registered next to toolkit tools                         | Disbursement agent                       |
| Reporting: list transactions | Agent Toolkit `list_transactions`                                                                   | Disbursement agent, reconciliation       |
| Refunds                      | Agent Toolkit `create_refund`, `get_refund`                                                         | Disbursement agent                       |
| Webhooks                     | REST webhook subscription for order capture and payout status, verified by signature                | Route handler                            |
| MCP server                   | `@paypal/mcp` in Claude Code during development, and the hosted sandbox MCP endpoint                | Development workflow, shown in the video |

The toolkit does not ship a Payouts tool. The custom tool follows the same shape as the official tools: a Zod input schema, a description written for the model, and a thin call to the REST API. The write-up presents this as an example of extending the toolkit.

### 3.3 Sandbox configuration

- Toolkit configured with the platform client ID and secret and the sandbox context flag.
- Every PayPal call carries a request ID derived from the internal ledger entry so retries are idempotent.
- Orders use a custom reference field carrying the campaign and pledge identifiers.
- Payouts use the sender item ID field carrying the disbursement identifier and the loan account reference.
- Webhook events are verified with PayPal's signature verification before anything is written.

---

## 4. Agents

All three agents run on Vercel AI SDK with Claude Sonnet 5.5 unless noted. Each agent is defined by a system prompt, a tool allowlist, a maximum step count, and a reasoning budget.

### 4.1 Intake agent

- Input: an uploaded PDF or image of a loan statement.
- Model: Claude Opus 5.5 with vision, high reasoning budget. Extraction errors here poison everything downstream.
- Tools: none from PayPal. A single structured-output schema for servicer, account reference, balance, rate, and monthly payment.
- Output: a draft campaign record the borrower reviews and approves. Nothing is published without approval.

### 4.2 Giving agent

- Input: donor chat message describing intent and an amount.
- Model: Claude Sonnet 5.5, medium reasoning budget.
- Tools: Elastic campaign search, `create_order`, `get_order`.
- Behaviour: searches campaigns, proposes a split with a reason per borrower, waits for donor confirmation, creates one order with the split encoded in the reference, hands off to the JS SDK buttons for approval, then confirms capture with `get_order` and records pledges.

### 4.3 Disbursement agent

- Input: a scheduled trigger or a threshold event.
- Model: Claude Sonnet 5.5, high reasoning budget. This agent moves money.
- Tools: `list_transactions`, custom payout tool, `create_invoice`, `send_invoice`, `get_invoice`, `create_refund`, ledger read and write tools.
- Behaviour in one run:
  1. Read captured orders and paid invoices since the last run.
  2. Compute amount due per servicer per borrower.
  3. Execute one payout per borrower, idempotent on the disbursement identifier.
  4. Create and send a sponsor invoice when a match milestone is crossed.
  5. Pull transaction history and reconcile against the ledger. Any mismatch is written as an exception row, never silently corrected.
  6. Refund donations attached to campaigns that failed verification.
- Guardrails: a hard per-run cap on total payout amount, an allowlist of recipient accounts, and a dry-run mode that produces the plan without executing. The agent cannot invent a recipient.

### 4.4 Agent activity panel

Every tool call streams to the browser as a receipt-style row: tool name, summarized input, summarized output, PayPal identifiers, duration, and status. This panel is the hero screen in the demo and the primary evidence for the Technological Implementation criterion. It is rendered from the Vercel AI SDK tool-call stream, so it is not a mock.

---

## 5. Data model

Single Postgres database, Drizzle ORM, immutable ledger rows.

| Table                     | Purpose                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| borrowers                 | Identity and contact, no loan credentials                                                 |
| campaigns                 | Extracted loan facts, story, goal, verification status, servicer account reference        |
| sponsors                  | Match rules: cohort filter, ratio, cap                                                    |
| orders                    | PayPal order ID, donor, total, capture status, split                                      |
| pledges                   | One row per campaign share of an order                                                    |
| invoices                  | PayPal invoice ID, sponsor, amount, status                                                |
| disbursements             | PayPal payout batch and item IDs, campaign, amount, status                                |
| ledger_entries            | Append-only. Every money event with PayPal identifiers and the agent run that produced it |
| agent_runs                | Agent name, trigger, steps, tool calls, outcome                                           |
| reconciliation_exceptions | Mismatches between PayPal transaction history and the ledger                              |

Ledger entries are never updated. Corrections are new entries that reference the original.

---

## 6. Search

Elastic Cloud Serverless, one index of approved campaigns.

- Fields: story text, school, field of study, state, servicer, goal, funded percentage, cohort tags.
- Hybrid retrieval: dense vector on the story plus keyword filters on structured fields.
- The giving agent calls one search tool with a natural-language query and optional filters, gets back ranked campaigns with highlights, and reasons over the top results.
- Reindex on campaign approval and on every funding change so the agent never proposes a fully funded campaign.

---

## 7. Front end

- Next.js App Router with server components for pages and client components for the agent panel, checkout, and ledger.
- Tailwind CSS plus shadcn/ui primitives. One accent color, PayPal blue, on a neutral palette.
- Pages: landing, borrower intake, campaign page, donor chat and checkout, sponsor dashboard, public ledger, health, demo controls.
- PayPal JS SDK v6 renders the checkout buttons and handles approval. Capture is confirmed server-side by the agent, never trusted from the browser.
- AG Grid powers the public ledger: grouping by borrower and donor, filtering by status, totals, and a direct link from every row to its PayPal identifiers.
- Accessibility: keyboard-navigable throughout, screen-reader labels on the agent panel, color contrast checked.

---

## 8. Hosting and operations

Render

- One web service running Next.js. Public HTTPS URL, used for PayPal webhooks.
- One Postgres instance.
- One cron job that calls the internal disbursement route on a schedule with a shared secret.
- Environment variables: PayPal client ID and secret, PayPal webhook ID, Anthropic API key, Elastic endpoint and API key, database URL, internal cron secret. Required variables are validated at startup and the service refuses to boot without them.

Health and demo control

- Health route reports sandbox reachability, Elastic status, database status, and last successful agent run.
- Reset route reseeds three campaigns, one sponsor, and the servicer reference, and clears pledges and disbursements. Protected by a demo token shown on the demo page.
- Postman collection covers health, reset, and a scripted donor run. A Postman monitor hits health on a schedule through the judging window.

---

## 9. Reliability design

| Risk                                 | Mitigation                                                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Sandbox latency or transient errors  | Retries with backoff on every PayPal call, idempotency keys on orders, invoices, and payouts                               |
| Webhook never arrives                | Polling fallback with `get_order` and payout status reads                                                                  |
| Agent loops or runs away             | Maximum step count per run, per-run payout cap, recipient allowlist, dry-run mode                                          |
| Double payment on retry              | Disbursement identifier reused as the payout sender item ID; PayPal rejects duplicates                                     |
| Model returns malformed tool input   | Zod validation on every tool, agent receives the error and retries once, then the run fails loudly                         |
| Judge finds an empty or broken state | Reset route, seeded data, published demo credentials                                                                       |
| Secrets leak                         | No secrets in the repository, environment variables only, startup validation, no logging of credentials or account numbers |
| Demo page works on our machine only  | Clean-machine run from the README two days before submission                                                               |

---

## 10. Security and privacy

- No servicer credentials are collected or stored. Loan facts come from a statement the borrower uploads.
- Uploaded statements are type-checked (PDF, JPEG, PNG), size-limited, stored privately, and accessed through short-lived presigned links.
- Loan account references are stored, never logged, and shown masked in the UI.
- All request bodies are validated with Zod at the route boundary.
- Webhook signatures are verified before any write.
- Internal routes for cron and reset require a secret.
- Rate limiting on chat, upload, and reset routes.

---

## 11. Testing

- Unit: tool input schemas, split computation, match computation, reconciliation logic, idempotency key derivation.
- Integration: each agent against the PayPal sandbox with a recorded fixture fallback for CI, Elastic search tool against a test index.
- End-to-end: one Playwright path that follows exactly what a judge would do, from landing page to a reconciled ledger row.
- Coverage target of 80 percent on the agent and tool modules, which are the parts that move money.

---

## 12. Development workflow

- Repository: public on GitHub with an MIT license file so it appears in the About section, as the rules require.
- PayPal MCP server configured in Claude Code during development for exploring sandbox state in natural language. A short clip of this goes in the video.
- Conventional commits, Prettier, TypeScript strict with no `any`, explicit return types, files under 300 lines.
- Branches: `main` is always deployable to Render. Feature branches merge only when the judge path still passes.
- Tag the submitted commit as the demo release.

---

## 13. Decisions and alternatives

| Decision                    | Alternative considered                            | Why this way                                                                                                                                                                        |
| --------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel AI SDK               | OpenAI Agents SDK, LangChain, CrewAI              | All are officially supported by the toolkit. Vercel AI SDK lives inside Next.js and streams tool calls to the UI without extra plumbing, which makes the activity panel nearly free |
| Claude models               | Nova, GPT                                         | Strong structured tool use and vision. Any function-calling model works with the toolkit, so this is swappable                                                                      |
| Custom Payouts tool         | Model the servicer as a merchant and pay an order | Payouts is the correct product for platform-to-recipient transfers and tells a better agentic story                                                                                 |
| Elastic                     | Postgres full-text search                         | The sponsor prize is a bonus, but hybrid retrieval genuinely improves intent matching and is a credible production choice                                                           |
| Render                      | Vercel                                            | Sponsor tool, Postgres and cron in one place, and a stable public URL for webhooks                                                                                                  |
| Postgres append-only ledger | Mutable balances                                  | Auditability is the product. The ledger must reconcile against PayPal, not replace it                                                                                               |
