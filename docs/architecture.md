# Architecture notes

This document explains the patterns established in this foundation
build so future slices (creator matching, content review, shipping,
KYC, disputes, admin console, ...) extend them consistently instead of
inventing parallel approaches.

## 1. Provider adapters (`apps/api/src/services/*`)

Every external dependency (email, object storage, payments, Instagram)
is defined as a TypeScript interface first, with two implementations:
a dev-safe adapter (console log / local disk / mock HMAC-signed
webhooks / fixture data) and a real adapter (Resend / Cloudflare R2 /
Razorpay / Meta Graph API). A factory function (`getXProvider()`)
picks the implementation from `env.X_PROVIDER` and **throws if a
dev-safe adapter is selected under `NODE_ENV=production`** — this is
what makes "never fake a successful integration" enforceable rather
than a policy someone can forget.

Domain code (`modules/*`) only ever imports the interface's factory,
never a concrete adapter or an SDK. Adding a second payment provider
(e.g. Cashfree) means adding `CashfreePaymentProvider implements
PaymentProvider` and one branch in `services/payment/index.ts` — no
change to `campaigns.service.ts` or `payments.service.ts`.

## 2. State machines (`packages/shared/src/states.ts`)

Every stateful entity (Campaign, Assignment, Payment, Withdrawal, KYC,
Dispute, Shipment) has an explicit `Record<Status, Status[]>`
transition table and goes through `assertTransition(entity, table,
from, to)` before being persisted. This is a plain, framework-free
function specifically so it can be unit-tested without a database
(see `apps/api/tests/states.test.ts`) and shared byte-for-byte between
the API and any future mobile/admin client that needs to know what
transitions are legal client-side before even calling the API.

`InvalidTransitionError` is mapped to a clean `409
INVALID_STATE_TRANSITION` in `middleware/errorHandler.ts` — treat an
illegal transition as an expected conflict (e.g. a duplicate action
from a slow client), not a crash.

When adding a new transition to an existing entity, add it to the
table in `packages/shared`, not as a raw `prisma.model.update()`
somewhere in a service — every write to `campaigns.status` (etc.)
should route through the entity's `transitionX()` helper the way
`campaigns.service.ts` does.

## 3. The wallet ledger (`apps/api/src/modules/wallet/wallet.service.ts`)

`wallets.available_balance` / `reserved_balance` must never be written
directly. `postLedgerEntryWithinTx` is the only code path that changes
them, and it:

1. Takes a row lock (`SELECT ... FOR UPDATE`) inside a DB transaction.
2. Computes the new balance from the transaction `type`.
3. Rejects the write (throws `ConflictError`, rolls back) if either
   balance would go negative.
4. Writes the new wallet balances and the `wallet_transactions` row in
   the same transaction.

`postLedgerTransaction(prisma, input)` wraps this in its own
`$transaction` for standalone callers. Anything that already holds a
`Prisma.TransactionClient` (e.g. the payment webhook handler, which
must update `Payment`, post two ledger entries, and transition
`Campaign` atomically) calls `postLedgerEntryWithinTx(tx, input)`
directly — Prisma does not support nesting `$transaction` calls, so
this split exists specifically to keep multi-step financial writes
atomic.

See `apps/api/tests/wallet.test.ts` for a concurrency test that fires
5 simultaneous withdrawals against a balance that can only satisfy 3,
and asserts the balance never goes negative — this is testing the
row-lock, not just the arithmetic.

## 4. Payments: the frontend is never trusted

`payments.service.ts` implements spec §31/§81 literally:
`initiateCampaignPayment` only ever creates a payment intent.
**Nothing marks a `Payment` or `Campaign` as paid except
`handleWebhookEvent`**, which:

1. Verifies the provider's signature with a timing-safe comparison.
2. Deduplicates by `(provider, providerEventId)` — a unique DB
   constraint, so a concurrent replay fails at the database, not in
   application logic.
3. Also short-circuits if the matched `Payment` is already `PAID`
   (defense in depth beyond event-id dedup, for providers that can
   emit more than one event id for the same underlying charge).
4. Verifies the webhook amount matches the expected payment amount.
5. Transitions `Payment` and `Campaign` through `assertTransition`,
   and posts the `DEPOSIT` + `RESERVE` ledger entries, all inside one
   `$transaction`.

