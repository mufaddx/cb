/**
 * Development seed data ONLY.
 *
 * Spec §95: "Never allow seed/demo users to enter production
 * accidentally." This script refuses to run unless NODE_ENV is
 * "development" (or explicitly forced for a throwaway staging DB).
 */
import bcrypt from "bcryptjs";
import { PrismaClient, CampaignType, TargetingMetric } from "@prisma/client";
import { Role } from "@antigravity/shared";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    throw new Error(
      "Refusing to seed a production database. Set ALLOW_PROD_SEED=true if this is truly intentional."
    );
  }

  console.log("Seeding roles...");
  for (const roleName of Object.values(Role)) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }

  console.log("Seeding categories...");
  const categoryNames = [
    "Beauty & Personal Care",
    "Fashion",
    "Tech & Gadgets",
    "Food & Beverage",
    "Fitness & Health",
    "Travel",
    "Finance",
    "Gaming",
    "Home & Lifestyle",
    "Entertainment",
  ];
  for (const name of categoryNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    await prisma.category.upsert({ where: { slug }, update: {}, create: { name, slug } });
  }

  console.log("Seeding pricing slabs (rate card: every campaign type x targeting metric)...");
  // The brand-facing "Create Campaign" targeting picker (spec: dropdown
  // ranges, not free-typed numbers) reads these back via
  // GET /api/campaigns/pricing-slabs — every range it can offer has to
  // exist here first, or computePricingBreakdown rejects it. Same band
  // edges across campaign types (so the picker looks consistent); the
  // payout floor rises with the effort a format actually takes
  // (Clipping < Product Review < Creator Content).
  type Slab = [number, number | null, number, number]; // [min, max, payoutAmount, feeAmount]
  const followerBands: Slab[] = [
    [0, 10_000, 300, 30],
    [10_000, 50_000, 800, 80],
    [50_000, 100_000, 1500, 150],
    [100_000, 500_000, 3500, 300],
    [500_000, null, 8000, 600],
  ];
  const reachBands: Slab[] = [
    [0, 500_000, 400, 40],
    [500_000, 1_000_000, 900, 90],
    [1_000_000, 2_000_000, 1800, 160],
    [2_000_000, 3_000_000, 3000, 260],
    [3_000_000, 5_000_000, 5000, 400],
    [5_000_000, null, 9000, 700],
  ];
  // Multiplies the Clipping bands above for the other two formats —
  // keeps every band's relative pricing consistent without repeating
  // five/six numbers three times over.
  const typeMultiplier: Record<string, number> = {
    [CampaignType.CLIPPING]: 1,
    [CampaignType.PRODUCT_REVIEW]: 1.3,
    [CampaignType.CREATOR_CONTENT]: 1.6,
  };

  for (const campaignType of [CampaignType.CLIPPING, CampaignType.CREATOR_CONTENT, CampaignType.PRODUCT_REVIEW]) {
    const multiplier = typeMultiplier[campaignType];
    for (const [metric, bands] of [
      [TargetingMetric.FOLLOWER_COUNT, followerBands],
      [TargetingMetric.AVERAGE_REACH, reachBands],
    ] as const) {
      for (const [minValue, maxValue, basePayoutAmount, baseFeeAmount] of bands) {
        const existing = await prisma.pricingSlab.findFirst({
          where: { campaignType, metric, minValue },
        });
        if (existing) continue;
        await prisma.pricingSlab.create({
          data: {
            campaignType,
            metric,
            minValue,
            maxValue: maxValue ?? undefined,
            payoutAmount: Math.round((basePayoutAmount * multiplier) / 10) * 10,
            feeAmount: Math.round((baseFeeAmount * multiplier) / 10) * 10,
            effectiveFrom: new Date(),
            active: true,
          },
        });
      }
    }
  }

  console.log("Seeding tax rules (GST placeholder — confirm with tax counsel before production)...");
  const existingTax = await prisma.taxRule.findFirst({ where: { taxType: "GST" } });
  if (!existingTax) {
    await prisma.taxRule.create({
      data: {
        taxType: "GST",
        rate: 18,
        transactionType: "PLATFORM_FEE",
        applicableParty: "BRAND",
        jurisdiction: "IN",
        effectiveFrom: new Date(),
        active: true,
      },
    });
  }

  console.log("Seeding a Super Admin dev user (admin@antigravity.dev / ChangeMe123!)...");
  const email = "admin@antigravity.dev";
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (!existingUser) {
    const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });
    const superAdminRole = await prisma.role.findUniqueOrThrow({
      where: { name: Role.SUPER_ADMIN },
    });
    await prisma.userRole.create({
      data: { userId: user.id, roleId: superAdminRole.id },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
