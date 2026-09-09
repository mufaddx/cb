# Antigravity — Creator Campaign Marketplace

Product name: **Vidlix**, deployed at **app.vidlix.in**. "Antigravity"
is this build's internal codename throughout the code/docs — not a
rebrand task by itself, just the name to know when wiring up the
production domain (see `.env.example`'s `APP_URL`/`API_URL`).

This is the **foundation** of the full platform described in the
master build spec: a production-shaped monorepo with a real MySQL
schema, real auth/RBAC, an enforced state machine for every stateful
entity, an append-only financial ledger, and adapter interfaces for
every external provider (email, storage, payments, Instagram) — each
with a dev-safe implementation and a real provider implementation
behind the same interface.

It intentionally does **not** implement all 96 sections of the spec
in one pass — see [Scope](#scope-what-is-and-isnt-built) below for the
honest line between "built" and "designed for, not yet built."

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Backend | Node.js + Express + TypeScript, REST |
| Database | MySQL via Prisma (schema + migrations) |
| Cache/jobs | Redis (provisioned, jobs not yet implemented) |
| Object storage | Cloudflare R2 (S3-compatible) + local-disk dev adapter |
| Email | Resend + console dev adapter |
| Payments | Razorpay + mock dev adapter |
| Instagram | Meta Graph API + mock dev adapter |

## Repository layout

```
apps/
  api/      Express API — modules/ (domain logic), services/ (provider adapters)
  web/      Next.js app
packages/
  db/       Prisma schema, migrations, seed script
  shared/   Cross-cutting enums: roles/permissions, state machines, audit actions
docs/       Architecture notes
docker-compose.yml       Local dev infra (MySQL, Redis, Adminer)
docker-compose.test.yml  Disposable MySQL for integration tests
```

## Running locally

Node.js was not detected on this machine when this was built, so every
command below was run and verified inside `node:20` Docker containers.
If you have Node 20+ installed natively, the same commands work
without `docker run` wrapping.

```bash
cp .env.example .env        # fill in real secrets before any real deploy
docker compose up -d mysql redis

npm install
npm run db:migrate --workspace=packages/db
npm run db:seed --workspace=packages/db     # dev only — creates roles,
                                             # categories, pricing slabs,
                                             # a GST tax rule, and a super
                                             # admin login (admin@antigravity.dev /
                                             # ChangeMe123!)

npm run dev:api     # http://localhost:4000
npm run dev:web      # http://localhost:3000
```

### Running tests

Tests run against a disposable MySQL instance, never your dev database:

```bash
docker compose -f docker-compose.test.yml up -d
DATABASE_URL="mysql://antigravity:antigravity@localhost:3307/antigravity_test" \
  npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
npm test --workspace=apps/api
```

## What's real right now

- **Auth**: signup, bcrypt password hashing, email-OTP verification
  (rate-limited, attempt-limited, cooldown-limited), login, JWT
  access/refresh tokens, RBAC middleware driven by the permission
  matrix in `packages/shared/src/roles.ts`.
- **Database**: the full core schema from spec §55 (users through
  audit_logs) as real Prisma migrations against MySQL — not a sketch.
- **State machines**: Campaign, Assignment, Payment, Withdrawal, KYC,
  Dispute, Shipment all have an explicit transition table
  (`packages/shared/src/states.ts`) that every service call goes
  through — an illegal transition throws, it doesn't get silently
  written.
- **Wallet ledger**: every balance change is a row in
  `wallet_transactions`, posted inside a row-locked DB transaction
  that rejects any write that would take a balance negative. No
  service method mutates `wallets.available_balance` /
  `reserved_balance` directly.
- **Payments**: brand campaign payment end to end — campaign
  draft → submit → admin approve → payment intent → **signed webhook**
  confirms payment → ledger DEPOSIT+RESERVE → campaign goes LIVE. The
  frontend's reported payment result is never trusted; only the
  signature-verified webhook can mark a payment PAID. Webhook events
  are deduplicated by `(provider, providerEventId)` so a retried
  delivery is a safe no-op.
- **Provider adapters**: Email, Storage, Payment, and Instagram each
  have a real interface, a dev-safe adapter, and a real-provider
  adapter (Resend, Cloudflare R2 via S3 API, Razorpay, Meta Graph
  API). The dev adapters refuse to run in `NODE_ENV=production` — you
  cannot accidentally ship a fake integration.
- **Instagram connection**: OAuth-style code exchange (never a
  password), access token AES-256-GCM encrypted at rest, initial
  follower/reach snapshot recorded on connect.
- **Matching engine**: real eligibility filtering (Instagram connected,
  availability, category, follower/reach range) and ranking
  (quality score, completion rate) against the live `PricingSlab`-backed
  targeting slabs — not a stub. Triggered by an admin action
  (`POST /api/campaigns/:id/match`) since no background scheduler
  exists yet (see "Not yet implemented" below).
- **Offers → Assignment**: creator views/accepts/rejects a
  `CampaignOffer`; accepting atomically creates the
  `CampaignAssignment` and moves the campaign `MATCHING → IN_PROGRESS`
  on its first acceptance. Illegal actions (double-accept, reject after
  accept, accept-after-expiry) are rejected as clean `409`s, not
  crashes or silent no-ops — covered by regression tests in
  `apps/api/tests/offers.test.ts`.
- **Post submission + verification + retention + payout** (Clipping
  campaigns only in this build): creator submits a post URL →
  automated verification (account/post ownership via the Instagram
  provider, disclosure-tag check) → campaigns with a retention
  requirement wait out the countdown, campaigns without one pay out
  immediately → retention pass releases the payout atomically (ledger
  SPEND from the brand + CREATOR_EARNING to the creator + assignment
  PAID, all one transaction). A hard ownership mismatch auto-fails;
  a missing disclosure tag is left for admin manual review rather than
  auto-failed. No background scheduler exists, so retention checks run
  via an admin-triggered endpoint (`POST /api/retention/run-due`) that
  a real cron job can call later without any service-layer change.
- **Generic file upload** (`POST /api/uploads`): multer + the existing
  StorageProvider abstraction, allowlisted by `purpose` so a caller can
  never write outside its intended folder. Used today for post
  screenshots; reusable as-is for KYC documents, shipment proof, etc.
- **KYC** (submit → admin review → verify/reject/resubmission):
  document number AES-256-GCM encrypted at rest; list/status endpoints
  never return it, only a KYC admin's single-record detail view does.
  Strictly siloed from brands — `KYC_SUBMIT_OWN`/`KYC_REVIEW` are the
  only permissions that reach these routes, and no brand role has
  either (spec §35/§92).
- **Withdrawals**: requires KYC `VERIFIED`; the requested amount is
  debited from the creator's available balance **at request time**
  (not at approval) via the same row-locked ledger as everything else
  — this is what makes "no existing pending withdrawal can overdraw
  the balance" true without a separate check. Admin
  approve/reject/mark-paid/mark-failed; reject and mark-failed both
  reverse the debit; mark-paid requires a reference number as
  evidence (spec §34: "Never mark paid without proper operational
  evidence").
- **Products**: brand CRUD (create/list/get/update/archive), scoped to
  the owning brand.
- **Product Review shipping flow**: accepting a Product Review offer
  creates the `CampaignAssignment` at `ACCEPTED` (not `POST_PENDING`)
  plus a `Shipment` row — content creation stays locked until the
  creator confirms receipt. Address submission → brand marks
  shipped (courier + tracking) → creator confirms receipt (no courier
  API is integrated, so this one action advances the shipment straight
  through to `RECEIVED`, since the creator physically holding the
  product is the strongest confirmation available) → assignment
  unlocks to `POST_PENDING`.
- **Creator Content submission + review**: video submission
  (versioned) → brand (on its own campaign) or admin approve /
  request-revision / reject. Approval reuses the *exact* verification
  → retention-or-instant-payout logic Clipping uses
  (`markAssignmentVerified`) rather than a second copy. A revision
  request past the campaign's configured limit
  (`campaign.briefJson.revisionLimit`, default 2) is rejected unless
  an admin passes `override: true` — a brand can never self-override.
- **Refunds**: full or partial refund against a PAID payment — calls
  the real payment provider's refund API, then posts a `REFUND` ledger
  entry that decrements the brand's *reserved* balance (money leaving
  the platform, not becoming spendable again), and drives `Payment`
  through `REFUND_PENDING → REFUNDED`/`PARTIALLY_REFUNDED` via the
  existing state machine. Rejects any refund exceeding what's still
  refundable on that payment.
- **Disputes**: either party opens one on a campaign (moves it to
  `DISPUTED`); admin requests evidence / decides / resolves. Refund
  issuance is a deliberately separate action (different role in
  spec §91) — a dispute decision doesn't automatically move money.
- **Agreements** (spec §36): generated automatically right after offer
  acceptance — a real PDF (via pdfkit, verified in tests to start with
  the `%PDF` magic bytes, not a stub) built from the campaign/payout/
  retention/usage-rights terms, hashed (SHA-256), uploaded to storage,
  and recorded as both an `Agreement` row and an `AgreementAcceptance`
  (capturing the creator's IP/user-agent — accepting the offer IS
  accepting the terms, spec §21). If generation fails as a post-commit
  side effect, `POST /api/agreements/assignment/:id/regenerate`
  (admin) retries it — the assignment itself is never blocked on it.
- **Evidence Vault / Documents** (spec §37): `GET
  /api/documents/campaigns/:id` lists every `Document` row for a
  campaign (today: agreements; the same `recordDocument` call is what
  future slices — invoices, shipping proof — reuse) with a fresh
  signed URL each; `.../evidence-pack` returns them grouped by type as
  a JSON manifest (not a zip — no archiving library is wired up).
- **Deal Room messaging** (spec §40): per-campaign thread, ownership-
  checked; system messages ("Creator accepted the campaign.",
  "Shipping address submitted.", "Content submitted.", "Revision
  requested.", "Content approved.", "Payment released.") post
  automatically at the exact lifecycle points spec §40 names, from
  inside the same transaction as the event itself.
- **Notifications**: read/unread listing, mark-one-read, mark-all-read,
  and a live unread count computed from the table every time (spec
  §78: never a stale cached counter).
- **Fraud flags** (spec §54): raise a flag (manually for now — no
  automated detector yet) against any entity; an admin reviews and
  explicitly clears or restricts it. Raising alone never changes
  anything — restriction only happens on an explicit admin decision
  (spec §54: "Never automatically ban solely based on an opaque
  score"), verified by a test that raising a flag leaves the
  creator's availability untouched.
- **Background jobs** (spec §79): a real (if deliberately simple)
  scheduler now runs `runDueRetentionChecks` and `expireStaleOffers`
  on a timer inside the API process — not just admin-triggered
  anymore. It's an in-process `setInterval`, not BullMQ/Redis, so it's
  single-instance-safe only; see `docs/architecture.md` for the
  upgrade path before running more than one API instance.
- **Admin Console** (spec §43/§44): a real sidebar-navigated app at
  `/admin`, auth-guarded client-side against `/api/auth/me`'s roles
  (redirects to login if the account isn't an admin role). Operations
  Center shows a live count — fetched from the real queue endpoint,
  not hardcoded — for every queue below, each linking straight into
  it:
  - Campaign Reviews (approve/reject, reason required to reject)
  - Content Verification (manual pass/fail for posts automated checks
    couldn't confidently decide)
  - Creator Content Review (approve / request revision / reject)
  - Retention (days-remaining per assignment, a per-item "Check Now",
    and "Run Due Checks Now" — the same function the background
    scheduler calls)
  - KYC (verify / request resubmission / reject)
  - Withdrawals (approve / reject / mark paid — reference number
    required)
  - Payments & Refunds (table of recent payments, partial/full refund
    with a reason)
  - Disputes (request evidence / record a decision)
  - Fraud & Risk (clear / restrict, with an explicit confirmation
    before restricting)
  Every action on every page calls the real endpoint and reloads the
  queue from the server afterward — verified end-to-end: a campaign
  submitted via the brand API showed up in the admin queue with the
  exact shape the page expects, got approved through the same
  `/approve` endpoint the button calls, and disappeared from the
  queue on the next load.
- **Frontend (brand/creator)**: signup → OTP verify → login →
  onboarding (brand/creator profile creation) → dashboard reading a
  real wallet balance from the API → creator offers page
  (accept/decline) → My Deals page (submit a post URL for an accepted
  assignment) → Wallet page (request a withdrawal, see history), all
  wired to the real API. A trimmed public landing page using the
  spec's design tokens and the global button-state system (§08).
  Product Review's shipping steps and Creator Content's own submission
  form have no dedicated frontend yet (the APIs exist and are tested;
  My Deals only covers Clipping's post-URL submission today).

- **Admin directory + analytics** (spec §46/§89): `/api/admin/creators`,
  `/api/admin/brands` (searchable), and `/api/admin/analytics` (GMV,
  net revenue estimate, creator payouts, refunds, pending withdrawals,
  open disputes/fraud flags — every figure a live aggregate query, no
  fabricated metrics) with matching admin console pages.
- **Mobile layouts** (spec §66/§67/§71): a real fixed bottom nav for
  brand/creator pages (Home/Campaigns/Shipments/Wallet for brands,
  Home/Offers/My Deals/Wallet for creators) swaps in via CSS at
  ≤768px — not a shrunken desktop nav. The admin sidebar becomes a
  horizontal scrolling strip on mobile instead.
- **Styled confirmations** (spec §76): every admin action that used to
  call `window.confirm`/`window.prompt` now uses a real modal
  (title/description/impact, a danger-styled confirm button, and a
  text-input variant for reasons) via `lib/useConfirm.tsx`.
- **Full public marketing site** (spec §10): How It Works, For Brands,
  For Creators, Pricing (describes the real computed-rate-card model,
  no invented numbers), About, FAQ, Contact, Privacy, Terms, Refund
  Policy, Disclaimer — all linked from a real header/footer. The legal
  pages are explicitly marked as drafts pending legal review (spec
  §38), not presented as binding.
- **Brand campaign frontend** (previously missing entirely): create,
  list, and a detail page with Submit/Pay/Cancel, pricing breakdown,
  targeting, offers, assignments, a Deal Room, Product Review
  shipment creation, and Creator Content review — all against the
  real APIs. Plus a Products page and a cross-campaign Shipments
  dashboard.
- **Creator content flow gap, found and fixed**: Product Review
  assignments reached `POST_PENDING` after receiving the product with
  nowhere to submit their review — `submitPost` was Clipping-only and
  `submitContent` was Creator-Content-only. Product Review now reuses
  the Creator Content submission/review flow (spec §01 calls it "a
  specialized Creator Content campaign"), covered by a regression test.
- **A second real bug found and fixed**: `markAssignmentVerified`/
  `markAssignmentFailed` didn't return the updated assignment, so
  approving/rejecting content via the API silently returned no `data`.
  Caught by a test that checked the return value directly instead of
  re-fetching — now fixed and returns the assignment.

## Scope: what is and isn't built

This build covers a full working loop for all three campaign types
(Clipping, Creator Content, Product Review) — create, pay, match,
accept, deliver, verify, retain, pay out, withdraw, dispute, refund —
plus KYC, agreements, evidence, messaging, notifications, fraud
flagging, and a real (if single-instance) background scheduler. It
deliberately still does not cover every one of the spec's 96 sections;
**not yet implemented**, though the schema and architecture already
account for it:

- Pricing management UI (slabs/tax rules are DB-only, edited via seed
  scripts/DB access — no admin screen to create/version them yet) and
  audit log browsing (the data is there; no viewer exists).
- Instagram metric re-sync and payment reconciliation jobs (the
  scheduler only runs retention checks + offer expiry so far).
- Upgrading Next.js past 14.2.35 — `npm audit` still reports advisories
  against Next.js that are only fixed in the 15.x line; deferred as a
  tracked, documented dependency upgrade rather than an untested
  mid-session major-version bump (see `docs/architecture.md`).

Each of these should be built as its own slice, reusing
`assertTransition`, `postLedgerTransaction`/`postLedgerEntryWithinTx`,
`recordAudit`, and the provider adapters already in place — not by
inventing parallel patterns.

## Security notes

- Real secrets go in `.env`, which is git-ignored; only `.env.example`
  is committed.
- A dev-safe provider adapter (console email, local storage, mock
  payments, mock Instagram) throws if selected with `NODE_ENV=production`.
- Passwords are bcrypt-hashed (cost 12); OTP codes are bcrypt-hashed,
  not stored in plaintext, and are rate-limited on resend and attempts.
- Payment webhook signatures are verified with a timing-safe
  comparison before any payload is trusted.
- See `packages/db/prisma/schema.prisma` for what's marked immutable
  (`wallet_transactions`, `audit_logs`, `payment_events`) — no
  update/delete method exists for these at the service layer.
- Cloudflare R2 and Resend credentials in local `.env` have been
  verified against the real services (a real object was written, read
  back via a signed URL, and deleted from R2; a real email was
  delivered via Resend). The Resend account has no verified sending
  domain yet, so it can only deliver to the account owner's own
  address in that state — `EMAIL_PROVIDER` is left at `console` until
  a domain is verified at resend.com/domains, otherwise every real
  signup's OTP email would silently fail to arrive.
- **Never paste real credentials into `.env.example`** — it is a
  committed template, not a secrets file. This happened once during
  this build (real R2 + Resend keys were found in it before any commit
  existed); they were moved to local `.env` and the template restored
  before the first commit, so nothing was ever exposed in git history.
  If you ever find real secrets in a tracked file, treat it as a live
  incident: move them to `.env` immediately and rotate them if there's
  any chance they were already pushed.

Tax rates, GST/TDS treatment, and the agreement/e-signature approach
must be reviewed by qualified Indian tax and legal counsel before any
of this touches real money or real contracts (spec §38/§63).