The mock payment provider (`services/payment/MockPaymentProvider.ts`)
exists so this entire path — including signature verification — is
exercisable in development without a Razorpay account:
`buildMockWebhookRequest` produces a correctly HMAC-signed payload the
same way `POST /api/payments/dev/simulate-webhook` uses it, and both
run through the *exact* `handleWebhookEvent` function a real Razorpay
webhook would hit.

## 5. Audit log (`apps/api/src/modules/audit/audit.service.ts`)

`recordAudit(tx, input)` takes either the top-level Prisma client or
an active transaction client, so an audit row commits atomically with
the business change it describes. There is intentionally no
`updateAudit`/`deleteAudit` — correcting the record means writing a
new audit entry, never rewriting history.

## 6. Pricing (`apps/api/src/modules/campaigns/pricing.service.ts`)

Campaign pricing is computed from the live `PricingSlab` / `TaxRule`
tables at creation time and persisted as a `CampaignPricingSnapshot` —
never recomputed later. This means a pricing or tax rule change can
never retroactively alter an already-priced campaign, and every
campaign carries proof of exactly which rule version it was priced
under (spec §47/§63).

## 7. Pitfall: `assertTransition`'s same-state shortcut and side effects

`assertTransition` treats `from === to` as an allowed no-op (so a
retried "submit" on an already-SUBMITTED campaign doesn't explode).
That's correct when the transition is *purely* a status write. It is
**wrong** when accepting the transition also creates or mutates a
side resource — `offers.service.ts`'s `acceptOffer` creates a
`CampaignAssignment` (unique per offer) and `rejectOffer` decrements
`CampaignTargetingSlab.reserved`. A same-state re-call would either
crash on a unique-constraint violation (re-accept) or silently
double-decrement a counter (re-reject) if it fell through to
`assertTransition` unguarded.

The fix, applied in both functions: check the already-terminal states
explicitly and throw a clean `ConflictError` **before** calling
`assertTransition`, so the "same state" case never reaches the
side-effecting code path. When writing a new action that both
transitions a state machine and does something else (posts a ledger
entry, sends an email, creates a row), ask "what happens if this exact
call is repeated?" and add the explicit guard if the answer isn't
"nothing new happens." `apps/api/tests/offers.test.ts` encodes this as
a permanent regression test — do the same for the next slice that has
this shape (content revision limits, retention re-checks, etc.).

## 8. System messages, agreements, and the background scheduler

**System messages** (`modules/messages/messages.service.ts::postSystemMessage`)
are posted from inside the *same transaction* as the event they
describe — offer acceptance, address submission, shipment creation,
content submission/revision/approval, payout release. A new lifecycle
event should call this the same way, at the point the event is already
being written, not as a separate afterthought pass over the audit log.

**Agreements** (`modules/agreements/agreements.service.ts`) follow the
"render outside a transaction, write inside one" split already used
for PDFs/uploads elsewhere: `renderAgreementPdf` + the storage
`putObject` call happen before `prisma.$transaction` opens (they're
I/O/CPU-bound and must not hold a row lock), and only the DB writes
(Agreement, AgreementAcceptance, the Document row, audit entries) are
in the transaction. `generateAgreementSafely` is the fire-and-forget
wrapper `offers.service.ts::acceptOffer` calls post-commit — same
pattern as automated post verification in `assignments.service.ts`.
If you add a second kind of generated document (an invoice, a
shipping label), reuse `modules/documents/documents.service.ts::recordDocument`
for the Document row rather than inserting one ad hoc — that table
*is* the Evidence Vault, and every type should be discoverable through
`listDocumentsForCampaign`/`generateEvidencePack`.

**Background jobs** (`jobs/scheduler.ts`) are a plain `setInterval`
calling the exact same idempotent service functions the admin-trigger
endpoints call (`runDueRetentionChecks`, `expireStaleOffers`) — there
is deliberately no separate "job version" of this logic. This is
single-instance-safe only: before running more than one API replica,
replace `scheduler.ts` with BullMQ against `REDIS_URL` (already
provisioned) plus a distributed lock or leader election, or move the
calls to a platform cron hitting the service functions directly. Don't
add a second scheduler implementation alongside this one — replace it.

## What to build next, and how it should plug in

- **Creator matching / offers** — DONE (`modules/matching`,
  `modules/offers`). Read these two before building the next slice:
  they're the reference implementation of "explicit guard before
  `assertTransition`'s same-state shortcut" (see the offers.test.ts
  regression tests) and of a service that's safely re-runnable without
  a job scheduler (`createOffersForCampaign` only tops up what's still
  short).
