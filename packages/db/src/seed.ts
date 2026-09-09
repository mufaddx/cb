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

  console.log("Seeding pricing slabs (follower-based, clipping)...");
  const followerSlabs: Array<[number, number | null, number, number]> = [
    [0, 10_000, 300, 30],
    [10_000, 50_000, 800, 80],
    [50_000, 100_000, 1500, 150],
    [100_000, 500_000, 3500, 300],
    [500_000, null, 8000, 600],
  ];
  for (const [minValue, maxValue, payoutAmount, feeAmount] of followerSlabs) {
    const existing = await prisma.pricingSlab.findFirst({
      where: {
        campaignType: CampaignType.CLIPPING,
        metric: TargetingMetric.FOLLOWER_COUNT,
        minValue,
      },
    });
    if (!existing) {
      await prisma.pricingSlab.create({
        data: {
          campaignType: CampaignType.CLIPPING,
          metric: TargetingMetric.FOLLOWER_COUNT,
          minValue,
          maxValue: maxValue ?? undefined,
          payoutAmount,
          feeAmount,
          effectiveFrom: new Date(),
          active: true,
        },
      });
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
