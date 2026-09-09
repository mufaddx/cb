import { PrismaClient, WalletOwnerType } from "@prisma/client";
import { ConflictError } from "../../lib/errors";
import type { CreateBrandInput } from "./brands.validation";

export async function createBrandProfile(prisma: PrismaClient, userId: string, input: CreateBrandInput) {
  const existing = await prisma.brand.findUnique({ where: { userId } });
  if (existing) throw new ConflictError("A brand profile already exists for this account");

  return prisma.$transaction(async (tx) => {
    const brand = await tx.brand.create({
      data: {
        userId,
        companyName: input.companyName,
        contactPerson: input.contactPerson,
        phone: input.phone,
        website: input.website,
        industry: input.industry,
        billingAddress: input.billingAddress as any,
        gstin: input.gstin,
        description: input.description,
        onboardingComplete: true,
        categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
      },
    });
    await tx.wallet.create({ data: { ownerType: WalletOwnerType.BRAND, brandId: brand.id } });
    return brand;
  });
}
