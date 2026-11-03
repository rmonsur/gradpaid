# GradPaid

Crowd-repayment for student debt, run by AI agents on the PayPal developer platform.

One line: GoFundMe for student loans, where an AI agent routes every dollar straight to the servicer and the money never touches the borrower.

Built for the PayPal AI Hackathon on Devpost. Submission deadline is Thursday, November 12, 2026 at 12:00 pm PT. Judging runs December 1 to December 15, 2026. Winners are announced on or around December 21, 2026.

---

## 1. The problem

Roughly 43 million Americans carry about 1.7 trillion dollars in student debt. Borrowers who fall behind usually do so because of timing and cash flow, not because nobody around them would help. Family, alumni networks, churches, and employers want to contribute, but the existing options are poor:

- Cash gifts to the borrower are easy to divert, hard to track, and create awkward conversations.
- Crowdfunding sites pay the borrower, not the lender, so donors have no proof the money reduced the debt.
- Employer student loan assistance exists in law, but small employers do not offer it because the operational plumbing is hard.
- Nobody reconciles anything. Donors never learn what their gift actually did to the balance.

The result is a large pool of willing help that never reaches the loan.

## 2. The solution

GradPaid is a platform where a borrower creates a verified campaign from a real loan statement, donors give with PayPal, matching sponsors pledge a multiplier, and an autonomous disbursement agent pays the servicer directly, invoices the sponsor, reconciles every transaction, and publishes a public ledger.

The borrower never receives funds. The donor sees exactly which payment their gift became. The sponsor is billed only when a match triggers. Every money movement is executed by an AI agent using PayPal's Agent Toolkit, and every agent action is visible on screen.

## 3. Who it is for

| Actor | What they do | What they get |
|---|---|---|
| Borrower | Uploads a loan statement, approves the generated campaign | A verified campaign page and a lower balance, with no cash handling |
| Donor | Describes who they want to help in plain language, pays once with PayPal | A split donation across matched borrowers and a receipt tied to a real servicer payment |
| Matching sponsor | Pledges a match ratio for a cohort, such as an employer or alumni association | Automatic invoicing only when donations trigger the match, with a clean audit trail |
| Servicer | Receives payouts referenced to a loan account | Modeled as a PayPal business account in sandbox for the demo |

## 4. How it works

### 4.1 Borrower intake

1. The borrower uploads a PDF or image of a loan statement.
2. The intake agent extracts servicer name, account reference, current balance, interest rate, and monthly payment.
3. The agent drafts a campaign page with a title, story, and funding goal. The borrower edits and approves.
4. The campaign is indexed in Elastic for discovery by donors.

### 4.2 Donor giving

1. The donor opens a chat and describes an intent, for example "first-generation nursing students in Ohio."
2. The giving agent runs a hybrid search over verified campaigns and proposes a split across two or three borrowers with reasons.
3. The donor adjusts the split and amount, then pays once through a PayPal checkout.
4. The agent confirms capture by reading the order back from PayPal and records the pledge against each campaign.

### 4.3 Sponsor matching

1. A sponsor registers a match rule, such as 1:1 up to a cap for a named cohort.
2. When donations against that cohort reach a milestone, the match becomes due.
3. The disbursement agent creates and sends a PayPal invoice to the sponsor for the matched amount.

### 4.4 Disbursement

The disbursement agent runs on a schedule and on threshold events. In one run it:

1. Lists captured donations and matched sponsor payments since the last run.
2. Computes the amount due to each servicer per borrower.
3. Executes a PayPal payout to the servicer account, referenced to the loan account.
4. Pulls PayPal transaction history and reconciles payouts against captured orders and paid invoices.
5. Writes each step to the public ledger with order, invoice, payout, and transaction identifiers.
6. Refunds any donation whose campaign failed verification.

Every one of these steps is a tool call. The user interface shows each call as a receipt-style row with request, response, and PayPal identifiers.

## 5. Why PayPal, and why agents

The hackathon has no tracks. The single requirement is that the project meaningfully use both the PayPal developer platform and AI, with PayPal central. PayPal's own resources page asks for agents that "take action on a user's behalf, not just recommend, but actually transact," names students as an underserved audience, and lists donation splitting and microfinance under Social Impact. GradPaid is built to sit at the intersection of all three.

PayPal products used, all in sandbox:

| Product | Role in GradPaid |
|---|---|
| Orders and Checkout (JS SDK v6) | Donor payment |
| Invoicing | Billing matching sponsors |
| Payouts | Paying servicers |
| Reporting | Reconciliation of orders, invoices, and payouts |
| Payments and Refunds | Refunding donations on failed verification |
| Agent Toolkit | The function-calling layer every agent uses to touch PayPal |
| MCP server | Used in the development workflow and shown in the demo video |

