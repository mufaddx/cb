// One-off incident cleanup: the vitest suite's setup.ts only defaults
// DATABASE_URL with `??` (nullish coalescing), so passing a real
// DATABASE_URL env var (as happened here) makes every test run
// directly against THAT database instead of the local test DB. The
// suite's own afterAll() hooks only call prisma.$disconnect() — they
// never delete the fixtures they create — so a run against production
// leaves orphaned rows behind. Every fixture's User email ends in
// "@test.dev" (a domain no real user could have), which is the one
// unambiguous, safe key to find and remove everything the run created.
//
// Generic sweep: introspect the Prisma schema for every model with a
// field name matching one of our known "parent id" keys, and delete
// matching rows. Repeated in multiple passes so FK ordering resolves
// itself — a table whose rows still have live children fails this
// pass and succeeds on a later one once those children are gone.
// DATABASE_URL is read from a mounted .env file, not a CLI flag —
// keeping the production connection string out of the command line
// (and therefore out of shell history/process listings) entirely.
// Tiny inline parser (no dotenv dependency needed for a one-off script).
{
  const fs = require("fs");
  const envPath = process.env.ENV_FILE || ".env";
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}
const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const DRY_RUN = process.env.DRY_RUN === "1";

const PARENT_ID_FIELDS = [
  "userId", "brandId", "creatorId", "campaignId", "walletId", "paymentId",
  "assignmentId", "agreementId", "offerId", "instagramAccountId", "conversationId",
];

async function main() {
  const testUsers = await prisma.user.findMany({
    where: { email: { endsWith: "@test.dev" } },
    include: { brand: true, creator: true },
  });
  console.log(`Found ${testUsers.length} test users (@test.dev).`);
  if (testUsers.length === 0) {
    console.log("Nothing to clean up.");
    return;
  }

  const userIds = testUsers.map((u) => u.id);
  const brandIds = testUsers.filter((u) => u.brand).map((u) => u.brand.id);
  const creatorIds = testUsers.filter((u) => u.creator).map((u) => u.creator.id);

  const campaigns = await prisma.campaign.findMany({ where: { brandId: { in: brandIds } }, select: { id: true } });
  const campaignIds = campaigns.map((c) => c.id);

  const wallets = await prisma.wallet.findMany({
    where: { OR: [{ brandId: { in: brandIds } }, { creatorId: { in: creatorIds } }] },
    select: { id: true },
  });
  const walletIds = wallets.map((w) => w.id);

  const payments = await prisma.payment.findMany({ where: { brandId: { in: brandIds } }, select: { id: true } });
  const paymentIds = payments.map((p) => p.id);

  const assignments = await prisma.campaignAssignment.findMany({
    where: { OR: [{ campaignId: { in: campaignIds } }, { creatorId: { in: creatorIds } }] },
    select: { id: true },
  });
  const assignmentIds = assignments.map((a) => a.id);

  const agreements = await prisma.agreement.findMany({ where: { assignmentId: { in: assignmentIds } }, select: { id: true } }).catch(() => []);
  const agreementIds = agreements.map((a) => a.id);

  const offers = await prisma.campaignOffer.findMany({
    where: { OR: [{ campaignId: { in: campaignIds } }, { creatorId: { in: creatorIds } }] },
    select: { id: true },
  }).catch(() => []);
  const offerIds = offers.map((o) => o.id);

  const instagramAccounts = await prisma.instagramAccount.findMany({ where: { creatorId: { in: creatorIds } }, select: { id: true } }).catch(() => []);
  const instagramAccountIds = instagramAccounts.map((i) => i.id);

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ brandId: { in: brandIds } }, { creatorId: { in: creatorIds } }] },
    select: { id: true },
  }).catch(() => []);
  const conversationIds = conversations.map((c) => c.id);

  const idsByField = {
    userId: userIds,
    brandId: brandIds,
    creatorId: creatorIds,
    campaignId: campaignIds,
    walletId: walletIds,
    paymentId: paymentIds,
    assignmentId: assignmentIds,
    agreementId: agreementIds,
    offerId: offerIds,
    instagramAccountId: instagramAccountIds,
    conversationId: conversationIds,
  };

  console.log("Scope:", {
    users: userIds.length,
    brands: brandIds.length,
    creators: creatorIds.length,
    campaigns: campaignIds.length,
    wallets: walletIds.length,
    payments: paymentIds.length,
    assignments: assignmentIds.length,
    agreements: agreementIds.length,
    offers: offerIds.length,
    instagramAccounts: instagramAccountIds.length,
    conversations: conversationIds.length,
  });

  if (DRY_RUN) {
    console.log("DRY_RUN=1 — stopping after scope discovery, no deletes performed.");
    return;
  }

  const models = Prisma.dmmf.datamodel.models;
  const totalDeleted = {};

  // Multiple passes: a table with live children referencing it (e.g.
  // Campaign while CampaignAssignment rows still point to it) fails
  // with a P2003 FK error on an earlier pass and is retried on a
  // later one once those children are gone.
  for (let pass = 0; pass < 6; pass++) {
    let anyDeleted = false;
    for (const model of models) {
      const modelName = model.name; // e.g. "WalletTransaction"
      const clientKey = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      const delegate = prisma[clientKey];
      if (!delegate || typeof delegate.deleteMany !== "function") continue;

      const matchingFields = model.fields
        .filter((f) => PARENT_ID_FIELDS.includes(f.name) && idsByField[f.name]?.length > 0)
        .map((f) => f.name);
      if (matchingFields.length === 0) continue;

      const where = { OR: matchingFields.map((f) => ({ [f]: { in: idsByField[f] } })) };
      try {
        const result = await delegate.deleteMany({ where });
        if (result.count > 0) {
          totalDeleted[modelName] = (totalDeleted[modelName] ?? 0) + result.count;
          anyDeleted = true;
        }
      } catch (err) {
        // Expected on early passes for tables with live children —
        // logged only on the final pass if it's still failing then.
        if (pass === 5) console.error(`FAILED to clean ${modelName}:`, err.message);
      }
    }
    if (!anyDeleted && pass > 0) break;
  }

  // Users last — Brand/Creator/UserRole/OtpCode/Notification/etc. that
  // legitimately cascade on User delete (per schema onDelete: Cascade)
  // clean up automatically at this point; anything that doesn't cascade
  // was already swept above by brandId/creatorId/userId matching.
  const deletedUsers = await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  totalDeleted.User = deletedUsers.count;

  console.log("Deleted rows by model:", totalDeleted);
}

main()
  .catch((err) => {
    console.error("Cleanup script crashed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