- **Post verification / retention / payout (Clipping)** — DONE
  (`modules/verification`, `modules/retention`, `modules/payouts`).
  `modules/payouts/payouts.service.ts::releasePayout` is the one place
  money ever moves from a brand's reserved balance to a creator's
  available balance — both `retention.service.ts` (after retention
  passes) and `verification.service.ts` (when a campaign has no
  retention requirement) call it; don't write a third payout path.
- **Creator Content submission + review** — DONE (`modules/content`).
  Deliberately does NOT duplicate the verified→retention-or-payout
  decision: it calls `markAssignmentVerified`/`markAssignmentFailed`,
  exported from `modules/verification` specifically so this module
  (and any future "something else that counts as verification") can
  reuse it. Revision limit lives in `campaign.briefJson.revisionLimit`
  (no schema migration needed for a brief-shaped field) — see
  `content.service.ts::reviewContent` for the admin-only-override
  guard; don't let a brand pass its own `override: true`.
- **KYC + Withdrawals** — DONE (`modules/kyc`, `modules/withdrawals`).
  Withdrawal is the reference implementation of "debit at request
  time, reverse on reject/fail": the ledger's row lock is what
  actually enforces "no pending withdrawal can overdraw the balance"
  — there's no separate availability check to keep in sync. KYC is the
  reference implementation of "encrypt at rest, decrypt only on a
  single authorized detail view, never in a list" — reuse `lib/crypto`
  the same way for any other PII (shipping address phone numbers,
  etc.), not a new scheme per field.
- **Shipping (Product Review)** — DONE (`modules/shipping`,
  `modules/products`). `offers.service.ts::acceptOffer` branches on
  `campaign.type` to decide whether an assignment starts at `ACCEPTED`
  (Product Review, gated on a `Shipment`) or `POST_PENDING`
  (everything else) — extend that branch, don't add a parallel
  accept path, if a fourth campaign type ever needs its own gate.
- **Refunds + Disputes** — DONE (`modules/refunds`, `modules/disputes`).
  Refund posts a dedicated `REFUND` ledger case (decrements *reserved*,
  not a credit to available — see the comment on `CREDIT_TYPES` in
  `packages/shared/src/states.ts`) and drives `Payment` through
  `PAYMENT_TRANSITIONS`. Deliberately kept separate from dispute
  resolution — `decideDispute` only records a decision, it never moves
  money itself; an admin issues a refund as its own action (different
  role boundary in spec §91: Ops/Support decide disputes, Finance
  moves money).
- **Background jobs** — PARTIALLY DONE (`jobs/scheduler.ts`): offer
  expiry + retention checks run on a timer now (see §8 above). Still
  missing: Instagram metric re-sync and payment reconciliation — add
  them as two more `setInterval` entries in the same file calling new,
  equally idempotent service functions, not a different mechanism.
- **Agreements + Evidence Vault + Messaging + Notifications + Fraud
  flags** — DONE (`modules/agreements`, `modules/documents`,
  `modules/messages`, `modules/notifications`, `modules/fraud`). See
  §8 above for the agreement-generation and system-message patterns.
- **Admin console / Operations Center UI** — DONE for the operational
  queues (`apps/web/app/admin/*`): a sidebar shell
  (`app/admin/layout.tsx`) guards every page behind an admin-role
  check against `/api/auth/me`, and one page per queue (campaigns,
  verification, content, retention, KYC, withdrawals, payments/
  refunds, disputes, fraud) — each fetches its real queue on mount and
  reloads it after every action. `app/admin/page.tsx` (Operations
  Center) is the template for "a live count card linking to a queue
  page" — copy that pattern, not a hardcoded number, for any new
  queue. Still missing: pricing management UI, analytics/reports, a
  creator/brand directory, and audit log browsing — none of these
  have a dedicated service/queue endpoint yet either, so each is a
  small backend addition plus a page, not just a page.
  Confirmations use `window.confirm`/`window.prompt`, not a styled
  modal — fine functionally, worth upgrading if this console gets a
  real design pass.
- **Route-ordering note**: Express matches path patterns in
  registration order. Any router mixing a fixed single-segment path
  (e.g. `/queue`) with a parameterized one (`/:id`) MUST register the
  fixed path first — `disputes.routes.ts` had this bug (`/:id` was
  swallowing `/queue`) and was fixed; check new routers for the same
  shape before assuming "it compiled" means "it routes correctly."