## 6. Judging criteria mapping

Judging is a pass/fail viability screen followed by five equally weighted criteria. Ties are broken in the order listed.

| Criterion | How GradPaid answers it |
|---|---|
| Technological Implementation | Five PayPal products driven through the Agent Toolkit by one autonomous agent, plus a custom Payouts tool that shows the toolkit is extensible. Live tool-call panel proves it is real. |
| Design | A complete product with three roles, not a proof of concept. Calm fintech visual language, a campaign card that reads like a scholarship profile, and the agent panel as the hero screen. |
| Potential Impact | A specific audience, a specific failure in the existing options, and a mechanism that structurally prevents diversion. Employer and alumni matching extends the model beyond individual donors. |
| Innovation and Idea | Donations become servicer payments executed by an agent. Sponsor matching is invoiced automatically. The ledger reconciles against PayPal records rather than a self-reported database. |
| Presentation | A three-minute video that shows the full loop end to end, with every PayPal call on screen. |

Target prizes: Grand Prize, Best Use of Agentic Commerce, Best Use of PayPal + AI, Most Impactful, Best Use of AG Grid, Best Use of Render.

## 7. Demo video plan

Under three minutes, public on YouTube, no third-party music or trademarks beyond the tools used.

| Time | Beat |
|---|---|
| 0:00 to 0:20 | The problem, ending on "the money never touches the borrower" |
| 0:20 to 0:50 | Borrower uploads a statement, agent builds the campaign |
| 0:50 to 1:30 | Donor chats, agent proposes a split, one PayPal checkout |
| 1:30 to 2:20 | Disbursement agent runs on screen: order confirmed, servicer paid, sponsor invoiced, ledger reconciled, each as a visible PayPal Agent Toolkit call |
| 2:20 to 2:40 | Public ledger in AG Grid and the impact math |
| 2:40 to 3:00 | Stack slide: PayPal Agent Toolkit, MCP server, Elastic, AG Grid, Render, Postman |

## 8. Reliability commitments for judges

Judges test between December 1 and December 15 without the team present. The project must work every time.

- Hosted on a public URL. Judges run nothing locally.
- A visible "Reset demo" control reseeds three verified campaigns, one sponsor, and the servicer account.
- Pre-provisioned sandbox accounts with credentials published in the README and on the demo page.
- Idempotent agent steps keyed on PayPal order, invoice, and payout identifiers, with retries. A sandbox hiccup never double-pays.
- Webhooks for order capture with polling as a fallback, so the flow never waits on a callback that did not arrive.
- A health page reporting sandbox reachability, Elastic status, and the last successful agent run, with a Postman monitor hitting the same endpoint.
- A full clean-machine run from the README two days before submission.

## 9. Honesty statements for the write-up

- Servicer payouts are modeled in the PayPal sandbox because loan servicers do not accept PayPal today. The servicer is a sandbox business account.
- A production version would require money transmission licensing or a partnership with a registered nonprofit, and verification of loan ownership beyond statement extraction.
- The Payouts tool is a custom tool wrapping the PayPal Payouts REST API, registered alongside the official Agent Toolkit tools, because the toolkit does not currently ship Payouts.

## 10. Submission checklist

- Text description with features and functionality.
- Tools disclosure naming every AI model and service used and how.
- Public repository on GitHub with all source, assets, and run instructions.
- Open-source license file visible in the repository About section.
- Hosted demo URL plus complete local run instructions.
- Demo video under three minutes, public on YouTube, link on the Devpost form.
- All materials in English.
- Submitted no later than November 11, 2026, one day ahead of the deadline.

## 11. Nine-day build plan

| Date | Milestone |
|---|---|
| Nov 4 | Sandbox accounts, Agent Toolkit wired into the agent runtime, donor checkout end to end on Render |
| Nov 5 to 6 | Statement intake, Elastic campaign search, giving agent with split checkout |
| Nov 7 | Disbursement agent, custom Payouts tool, sponsor invoicing, AG Grid ledger |
| Nov 8 to 9 | Design polish, agent activity panel, reset and health endpoints, Postman collection |
| Nov 10 | Video and write-up |
| Nov 11 | Clean-machine judge run, fixes, submit |
| Nov 12 | Buffer only. Deadline is 12:00 pm PT |

## 12. Open questions

- Whether the Best Use of Agentic Commerce prize maps to a specific PayPal product or to any agent that transacts through sandbox APIs. Ask the hackathon manager through the Devpost discussion board.
- Whether to add Zapier notifications for donor milestones. Only if the core loop is finished by November 9.
